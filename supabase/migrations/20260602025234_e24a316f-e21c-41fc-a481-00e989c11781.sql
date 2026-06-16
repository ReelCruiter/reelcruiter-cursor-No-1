ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_tiktok text,
  ADD COLUMN IF NOT EXISTS company_youtube text,
  ADD COLUMN IF NOT EXISTS company_whatsapp text;