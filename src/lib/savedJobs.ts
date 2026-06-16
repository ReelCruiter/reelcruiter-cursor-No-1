import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authCache";

/**
 * Hook returning the set of saved post ids for the current user, plus a toggle.
 * Persists to public.saved_jobs.
 */
export const useSavedJobs = () => {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { userId, ready } = useAuth();

  const refresh = useCallback(async (uid: string | null) => {
    if (!uid) {
      setSavedIds(new Set());
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("saved_jobs")
      .select("post_id")
      .eq("user_id", uid);
    if (!error && data) {
      setSavedIds(new Set(data.map((r) => r.post_id)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!ready) return;
    refresh(userId);
  }, [ready, userId, refresh]);

  const toggleSave = useCallback(
    async (postId: string): Promise<{ saved: boolean; error?: string }> => {
      if (!userId) return { saved: false, error: "not-signed-in" };
      const isSaved = savedIds.has(postId);
      // optimistic
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.delete(postId);
        else next.add(postId);
        return next;
      });
      if (isSaved) {
        const { error } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("user_id", userId)
          .eq("post_id", postId);
        if (error) {
          // revert
          setSavedIds((prev) => new Set(prev).add(postId));
          return { saved: true, error: error.message };
        }
        return { saved: false };
      } else {
        const { error } = await supabase
          .from("saved_jobs")
          .insert({ user_id: userId, post_id: postId });
        if (error) {
          setSavedIds((prev) => {
            const next = new Set(prev);
            next.delete(postId);
            return next;
          });
          return { saved: false, error: error.message };
        }
        return { saved: true };
      }
    },
    [userId, savedIds]
  );

  return { savedIds, toggleSave, userId, loading };
};
