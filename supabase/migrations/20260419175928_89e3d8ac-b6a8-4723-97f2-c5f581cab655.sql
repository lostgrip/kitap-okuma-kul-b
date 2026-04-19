-- Drop existing permissive policies that fall back to 'general'
DROP POLICY IF EXISTS "Authenticated users can read group book-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can insert group book-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update group book-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete group book-files" ON storage.objects;

-- SELECT: only users whose group_code matches the first folder segment
CREATE POLICY "Group members can read group book-files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'book-files'
  AND public.get_user_group_code(auth.uid()) IS NOT NULL
  AND (storage.foldername(name))[1] = public.get_user_group_code(auth.uid())
);

-- INSERT: only users with a valid group_code can upload, and only into their own group folder
CREATE POLICY "Group members can insert group book-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'book-files'
  AND public.get_user_group_code(auth.uid()) IS NOT NULL
  AND (storage.foldername(name))[1] = public.get_user_group_code(auth.uid())
);

-- UPDATE: same restriction
CREATE POLICY "Group members can update group book-files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'book-files'
  AND public.get_user_group_code(auth.uid()) IS NOT NULL
  AND (storage.foldername(name))[1] = public.get_user_group_code(auth.uid())
);

-- DELETE: same restriction
CREATE POLICY "Group members can delete group book-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'book-files'
  AND public.get_user_group_code(auth.uid()) IS NOT NULL
  AND (storage.foldername(name))[1] = public.get_user_group_code(auth.uid())
);