-- Ensure book-files bucket is private
UPDATE storage.buckets
SET public = false
WHERE id = 'book-files';

-- Drop any public/overly-broad read policies for book-files
DROP POLICY IF EXISTS "Public read access for book-files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view book files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view book files in their group" ON storage.objects;

-- Recreate strict authenticated-only read policy (scoped to user's group folder, with 'general' fallback)
CREATE POLICY "Authenticated users can read group book-files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'book-files'
  AND (storage.foldername(name))[1] = COALESCE(public.get_user_group_code(auth.uid()), 'general')
);

-- Tighten upload policy so users can only upload into their own group folder (or 'general')
DROP POLICY IF EXISTS "Authenticated users can upload book files" ON storage.objects;

CREATE POLICY "Authenticated users can upload group book-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'book-files'
  AND (storage.foldername(name))[1] = COALESCE(public.get_user_group_code(auth.uid()), 'general')
);
