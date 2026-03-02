
-- Fix book-files SELECT policy to enforce group-based access
DROP POLICY IF EXISTS "Users can view book files in their group" ON storage.objects;

CREATE POLICY "Users can view book files in their group"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'book-files'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = public.get_user_group_code(auth.uid())
  );

-- Fix book-files INSERT policy to enforce group-based upload paths
DROP POLICY IF EXISTS "Authenticated users can upload book files" ON storage.objects;

CREATE POLICY "Authenticated users can upload book files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'book-files'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = public.get_user_group_code(auth.uid())
  );
