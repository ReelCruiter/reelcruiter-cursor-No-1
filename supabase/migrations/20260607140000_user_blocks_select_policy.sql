-- Allow both parties to see a block row so messaging policies and the app
-- can detect blocks in either direction, and unblock clears interaction correctly.

DROP POLICY IF EXISTS "Users can view their own blocks" ON public.user_blocks;

CREATE POLICY "Users can view blocks involving them"
ON public.user_blocks
FOR SELECT
TO authenticated
USING (auth.uid() = blocker_user_id OR auth.uid() = blocked_user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_blocks;
