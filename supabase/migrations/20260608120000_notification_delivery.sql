-- Message + follow notifications, smarter role_context, and email outbox.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.notification_email_outbox (
  notification_id UUID PRIMARY KEY REFERENCES public.notifications(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  last_error TEXT
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.notification_role_for_user(target_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE((SELECT active_mode FROM public.profiles WHERE user_id = target_user_id), 'job_seeker') = 'hiring'
    THEN 'hiring'
    ELSE 'job_seeker'
  END;
$$;

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
  INSERT INTO public.notifications (recipient_id, actor_id, type, post_id, role_context)
  VALUES (owner_id, NEW.user_id, 'like', NEW.post_id, public.notification_role_for_user(owner_id));
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
  INSERT INTO public.notifications (recipient_id, actor_id, type, post_id, message, role_context)
  VALUES (
    owner_id,
    NEW.user_id,
    'comment',
    NEW.post_id,
    LEFT(NEW.content, 140),
    public.notification_role_for_user(owner_id)
  );
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
  INSERT INTO public.notifications (recipient_id, actor_id, type, post_id, message, role_context)
  VALUES (
    owner_id,
    NEW.applicant_id,
    'application',
    NEW.post_id,
    COALESCE(LEFT(NEW.cover_note, 140), 'Applied to your job'),
    'hiring'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.follower_id = NEW.following_id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications (recipient_id, actor_id, type, role_context)
  VALUES (
    NEW.following_id,
    NEW.follower_id,
    'follow',
    public.notification_role_for_user(NEW.following_id)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_role TEXT;
  preview TEXT;
BEGIN
  IF NEW.sender_id = NEW.recipient_id THEN
    RETURN NEW;
  END IF;

  SELECT role_context INTO conv_role FROM public.conversations WHERE id = NEW.conversation_id;

  preview := COALESCE(
    NULLIF(TRIM(NEW.content), ''),
    CASE
      WHEN NEW.attachment_type LIKE 'image/%' THEN 'Sent you a photo'
      WHEN NEW.attachment_type LIKE 'video/%' THEN 'Sent you a video'
      WHEN NEW.attachment_name IS NOT NULL THEN 'Sent you an attachment'
      ELSE 'Sent you a message'
    END
  );

  INSERT INTO public.notifications (recipient_id, actor_id, type, message, role_context)
  VALUES (
    NEW.recipient_id,
    NEW.sender_id,
    'message',
    LEFT(preview, 140),
    COALESCE(conv_role, public.notification_role_for_user(NEW.recipient_id))
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_notification_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.type NOT IN ('message', 'application', 'follow') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_email_outbox (notification_id)
  VALUES (NEW.id)
  ON CONFLICT (notification_id) DO NOTHING;

  BEGIN
    PERFORM net.http_post(
      url := 'https://qubhkwpuqkmezvvphsvw.supabase.co/functions/v1/process-notification-email',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('notification_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

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

DROP TRIGGER IF EXISTS trg_notify_new_follow ON public.user_follows;
CREATE TRIGGER trg_notify_new_follow
AFTER INSERT ON public.user_follows
FOR EACH ROW EXECUTE FUNCTION public.notify_new_follow();

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

DROP TRIGGER IF EXISTS trg_queue_notification_email ON public.notifications;
CREATE TRIGGER trg_queue_notification_email
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.queue_notification_email();
