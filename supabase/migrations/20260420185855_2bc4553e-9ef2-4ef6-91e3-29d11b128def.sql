
-- Conversations between two users
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversations_user_order CHECK (user1_id < user2_id),
  CONSTRAINT conversations_unique_pair UNIQUE (user1_id, user2_id)
);

CREATE INDEX idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX idx_conversations_user2 ON public.conversations(user2_id);
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create conversations they are part of"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = user1_id OR auth.uid() = user2_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks
      WHERE (blocker_user_id = user1_id AND blocked_user_id = user2_id)
         OR (blocker_user_id = user2_id AND blocked_user_id = user1_id)
    )
  );

CREATE POLICY "Participants can update their conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  content TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  attachment_size INTEGER,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);
CREATE INDEX idx_messages_recipient_unread ON public.messages(recipient_id) WHERE read = false;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages in their conversations"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
        AND (c.user1_id = recipient_id OR c.user2_id = recipient_id)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks
      WHERE (blocker_user_id = recipient_id AND blocked_user_id = auth.uid())
         OR (blocker_user_id = auth.uid() AND blocked_user_id = recipient_id)
    )
  );

CREATE POLICY "Recipients can mark messages read"
  ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id);

-- Per-user conversation hiding (soft delete)
CREATE TABLE public.conversation_deletes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

ALTER TABLE public.conversation_deletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own deletes"
  ON public.conversation_deletes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users hide conversations for themselves"
  ON public.conversation_deletes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unhide conversations for themselves"
  ON public.conversation_deletes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

CREATE POLICY "Chat attachments are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users upload chat attachments to their own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete their own chat attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
