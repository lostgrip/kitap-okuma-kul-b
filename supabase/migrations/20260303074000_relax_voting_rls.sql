-- Drop existing strict RLS policies
DROP POLICY IF EXISTS "Users can view votes in their group" ON public.book_votes;
DROP POLICY IF EXISTS "Users can insert their own votes" ON public.book_votes;
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.book_votes;

DROP POLICY IF EXISTS "Users can view schedule in their group" ON public.club_schedule;
DROP POLICY IF EXISTS "Admins can create schedule" ON public.club_schedule;
DROP POLICY IF EXISTS "Admins can update schedule" ON public.club_schedule;
DROP POLICY IF EXISTS "Admins can delete schedule" ON public.club_schedule;

-- Create more permissive policies for book_votes
-- Allow everyone to view votes
CREATE POLICY "Users can view all votes" ON public.book_votes FOR SELECT USING (true);
-- Allow authenticated users to insert their own votes
CREATE POLICY "Users can insert their own votes" ON public.book_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Allow authenticated users to delete their own votes
CREATE POLICY "Users can delete their own votes" ON public.book_votes FOR DELETE USING (auth.uid() = user_id);

-- Create more permissive policies for club_schedule
-- Allow everyone to view the schedule
CREATE POLICY "Users can view schedule" ON public.club_schedule FOR SELECT USING (true);
-- Allow admins to insert/update/delete schedule regardless of strict group codes
CREATE POLICY "Admins can create schedule" ON public.club_schedule FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update schedule" ON public.club_schedule FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete schedule" ON public.club_schedule FOR DELETE USING (has_role(auth.uid(), 'admin'));
