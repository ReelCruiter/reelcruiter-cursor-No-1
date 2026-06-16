CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit support messages"
ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own support messages"
ON public.support_messages
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_support_messages_user_id ON public.support_messages(user_id);
CREATE INDEX idx_support_messages_created_at ON public.support_messages(created_at DESC);