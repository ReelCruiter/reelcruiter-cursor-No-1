import { supabase } from "@/integrations/supabase/client";
import { awaitCurrentUserId } from "@/lib/authCache";

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  likeCount: number;
  likedByMe: boolean;
}

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// ----- Likes -----

export async function fetchLikeStats(
  postId: string
): Promise<{ count: number; likedByMe: boolean }> {
  if (!isUuid(postId)) return { count: 0, likedByMe: false };
  const userId = await awaitCurrentUserId();

  const { count } = await supabase
    .from("post_likes")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);

  let likedByMe = false;
  if (userId) {
    const { data } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();
    likedByMe = !!data;
  }
  return { count: count || 0, likedByMe };
}

export async function toggleLike(
  postId: string
): Promise<{ liked: boolean; error: string | null }> {
  if (!isUuid(postId)) return { liked: false, error: "invalid-post" };
  const userId = await awaitCurrentUserId();
  if (!userId) return { liked: false, error: "not-signed-in" };

  const { data: existing } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("id", existing.id);
    return { liked: false, error: error?.message || null };
  }
  const { error } = await supabase
    .from("post_likes")
    .insert({ post_id: postId, user_id: userId });
  return { liked: !error, error: error?.message || null };
}

// ----- Comments -----

export async function fetchComments(postId: string): Promise<PostComment[]> {
  if (!isUuid(postId)) return [];
  const { data: rows, error } = await supabase
    .from("post_comments")
    .select("id, post_id, user_id, content, created_at, parent_id")
    .eq("post_id", postId)
    .order("created_at", { ascending: false });
  if (error || !rows) return [];

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
  if (userIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", userIds);
    (profs || []).forEach((p) => {
      profiles[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
    });
  }

  // Comment like stats
  const commentIds = rows.map((r) => r.id);
  const likeCounts: Record<string, number> = {};
  const likedSet = new Set<string>();
  if (commentIds.length) {
    const { data: likes } = await supabase
      .from("comment_likes")
      .select("comment_id, user_id")
      .in("comment_id", commentIds);
    (likes || []).forEach((l: { comment_id: string; user_id: string }) => {
      likeCounts[l.comment_id] = (likeCounts[l.comment_id] || 0) + 1;
    });
    const uid = await awaitCurrentUserId();
    if (uid) {
      (likes || []).forEach((l: { comment_id: string; user_id: string }) => {
        if (l.user_id === uid) likedSet.add(l.comment_id);
      });
    }
  }

  return rows.map((r) => ({
    id: r.id,
    postId: r.post_id,
    userId: r.user_id,
    userName: profiles[r.user_id]?.full_name || "Member",
    userAvatar: profiles[r.user_id]?.avatar_url || "",
    content: r.content,
    createdAt: r.created_at,
    parentId: (r as { parent_id: string | null }).parent_id ?? null,
    likeCount: likeCounts[r.id] || 0,
    likedByMe: likedSet.has(r.id),
  }));
}

export async function fetchCommentCount(postId: string): Promise<number> {
  if (!isUuid(postId)) return 0;
  const { count } = await supabase
    .from("post_comments")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);
  return count || 0;
}

export async function addComment(
  postId: string,
  content: string,
  parentId?: string | null
): Promise<{ comment: PostComment | null; error: string | null }> {
  if (!isUuid(postId)) return { comment: null, error: "invalid-post" };
  const text = content.trim();
  if (!text) return { comment: null, error: "empty" };
  const userId = await awaitCurrentUserId();
  if (!userId) return { comment: null, error: "not-signed-in" };

  const { data, error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, user_id: userId, content: text, parent_id: parentId ?? null })
    .select("id, post_id, user_id, content, created_at, parent_id")
    .single();
  if (error || !data) return { comment: null, error: error?.message || "Failed" };

  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    comment: {
      id: data.id,
      postId: data.post_id,
      userId: data.user_id,
      userName: prof?.full_name || "Member",
      userAvatar: prof?.avatar_url || "",
      content: data.content,
      createdAt: data.created_at,
      parentId: (data as { parent_id: string | null }).parent_id ?? null,
      likeCount: 0,
      likedByMe: false,
    },
    error: null,
  };
}

export async function deleteComment(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("post_comments").delete().eq("id", id);
  return { error: error?.message || null };
}

// ----- Comment likes -----

export async function toggleCommentLike(
  commentId: string
): Promise<{ liked: boolean; error: string | null }> {
  const userId = await awaitCurrentUserId();
  if (!userId) return { liked: false, error: "not-signed-in" };

  const { data: existing } = await supabase
    .from("comment_likes")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("id", existing.id);
    return { liked: false, error: error?.message || null };
  }
  const { error } = await supabase
    .from("comment_likes")
    .insert({ comment_id: commentId, user_id: userId });
  return { liked: !error, error: error?.message || null };
}

// Bulk fetch counts for many posts (used in feed lists).
export async function fetchPostStats(
  postIds: string[]
): Promise<Record<string, { likes: number; comments: number; likedByMe: boolean }>> {
  const ids = postIds.filter(isUuid);
  const out: Record<string, { likes: number; comments: number; likedByMe: boolean }> = {};
  if (ids.length === 0) return out;
  ids.forEach((id) => (out[id] = { likes: 0, comments: 0, likedByMe: false }));

  const [{ data: likes }, { data: comments }, { data: auth }] = await Promise.all([
    supabase.from("post_likes").select("post_id").in("post_id", ids),
    supabase.from("post_comments").select("post_id").in("post_id", ids),
    Promise.resolve({ data: { user: null } }),
  ]);
  (likes || []).forEach((l: { post_id: string }) => {
    if (out[l.post_id]) out[l.post_id].likes += 1;
  });
  (comments || []).forEach((c: { post_id: string }) => {
    if (out[c.post_id]) out[c.post_id].comments += 1;
  });

  const userId = await awaitCurrentUserId();
  if (userId) {
    const { data: mine } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", ids);
    (mine || []).forEach((l: { post_id: string }) => {
      if (out[l.post_id]) out[l.post_id].likedByMe = true;
    });
  }
  return out;
}
