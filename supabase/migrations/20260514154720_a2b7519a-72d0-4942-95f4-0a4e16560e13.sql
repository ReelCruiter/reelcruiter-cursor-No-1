ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_website text,
ADD COLUMN IF NOT EXISTS company_industry text,
ADD COLUMN IF NOT EXISTS company_size text;