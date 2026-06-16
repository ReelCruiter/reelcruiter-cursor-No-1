-- Allow separate hiring and job seeker threads between the same two users.
-- The original constraint only allowed one row per (user1_id, user2_id).

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_unique_pair;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_unique_pair_role
  UNIQUE (user1_id, user2_id, role_context);
