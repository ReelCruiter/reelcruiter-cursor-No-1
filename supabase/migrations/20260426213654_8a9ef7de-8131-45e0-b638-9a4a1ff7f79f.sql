-- Posts table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL CHECK (tag IN ('job-seeker','hiring')),
  job_title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  job_type TEXT CHECK (job_type IN ('full-time','part-time','contract','freelance','internship')),
  salary TEXT,
  city TEXT,
  country TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  hidden_from_feed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public posts are viewable by everyone"
  ON public.posts FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);

-- Public storage bucket for post videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-videos', 'post-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Post videos are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-videos');

CREATE POLICY "Users can upload videos to their own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own video files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own video files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );