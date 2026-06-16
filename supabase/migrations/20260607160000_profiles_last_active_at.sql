ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_last_active_at_idx
ON public.profiles (last_active_at DESC NULLS LAST);
