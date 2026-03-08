
-- 1. Fix voting_nominations: remove IS NULL bypass for SELECT
DROP POLICY IF EXISTS "Users can view nominations in their group" ON public.voting_nominations;
CREATE POLICY "Users can view nominations in their group"
  ON public.voting_nominations FOR SELECT TO authenticated
  USING (group_code = get_user_group_code(auth.uid()));

-- 2. Fix voting_nominations: remove IS NULL bypass for INSERT
DROP POLICY IF EXISTS "Users can insert their own nomination" ON public.voting_nominations;
CREATE POLICY "Users can insert their own nomination"
  ON public.voting_nominations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND group_code = get_user_group_code(auth.uid()));

-- 3. Fix book_votes: restrict SELECT to authenticated users in same group
DROP POLICY IF EXISTS "Users can view all votes" ON public.book_votes;
CREATE POLICY "Users can view votes in their group"
  ON public.book_votes FOR SELECT TO authenticated
  USING (group_code = get_user_group_code(auth.uid()));

-- 4. Fix club_schedule: restrict SELECT to authenticated users in same group
DROP POLICY IF EXISTS "Users can view schedule" ON public.club_schedule;
CREATE POLICY "Users can view schedule in their group"
  ON public.club_schedule FOR SELECT TO authenticated
  USING (group_code = get_user_group_code(auth.uid()));
