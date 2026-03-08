
-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own nomination" ON public.voting_nominations;

-- Recreate with null group_code handling
CREATE POLICY "Users can insert their own nomination"
ON public.voting_nominations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    get_user_group_code(auth.uid()) IS NULL
    OR group_code = get_user_group_code(auth.uid())
  )
);

-- Also fix SELECT policy for null group_code users
DROP POLICY IF EXISTS "Users can view nominations in their group" ON public.voting_nominations;

CREATE POLICY "Users can view nominations in their group"
ON public.voting_nominations
FOR SELECT
TO authenticated
USING (
  get_user_group_code(auth.uid()) IS NULL
  OR group_code = get_user_group_code(auth.uid())
);
