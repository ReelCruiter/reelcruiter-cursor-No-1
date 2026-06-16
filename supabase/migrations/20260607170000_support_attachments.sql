-- Support contact form file attachments
ALTER TABLE public.support_messages
ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own support attachments" ON storage.objects;
CREATE POLICY "Users upload own support attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users read own support attachments" ON storage.objects;
CREATE POLICY "Users read own support attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'support-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
