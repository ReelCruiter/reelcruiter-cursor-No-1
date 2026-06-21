import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { awaitCurrentUserId } from "@/lib/authCache";

export interface FollowUser {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  last_active_at?: string | null;
}

// Profile shape returned from the DB before we collapse it into FollowUser.
interface ProfileRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  company_name?: string | null;
  company_logo_url?: string | null;
  active_mode?: string | null;
  last_active_at?: string | null;
}

const collapseProfile = (p: ProfileRow): FollowUser => {
  const isHiring = p.active_mode === "hiring";
  return {
    user_id: p.user_id,
    full_name: isHiring ? p.company_name || p.full_name : p.full_name,
    avatar_url: isHiring ? p.company_logo_url || p.avatar_url : p.avatar_url,
    bio: p.bio,
    last_active_at: p.last_active_at ?? null,
  };
};

/**
 * Returns follower/following counts for a user and the current
 * viewer's follow state, with helpers to follow/unfollow.
 */
export const useFollow = (targetUserId: string | null | undefined) => {
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!targetUserId) return;
    const [{ count: followerCount }, { count: followingCount }, uid] = await Promise.all([
      supabase
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", targetUserId),
      supabase
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", targetUserId),
      awaitCurrentUserId(),
    ]);
    setFollowers(followerCount ?? 0);
    setFollowing(followingCount ?? 0);
    setCurrentUserId(uid);
    if (uid && uid !== targetUserId) {
      const { data } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", uid)
        .eq("following_id", targetUserId)
        .maybeSingle();
      setIsFollowing(!!data);
    } else {
      setIsFollowing(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: keep counts and isFollowing in sync when anyone follows/unfollows
  // this user, or the viewer follows/unfollows others.
  useEffect(() => {
    if (!targetUserId) return;
    const channel = supabase
      .channel(`user_follows:${targetUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_follows" },
        (payload) => {
          const row: any = (payload as any).new ?? (payload as any).old;
          if (!row) return;
          if (row.follower_id === targetUserId || row.following_id === targetUserId) {
            refresh();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetUserId, refresh]);

  const follow = async () => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) return { error: "Not signed in" };
    setLoading(true);
    setIsFollowing(true);
    setFollowers((c) => c + 1);
    const { error } = await supabase
      .from("user_follows")
      .insert({ follower_id: currentUserId, following_id: targetUserId });
    if (!error) {
      // Notification is created by database trigger (notify_new_follow).
    } else {
      setIsFollowing(false);
      setFollowers((c) => Math.max(0, c - 1));
    }
    setLoading(false);
    return { error: error?.message ?? null };
  };

  const unfollow = async () => {
    if (!currentUserId || !targetUserId) return { error: "Not signed in" };
    setLoading(true);
    setIsFollowing(false);
    setFollowers((c) => Math.max(0, c - 1));
    const { error } = await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId);
    if (error) {
      setIsFollowing(true);
      setFollowers((c) => c + 1);
    }
    setLoading(false);
    return { error: error?.message ?? null };
  };

  return {
    followers,
    following,
    isFollowing,
    currentUserId,
    loading,
    isSelf: currentUserId === targetUserId,
    follow,
    unfollow,
    refresh,
  };
};

export const fetchFollowers = async (userId: string): Promise<FollowUser[]> => {
  const { data: follows } = await supabase
    .from("user_follows")
    .select("follower_id")
    .eq("following_id", userId);
  const ids = (follows ?? []).map((f) => f.follower_id);
  if (ids.length === 0) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, avatar_url, bio, company_name, company_logo_url, active_mode")
    .in("user_id", ids);
  return (profiles ?? []).map((p: any) => collapseProfile(p as ProfileRow));
};

export const fetchFollowing = async (userId: string): Promise<FollowUser[]> => {
  const { data: follows } = await supabase
    .from("user_follows")
    .select("following_id")
    .eq("follower_id", userId);
  const ids = (follows ?? []).map((f) => f.following_id);
  if (ids.length === 0) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, avatar_url, bio, company_name, company_logo_url, active_mode")
    .in("user_id", ids);
  return (profiles ?? []).map((p: any) => collapseProfile(p as ProfileRow));
};
