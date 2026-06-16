
DROP POLICY IF EXISTS "Chat attachments are publicly readable" ON storage.objects;

UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

CREATE POLICY "Authenticated users can read chat attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments');
