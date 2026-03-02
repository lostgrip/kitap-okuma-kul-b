
-- Create the trigger that was missing - default lists for new users
CREATE OR REPLACE TRIGGER create_default_lists_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_lists_for_user();

-- Add unique constraint on reading_progress for upsert to work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reading_progress_user_book_unique'
  ) THEN
    ALTER TABLE public.reading_progress ADD CONSTRAINT reading_progress_user_book_unique UNIQUE (user_id, book_id);
  END IF;
END $$;

-- Create default lists for existing users who don't have them yet
INSERT INTO public.book_lists (user_id, group_code, name, is_default, list_type)
SELECT p.user_id, p.group_code, list.name, true, list.list_type
FROM profiles p
CROSS JOIN (
  VALUES 
    ('Okumak İstiyorum', 'want_to_read'),
    ('Okuyorum', 'reading'),
    ('Okudum', 'read'),
    ('Yarıda Bıraktım', 'dnf')
) AS list(name, list_type)
WHERE NOT EXISTS (
  SELECT 1 FROM book_lists bl 
  WHERE bl.user_id = p.user_id 
    AND bl.list_type = list.list_type 
    AND bl.is_default = true
);
