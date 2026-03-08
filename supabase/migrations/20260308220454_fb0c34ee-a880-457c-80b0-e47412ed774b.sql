
-- 1. PRIVILEGE ESCALATION FIX: Prevent users from changing is_admin via profile update
-- Add a trigger that blocks non-admin users from modifying is_admin
CREATE OR REPLACE FUNCTION public.prevent_is_admin_self_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If is_admin is being changed and the user is not already an admin via user_roles
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF NOT has_role(auth.uid(), 'admin') THEN
      NEW.is_admin := OLD.is_admin; -- silently revert
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_admin_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_is_admin_self_promotion();

-- 2. CLUB_SCHEDULE: Add group_code restriction to admin INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Admins can create schedule" ON public.club_schedule;
CREATE POLICY "Admins can create schedule"
  ON public.club_schedule FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND group_code = get_user_group_code(auth.uid()));

DROP POLICY IF EXISTS "Admins can update schedule" ON public.club_schedule;
CREATE POLICY "Admins can update schedule"
  ON public.club_schedule FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND group_code = get_user_group_code(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete schedule" ON public.club_schedule;
CREATE POLICY "Admins can delete schedule"
  ON public.club_schedule FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND group_code = get_user_group_code(auth.uid()));

-- 3. NULL GROUP PUBLIC EXPOSURE: Fix SELECT policies to require authentication

-- profiles: require auth
DROP POLICY IF EXISTS "Users can view profiles in their group" ON public.profiles;
CREATE POLICY "Users can view profiles in their group"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR group_code = get_user_group_code(auth.uid())
    OR (group_code IS NULL AND auth.uid() IS NOT NULL)
  );

-- books: require auth
DROP POLICY IF EXISTS "Users can view books in their group" ON public.books;
CREATE POLICY "Users can view books in their group"
  ON public.books FOR SELECT TO authenticated
  USING (
    added_by IS NULL
    OR auth.uid() = added_by
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = books.added_by
      AND (p.group_code IS NULL OR p.group_code = get_user_group_code(auth.uid()))
    )
  );

-- feed_posts: require auth
DROP POLICY IF EXISTS "Users can view posts in their group" ON public.feed_posts;
CREATE POLICY "Users can view posts in their group"
  ON public.feed_posts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = feed_posts.user_id
      AND (p.group_code IS NULL OR p.group_code = get_user_group_code(auth.uid()))
    )
  );

-- book_reviews: require auth
DROP POLICY IF EXISTS "Users can view reviews in their group" ON public.book_reviews;
CREATE POLICY "Users can view reviews in their group"
  ON public.book_reviews FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = book_reviews.user_id
      AND (p.group_code IS NULL OR p.group_code = get_user_group_code(auth.uid()))
    )
  );

-- book_discussions: require auth
DROP POLICY IF EXISTS "Users can view discussions" ON public.book_discussions;
CREATE POLICY "Users can view discussions"
  ON public.book_discussions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = book_discussions.user_id
      AND (p.group_code IS NULL OR p.group_code = get_user_group_code(auth.uid()))
    )
  );
