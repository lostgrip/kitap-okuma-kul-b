
-- Allow admins to delete any book in their group
DROP POLICY IF EXISTS "Users can delete books they added" ON public.books;
CREATE POLICY "Users can delete books they added or admins can delete"
ON public.books
FOR DELETE
USING (
  (auth.uid() = added_by) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update any book in their group
DROP POLICY IF EXISTS "Users can update books they added" ON public.books;
CREATE POLICY "Users can update books they added or admins can update"
ON public.books
FOR UPDATE
USING (
  (auth.uid() = added_by) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Add post_type 'poll' and 'recommendation' to feed_posts (no schema change needed, it's text)
-- No migration needed for text column values
