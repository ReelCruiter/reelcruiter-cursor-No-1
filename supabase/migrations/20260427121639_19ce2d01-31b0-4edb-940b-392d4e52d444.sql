CREATE OR REPLACE FUNCTION public.validate_post_kind()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.post_kind IS NOT NULL AND NEW.post_kind NOT IN ('open_to_work','community','hiring','workplace') THEN
    RAISE EXCEPTION 'Invalid post_kind: %', NEW.post_kind;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill: posts already flagged is_workplace_video should have post_kind = 'workplace'
UPDATE public.posts
SET post_kind = 'workplace'
WHERE is_workplace_video = true AND (post_kind IS NULL OR post_kind <> 'workplace');