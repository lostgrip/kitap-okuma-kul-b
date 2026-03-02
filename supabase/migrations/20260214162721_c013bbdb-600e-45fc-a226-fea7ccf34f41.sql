
-- Fix overly permissive feedback INSERT policy
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;

CREATE POLICY "Authenticated users can submit feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );
