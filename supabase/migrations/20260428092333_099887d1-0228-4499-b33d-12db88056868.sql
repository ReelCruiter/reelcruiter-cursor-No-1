ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS full_address text,
  ADD COLUMN IF NOT EXISTS address_visibility text NOT NULL DEFAULT 'full';

CREATE OR REPLACE FUNCTION public.validate_address_visibility()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.address_visibility NOT IN ('full','area','hidden') THEN
    RAISE EXCEPTION 'Invalid address_visibility: %', NEW.address_visibility;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_posts_address_visibility ON public.posts;
CREATE TRIGGER validate_posts_address_visibility
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_address_visibility();