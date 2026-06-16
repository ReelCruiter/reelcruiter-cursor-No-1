-- 1. Add active_mode to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_mode TEXT NOT NULL DEFAULT 'job_seeker';

-- Validation trigger for active_mode
CREATE OR REPLACE FUNCTION public.validate_active_mode()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.active_mode NOT IN ('hiring','job_seeker') THEN
    RAISE EXCEPTION 'Invalid active_mode: %', NEW.active_mode;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_profile_active_mode ON public.profiles;
CREATE TRIGGER validate_profile_active_mode
BEFORE INSERT OR UPDATE OF active_mode ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_active_mode();

-- 2. Backfill: existing employer / hiring roles -> hiring mode
UPDATE public.profiles
SET active_mode = 'hiring'
WHERE role IN ('employer','hiring','hirer','recruiter');

-- 3. Convert legacy job-seeker posts: hide from feed (become profile videos only)
UPDATE public.posts
SET hidden_from_feed = true
WHERE tag = 'job-seeker';

-- 4. Update handle_new_user to also set active_mode based on signup role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  signup_role TEXT;
  signup_mode TEXT;
BEGIN
  signup_role := COALESCE(NEW.raw_user_meta_data->>'role', 'job_seeker');
  signup_mode := CASE
    WHEN signup_role IN ('employer','hiring','hirer','recruiter') THEN 'hiring'
    ELSE 'job_seeker'
  END;
  INSERT INTO public.profiles (user_id, full_name, role, active_mode)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    signup_role,
    signup_mode
  );
  RETURN NEW;
END;
$$;