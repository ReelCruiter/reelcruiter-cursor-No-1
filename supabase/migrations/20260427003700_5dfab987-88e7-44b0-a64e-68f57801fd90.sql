-- Create experiences table
CREATE TABLE public.experiences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  is_current BOOLEAN NOT NULL DEFAULT false,
  video_url TEXT,
  category TEXT NOT NULL DEFAULT 'Engineering',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

-- Anyone can view experiences (public profiles)
CREATE POLICY "Experiences are viewable by everyone"
ON public.experiences
FOR SELECT
USING (true);

-- Users can insert their own experiences
CREATE POLICY "Users can create their own experiences"
ON public.experiences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own experiences
CREATE POLICY "Users can update their own experiences"
ON public.experiences
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own experiences
CREATE POLICY "Users can delete their own experiences"
ON public.experiences
FOR DELETE
USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_experiences_updated_at
BEFORE UPDATE ON public.experiences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast user lookups
CREATE INDEX idx_experiences_user_id ON public.experiences(user_id);