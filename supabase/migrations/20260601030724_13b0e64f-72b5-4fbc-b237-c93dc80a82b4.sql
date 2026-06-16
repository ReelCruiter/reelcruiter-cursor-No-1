ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_linkedin text,
  ADD COLUMN IF NOT EXISTS company_twitter text,
  ADD COLUMN IF NOT EXISTS company_instagram text,
  ADD COLUMN IF NOT EXISTS company_facebook text;