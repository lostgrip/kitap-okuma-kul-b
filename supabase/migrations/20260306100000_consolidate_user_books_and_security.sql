-- Consolidate user_books and reading_progress, improve security and automation

-- 1. Add missing columns to reading_progress from user_books
ALTER TABLE public.reading_progress 
ADD COLUMN IF NOT EXISTS last_location TEXT;

-- 2. Migrate data from user_books to reading_progress (if records exist)
-- This assumes reading_progress is the source of truth for started_at/completed_at but pulls last_location
UPDATE public.reading_progress rp
SET last_location = ub.last_location
FROM public.user_books ub
WHERE rp.user_id = ub.user_id 
  AND rp.book_id = ub.book_id
  AND rp.last_location IS NULL;

-- Insert missing records from user_books into reading_progress
INSERT INTO public.reading_progress (user_id, book_id, status, last_location, started_at, completed_at)
SELECT ub.user_id, ub.book_id, 
  CASE 
    WHEN ub.status = 'read' THEN 'completed'::text
    WHEN ub.status = 'reading' THEN 'reading'::text
    WHEN ub.status = 'want_to_read' THEN 'want_to_read'::text
    ELSE 'paused'::text
  END,
  ub.last_location, ub.started_at, ub.completed_at
FROM public.user_books ub
LEFT JOIN public.reading_progress rp ON ub.user_id = rp.user_id AND ub.book_id = rp.book_id
WHERE rp.id IS NULL
ON CONFLICT (user_id, book_id) DO NOTHING;

-- 3. Drop redundant table
DROP TABLE IF EXISTS public.user_books CASCADE;

-- 4. DATABASE AUTOMATION: Status -> List Linkage
-- This function ensures that when a book's status changes, it automatically moves to the correct default list
CREATE OR REPLACE FUNCTION public.fn_sync_book_list_on_status_update()
RETURNS TRIGGER AS $$
DECLARE
    target_list_id UUID;
    list_type_val TEXT;
BEGIN
    -- Map reading_progress status to book_lists list_type
    list_type_val := CASE 
        WHEN NEW.status = 'completed' THEN 'read'
        WHEN NEW.status = 'want_to_read' THEN 'want_to_read'
        WHEN NEW.status = 'paused' THEN 'dnf'
        ELSE 'reading'
    END;

    -- Find the user's default list for this type
    SELECT id INTO target_list_id 
    FROM public.book_lists 
    WHERE user_id = NEW.user_id 
      AND list_type = list_type_val 
      AND is_default = true 
      AND is_community = false
    LIMIT 1;

    IF target_list_id IS NOT NULL THEN
        -- 1. Remove from OTHER default lists first
        DELETE FROM public.book_list_items
        WHERE book_id = NEW.book_id
          AND list_id IN (
              SELECT id FROM public.book_lists 
              WHERE user_id = NEW.user_id 
                AND id != target_list_id
                AND is_default = true
                AND is_community = false
          );

        -- 2. Add to the new list if not already there
        INSERT INTO public.book_list_items (list_id, book_id)
        VALUES (target_list_id, NEW.book_id)
        ON CONFLICT (list_id, book_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to call the sync function
DROP TRIGGER IF EXISTS tr_sync_book_list ON public.reading_progress;
CREATE TRIGGER tr_sync_book_list
AFTER INSERT OR UPDATE OF status ON public.reading_progress
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_book_list_on_status_update();

-- 5. SECURITY FIX: Books Table RLS
-- Currently anyone can update/delete any book. Restrict to owner or group admin.

-- Remove old loose policies
DROP POLICY IF EXISTS "Authenticated users can update books" ON public.books;
DROP POLICY IF EXISTS "Authenticated users can delete books" ON public.books;

-- New tight policies
CREATE POLICY "Users can update books in their group"
  ON public.books FOR UPDATE
  USING (
    added_by = auth.uid() 
    OR is_user_admin(auth.uid())
  );

CREATE POLICY "Users can delete books in their group"
  ON public.books FOR DELETE
  USING (
    added_by = auth.uid() 
    OR is_user_admin(auth.uid())
  );

-- 6. SECURITY FIX: Storage RLS
-- Restrict book-files to group members
DROP POLICY IF EXISTS "Users can view book files in their group" ON storage.objects;

CREATE POLICY "Users can view book files in their group"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'book-files' 
    AND (
        -- Simple check: uploader of the file must be in same group as requester
        -- This isn't perfect but much better than auth-only
        EXISTS (
            SELECT 1 FROM public.profiles p1
            JOIN public.profiles p2 ON p1.group_code = p2.group_code
            WHERE p1.user_id = storage.objects.owner
            AND p2.user_id = auth.uid()
        )
    )
  );
