-- Make the post-videos bucket private so direct URLs no longer work
UPDATE storage.buckets SET public = false WHERE id = 'post-videos';

-- Drop any prior open policies for post-videos to keep things clean
DROP POLICY IF EXISTS "Public can view post videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view post videos" ON storage.objects;
DROP POLICY IF EXISTS "post-videos public read" ON storage.objects;

-- Authenticated users can read post videos (they will use signed URLs in code)
CREATE POLICY "Authenticated users can read post videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'post-videos');

-- Owners can upload into their own folder: <user_id>/...
DROP POLICY IF EXISTS "Owners can upload post videos" ON storage.objects;
CREATE POLICY "Owners can upload post videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Owners can update their own files
DROP POLICY IF EXISTS "Owners can update post videos" ON storage.objects;
CREATE POLICY "Owners can update post videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'post-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Owners can delete their own files
DROP POLICY IF EXISTS "Owners can delete post videos" ON storage.objects;
CREATE POLICY "Owners can delete post videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);