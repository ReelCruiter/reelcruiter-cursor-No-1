-- 1) Extend notification_type enum with 'application'
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'application';

-- 2) Job applications table
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL,
  cover_note TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_job_applications_post_id ON public.job_applications(post_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant_id ON public.job_applications(applicant_id);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Applicants can see their own applications
CREATE POLICY "Applicants can view their own applications"
  ON public.job_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = applicant_id);

-- Post owners can see applications to their posts
CREATE POLICY "Post owners can view applications to their posts"
  ON public.job_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = job_applications.post_id
        AND p.user_id = auth.uid()
    )
  );

-- Signed-in users can apply as themselves
CREATE POLICY "Users can apply to posts"
  ON public.job_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = applicant_id);

-- Applicants can withdraw their own application
CREATE POLICY "Applicants can withdraw their applications"
  ON public.job_applications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = applicant_id);

-- 3) Trigger functions to create notifications
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (recipient_id, actor_id, type, post_id)
  VALUES (owner_id, NEW.user_id, 'like', NEW.post_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  IF owner_id IS NULL OR owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (recipient_id, actor_id, type, post_id, message)
  VALUES (owner_id, NEW.user_id, 'comment', NEW.post_id, LEFT(NEW.content, 140));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_job_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT user_id INTO owner_id FROM public.posts WHERE id = NEW.post_id;
  IF owner_id IS NULL OR owner_id = NEW.applicant_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (recipient_id, actor_id, type, post_id, message)
  VALUES (owner_id, NEW.applicant_id, 'application', NEW.post_id, COALESCE(LEFT(NEW.cover_note, 140), 'Applied to your job'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_like ON public.post_likes;
CREATE TRIGGER trg_notify_post_like
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_post_like();

DROP TRIGGER IF EXISTS trg_notify_post_comment ON public.post_comments;
CREATE TRIGGER trg_notify_post_comment
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_post_comment();

DROP TRIGGER IF EXISTS trg_notify_job_application ON public.job_applications;
CREATE TRIGGER trg_notify_job_application
AFTER INSERT ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_job_application();
