
-- Create user_blocks table
CREATE TABLE public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (blocker_user_id, blocked_user_id),
  CHECK (blocker_user_id != blocked_user_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
ON public.user_blocks FOR SELECT
TO authenticated
USING (auth.uid() = blocker_user_id);

CREATE POLICY "Users can block others"
ON public.user_blocks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocker_user_id);

CREATE POLICY "Users can unblock others"
ON public.user_blocks FOR DELETE
TO authenticated
USING (auth.uid() = blocker_user_id);

-- Create user_reports table
CREATE TYPE public.report_reason AS ENUM ('spam', 'harassment', 'inappropriate_content', 'fake_job_scam', 'other');

CREATE TABLE public.user_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason public.report_reason NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (reporter_user_id != reported_user_id)
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports"
ON public.user_reports FOR SELECT
TO authenticated
USING (auth.uid() = reporter_user_id);

CREATE POLICY "Users can submit reports"
ON public.user_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_user_id);

-- Index for quick block lookups
CREATE INDEX idx_user_blocks_blocker ON public.user_blocks(blocker_user_id);
CREATE INDEX idx_user_blocks_blocked ON public.user_blocks(blocked_user_id);
CREATE INDEX idx_user_reports_reporter ON public.user_reports(reporter_user_id);
