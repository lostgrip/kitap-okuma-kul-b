-- ============================================================
-- Auto-assign the group's active club book to new members
-- when their profile's group_code is set (INSERT or UPDATE).
-- Inserts a reading_progress row so the book appears in the
-- "Currently Reading" tab immediately after joining.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_profile_group_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_book_id uuid;
BEGIN
  -- Only act when group_code is being set for the first time
  -- (INSERT with group_code, or UPDATE where group_code changed from NULL)
  IF NEW.group_code IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.group_code IS NOT DISTINCT FROM NEW.group_code THEN
    RETURN NEW;
  END IF;

  -- Find the currently active club book for this group
  SELECT book_id INTO v_book_id
  FROM public.club_schedule
  WHERE group_code = NEW.group_code
    AND status = 'active'
  LIMIT 1;

  IF v_book_id IS NULL THEN
    RETURN NEW; -- No active book yet, nothing to do
  END IF;

  -- Insert a reading_progress row (skip if one already exists)
  INSERT INTO public.reading_progress (user_id, book_id, current_page, status)
  VALUES (NEW.user_id, v_book_id, 0, 'reading')
  ON CONFLICT (user_id, book_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_profile_group_assigned: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_group_assigned ON public.profiles;
CREATE TRIGGER on_profile_group_assigned
  AFTER INSERT OR UPDATE OF group_code ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_group_assigned();
