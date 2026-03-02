
-- Create social-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-images', 'social-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for social-images bucket
CREATE POLICY "Anyone can view social images"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-images');

CREATE POLICY "Authenticated users can upload social images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'social-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own social images"
ON storage.objects FOR DELETE
USING (bucket_id = 'social-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add image_url to feed_posts
ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS image_url text;
