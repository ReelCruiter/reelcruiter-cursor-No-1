-- Add new optional columns on posts to support OPEN TO WORK / COMMUNITY / HIRING post types
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS post_kind text,
  ADD COLUMN IF NOT EXISTS work_arrangement text,
  ADD COLUMN IF NOT EXISTS experience_level text,
  ADD COLUMN IF NOT EXISTS openings integer,
  ADD COLUMN IF NOT EXISTS apply_url text,
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS immediate_start boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS desired_role text,
  ADD COLUMN IF NOT EXISTS preferred_location text;

-- Validate post_kind values via trigger (allows nulls for legacy rows)
CREATE OR REPLACE FUNCTION public.validate_post_kind()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.post_kind IS NOT NULL AND NEW.post_kind NOT IN ('open_to_work','community','hiring') THEN
    RAISE EXCEPTION 'Invalid post_kind: %', NEW.post_kind;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_post_kind_trigger ON public.posts;
CREATE TRIGGER validate_post_kind_trigger
BEFORE INSERT OR UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.validate_post_kind();

-- Backfill existing posts with a sensible post_kind so feed badges render
UPDATE public.posts
SET post_kind = CASE
  WHEN tag = 'hiring' THEN 'hiring'
  ELSE 'community'
END
WHERE post_kind IS NULL;