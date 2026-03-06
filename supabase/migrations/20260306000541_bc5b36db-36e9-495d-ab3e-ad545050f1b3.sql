-- Make book-files bucket public so EPUB files can be read by the browser
UPDATE storage.buckets SET public = true WHERE id = 'book-files';

-- Add public SELECT policy for book-files bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public read access for book-files'
  ) THEN
    CREATE POLICY "Public read access for book-files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'book-files');
  END IF;
END $$;

-- Allow authenticated users to upload to book-files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can upload book files'
  ) THEN
    CREATE POLICY "Authenticated users can upload book files"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'book-files' AND auth.uid() IS NOT NULL);
  END IF;
END $$;