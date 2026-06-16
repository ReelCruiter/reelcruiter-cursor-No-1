
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resume_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Resumes are publicly viewable" ON storage.objects;
CREATE POLICY "Resumes are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'resumes');

DROP POLICY IF EXISTS "Users can upload their own resume" ON storage.objects;
CREATE POLICY "Users can upload their own resume"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own resume" ON storage.objects;
CREATE POLICY "Users can update their own resume"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own resume" ON storage.objects;
CREATE POLICY "Users can delete their own resume"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
