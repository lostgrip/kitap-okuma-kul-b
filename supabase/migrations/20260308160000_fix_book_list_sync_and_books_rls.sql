-- Fix 1: books INSERT restricted to admins only
-- Remove any over-permissive INSERT policy that might exist
DROP POLICY IF EXISTS "Authenticated users can insert books" ON public.books;
DROP POLICY IF EXISTS "Users can insert books" ON public.books;

-- Only admins can add new books to the library
CREATE POLICY "Only admins can insert books"
  ON public.books FOR INSERT
  WITH CHECK (
    is_user_admin(auth.uid())
  );

-- Fix 2: Ensure the sync trigger handles the case where a user's default list
-- doesn't exist yet — auto-create it if missing
CREATE OR REPLACE FUNCTION public.fn_sync_book_list_on_status_update()
RETURNS TRIGGER AS $$
DECLARE
    target_list_id UUID;
    list_type_val  TEXT;
BEGIN
    -- Map reading_progress status to book_lists list_type
    list_type_val := CASE
        WHEN NEW.status = 'completed'   THEN 'read'
        WHEN NEW.status = 'want_to_read' THEN 'want_to_read'
        WHEN NEW.status = 'paused'      THEN 'dnf'
        ELSE 'reading'
    END;

    -- Find the user's default list for this type
    SELECT id INTO target_list_id
    FROM public.book_lists
    WHERE user_id     = NEW.user_id
      AND list_type   = list_type_val
      AND is_default  = true
      AND is_community = false
    LIMIT 1;

    -- Auto-create the default list if it doesn't exist yet
    IF target_list_id IS NULL THEN
        INSERT INTO public.book_lists (user_id, name, list_type, is_default, is_community)
        VALUES (
            NEW.user_id,
            CASE list_type_val
                WHEN 'want_to_read' THEN 'Okumak İstiyorum'
                WHEN 'reading'      THEN 'Şu An Okuyor'
                WHEN 'read'         THEN 'Okudum'
                ELSE 'Yarıda Bıraktım'
            END,
            list_type_val,
            true,
            false
        )
        RETURNING id INTO target_list_id;
    END IF;

    IF target_list_id IS NOT NULL THEN
        -- 1. Remove book from OTHER default lists of this user
        DELETE FROM public.book_list_items
        WHERE book_id = NEW.book_id
          AND list_id IN (
              SELECT id FROM public.book_lists
              WHERE user_id      = NEW.user_id
                AND id           != target_list_id
                AND is_default   = true
                AND is_community = false
          );

        -- 2. Add to target list (idempotent)
        INSERT INTO public.book_list_items (list_id, book_id)
        VALUES (target_list_id, NEW.book_id)
        ON CONFLICT (list_id, book_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-attach the trigger (drop first to replace the function)
DROP TRIGGER IF EXISTS tr_sync_book_list ON public.reading_progress;
CREATE TRIGGER tr_sync_book_list
AFTER INSERT OR UPDATE OF status ON public.reading_progress
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_book_list_on_status_update();
