-- Drop the overly permissive policies on books table
DROP POLICY "Authenticated users can add books" ON public.books;
DROP POLICY "Authenticated users can update books" ON public.books;
DROP POLICY "Authenticated users can delete books" ON public.books;

-- Create more restrictive policies - users can add books (with their id)
CREATE POLICY "Authenticated users can add books"
  ON public.books FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = added_by);

-- Users can update books they added
CREATE POLICY "Users can update books they added"
  ON public.books FOR UPDATE
  TO authenticated
  USING (auth.uid() = added_by);

-- Users can delete books they added
CREATE POLICY "Users can delete books they added"
  ON public.books FOR DELETE
  TO authenticated
  USING (auth.uid() = added_by);