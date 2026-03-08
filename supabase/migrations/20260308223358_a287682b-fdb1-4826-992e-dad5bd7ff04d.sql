
-- Fix book_votes INSERT: add group_code check
DROP POLICY IF EXISTS "Users can insert their own votes" ON public.book_votes;
CREATE POLICY "Users can insert their own votes" ON public.book_votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND group_code = get_user_group_code(auth.uid()));
