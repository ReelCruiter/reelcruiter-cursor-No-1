-- 1. Add role_context to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS role_context text NOT NULL DEFAULT 'job_seeker';

CREATE OR REPLACE FUNCTION public.validate_role_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role_context NOT IN ('hiring','job_seeker') THEN
    RAISE EXCEPTION 'Invalid role_context: %', NEW.role_context;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_conversation_role_context ON public.conversations;
CREATE TRIGGER validate_conversation_role_context
BEFORE INSERT OR UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.validate_role_context();

CREATE INDEX IF NOT EXISTS idx_conversations_role_context ON public.conversations(role_context);

-- 2. Add role_context to notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS role_context text NOT NULL DEFAULT 'job_seeker';

CREATE OR REPLACE FUNCTION public.validate_notification_role_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.role_context NOT IN ('hiring','job_seeker') THEN
    RAISE EXCEPTION 'Invalid role_context: %', NEW.role_context;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_notification_role_context_trg ON public.notifications;
CREATE TRIGGER validate_notification_role_context_trg
BEFORE INSERT OR UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.validate_notification_role_context();

CREATE INDEX IF NOT EXISTS idx_notifications_role_context ON public.notifications(role_context);

-- 3. Add company fields to profiles + workplace video flag to posts
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_description text;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_workplace_video boolean NOT NULL DEFAULT false;

-- 4. Backfill notifications by best guess
UPDATE public.notifications
SET role_context = 'hiring'
WHERE type = 'application';

UPDATE public.notifications
SET role_context = 'job_seeker'
WHERE type IN ('like','comment','follow');

-- Messages remain default 'job_seeker'; a conversation that involved any job application is hiring.
UPDATE public.notifications n
SET role_context = 'hiring'
WHERE type = 'message'
  AND EXISTS (
    SELECT 1 FROM public.job_applications ja
    JOIN public.posts p ON p.id = ja.post_id
    WHERE (p.user_id = n.recipient_id AND ja.applicant_id = n.actor_id)
       OR (p.user_id = n.actor_id     AND ja.applicant_id = n.recipient_id)
  );

-- 5. Backfill conversations: any conversation between an applicant and a post owner becomes hiring.
UPDATE public.conversations c
SET role_context = 'hiring'
WHERE EXISTS (
  SELECT 1 FROM public.job_applications ja
  JOIN public.posts p ON p.id = ja.post_id
  WHERE (p.user_id = c.user1_id AND ja.applicant_id = c.user2_id)
     OR (p.user_id = c.user2_id AND ja.applicant_id = c.user1_id)
);

-- 6. Update notification triggers to stamp role_context correctly
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS trigger
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
  INSERT INTO public.notifications (recipient_id, actor_id, type, post_id, role_context)
  VALUES (owner_id, NEW.user_id, 'like', NEW.post_id, 'job_seeker');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_post_comment()
RETURNS trigger
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
  INSERT INTO public.notifications (recipient_id, actor_id, type, post_id, message, role_context)
  VALUES (owner_id, NEW.user_id, 'comment', NEW.post_id, LEFT(NEW.content, 140), 'job_seeker');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_job_application()
RETURNS trigger
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
  INSERT INTO public.notifications (recipient_id, actor_id, type, post_id, message, role_context)
  VALUES (owner_id, NEW.applicant_id, 'application', NEW.post_id, COALESCE(LEFT(NEW.cover_note, 140), 'Applied to your job'), 'hiring');
  RETURN NEW;
END;
$$;