
-- Fix: Remove the "user_id IS NULL" branch from SELECT policy on feedback table
-- Only allow authenticated users to view their own feedback, or admins to view all

DROP POLICY IF EXISTS "Users can view their own feedback" ON public.feedback;

CREATE POLICY "Users can view their own feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
);
