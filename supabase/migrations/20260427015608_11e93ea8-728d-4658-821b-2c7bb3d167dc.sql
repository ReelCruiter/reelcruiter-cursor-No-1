-- Update default status to 'new' and migrate existing 'pending' rows
ALTER TABLE public.job_applications ALTER COLUMN status SET DEFAULT 'new';
UPDATE public.job_applications SET status = 'new' WHERE status = 'pending';

-- Add CHECK-like validation via trigger (avoids immutable check issues)
CREATE OR REPLACE FUNCTION public.validate_application_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('new','viewed','shortlisted','rejected') THEN
    RAISE EXCEPTION 'Invalid application status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS validate_application_status_trg ON public.job_applications;
CREATE TRIGGER validate_application_status_trg
BEFORE INSERT OR UPDATE ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.validate_application_status();

-- Allow post owners to UPDATE the status of applications on their posts
DROP POLICY IF EXISTS "Post owners can update application status" ON public.job_applications;
CREATE POLICY "Post owners can update application status"
ON public.job_applications
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = job_applications.post_id AND p.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = job_applications.post_id AND p.user_id = auth.uid()));
