-- 1. Add intro_video_url to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS intro_video_url TEXT;

-- 2. Skills table
CREATE TABLE IF NOT EXISTS public.user_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_skills_user_id ON public.user_skills(user_id);
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Skills are viewable by everyone"
  ON public.user_skills FOR SELECT USING (true);
CREATE POLICY "Users can create their own skills"
  ON public.user_skills FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own skills"
  ON public.user_skills FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own skills"
  ON public.user_skills FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3. Education table
CREATE TABLE IF NOT EXISTS public.user_education (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  school TEXT NOT NULL DEFAULT '',
  degree TEXT NOT NULL DEFAULT '',
  field TEXT NOT NULL DEFAULT '',
  start_year TEXT NOT NULL DEFAULT '',
  end_year TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_education_user_id ON public.user_education(user_id);
ALTER TABLE public.user_education ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Education is viewable by everyone"
  ON public.user_education FOR SELECT USING (true);
CREATE POLICY "Users can create their own education"
  ON public.user_education FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own education"
  ON public.user_education FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own education"
  ON public.user_education FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_education_updated_at
  BEFORE UPDATE ON public.user_education
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Certificates table
CREATE TABLE IF NOT EXISTS public.user_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  issuer TEXT NOT NULL DEFAULT '',
  year TEXT NOT NULL DEFAULT '',
  credential_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_certificates_user_id ON public.user_certificates(user_id);
ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Certificates are viewable by everyone"
  ON public.user_certificates FOR SELECT USING (true);
CREATE POLICY "Users can create their own certificates"
  ON public.user_certificates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own certificates"
  ON public.user_certificates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own certificates"
  ON public.user_certificates FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_certificates_updated_at
  BEFORE UPDATE ON public.user_certificates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();