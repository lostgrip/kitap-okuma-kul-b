-- Fix club_schedule SELECT policy to use group_code match via get_user_group_code()
-- instead of the previous open USING (true) which was later tightened too strictly.
-- Also ensures reading_log and reading_progress are visible group-wide.

-- club_schedule: members should see their group's schedule
DROP POLICY IF EXISTS "Users can view schedule" ON public.club_schedule;
DROP POLICY IF EXISTS "Users can view schedule in their group" ON public.club_schedule;

CREATE POLICY "Users can view schedule in their group"
  ON public.club_schedule FOR SELECT
  TO authenticated
  USING (group_code = get_user_group_code(auth.uid()));

-- reading_log: allow all authenticated members of the same group to see logs
-- (needed for "Bugün Okuyanlar" section)
DROP POLICY IF EXISTS "Authenticated users can view reading logs" ON public.reading_log;
DROP POLICY IF EXISTS "Users can view reading logs in their group" ON public.reading_log;

CREATE POLICY "Users can view reading logs in their group"
  ON public.reading_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles viewer
      JOIN public.profiles logger ON logger.user_id = reading_log.user_id
      WHERE viewer.user_id = auth.uid()
        AND viewer.group_code = logger.group_code
    )
  );
