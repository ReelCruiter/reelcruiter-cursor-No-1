import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { UserMode } from "./userMode";
import { awaitCurrentUserId } from "@/lib/authCache";
import {
  BLOCK_CHANGED_EVENT,
  getBlockStatus,
  type BlockStatus,
} from "@/lib/safety";

const CHAT_BUCKET = "chat-attachments";
const SIGNED_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Extract the storage path inside the chat-attachments bucket from any
 * Supabase Storage URL (public, signed, or authenticated). Returns the raw
 * input if it already looks like a path.
 */
export function extractChatAttachmentPath(urlOrPath: string): string | null {
  if (!urlOrPath) return null;
  if (!urlOrPath.includes("://")) return urlOrPath.replace(/^\/+/, "");
  try {
    const u = new URL(urlOrPath);
    const m = u.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/
    );
    if (!m || m[1] !== CHAT_BUCKET) return null;
    return decodeURIComponent(m[2]);
  } catch {
    return null;
  }
}

/**
 * Generate a fresh signed URL for a chat attachment. Falls back to the
 * original URL if we can't parse a storage path (e.g. external link).
 */
export async function getChatAttachmentUrl(urlOrPath: string): Promise<string> {
  const path = extractChatAttachmentPath(urlOrPath);
  if (!path) return urlOrPath;
  const { data, error } = await supabase.storage
    .from(CHAT_BUCKET)
    .createSignedUrl(path, SIGNED_TTL_SECONDS);
  if (error || !data?.signedUrl) return urlOrPath;
  return data.signedUrl;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  read: boolean;
  created_at: string;
  pending?: boolean;
}

export interface ConversationRow {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: string | null;
  last_message_at: string;
  created_at: string;
  role_context: "hiring" | "job_seeker";
}

export interface ConversationListItem {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
}

const orderedPair = (a: string, b: string): [string, string] =>
  a < b ? [a, b] : [b, a];

async function unhideConversation(conversationId: string, userId: string) {
  await supabase
    .from("conversation_deletes")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

async function findConversationId(
  u1: string,
  u2: string,
  roleContext?: UserMode
): Promise<string | null> {
  let query = supabase
    .from("conversations")
    .select("id")
    .eq("user1_id", u1)
    .eq("user2_id", u2);
  if (roleContext) query = query.eq("role_context", roleContext);
  const { data } = await query.maybeSingle();
  return data?.id ?? null;
}

/**
 * Get-or-create the conversation between current user and another user.
 * Returns the conversation id, or null on error (e.g. blocked).
 */
export async function getOrCreateConversation(
  currentUserId: string,
  otherUserId: string,
  roleContext: UserMode = "job_seeker"
): Promise<{ id: string | null; error: string | null }> {
  if (currentUserId === otherUserId) {
    return { id: null, error: "You can't message yourself" };
  }
  const [u1, u2] = orderedPair(currentUserId, otherUserId);

  let existingId = await findConversationId(u1, u2, roleContext);
  if (existingId) {
    await unhideConversation(existingId, currentUserId);
    return { id: existingId, error: null };
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({ user1_id: u1, user2_id: u2, role_context: roleContext })
    .select("id")
    .single();

  if (error) {
    // Another thread may exist (legacy schema or concurrent create).
    if (error.code === "23505") {
      existingId =
        (await findConversationId(u1, u2, roleContext)) ??
        (await findConversationId(u1, u2));
      if (existingId) {
        await unhideConversation(existingId, currentUserId);
        return { id: existingId, error: null };
      }
    }
    return { id: null, error: error.message };
  }
  return { id: data.id, error: null };
}

/** Prefer an existing thread when opening chat; only create when none exists. */
export async function openConversationWithUser(
  currentUserId: string,
  otherUserId: string,
  preferredRole: UserMode = "job_seeker",
): Promise<{ id: string | null; error: string | null }> {
  if (currentUserId === otherUserId) {
    return { id: null, error: "You can't message yourself" };
  }
  const [u1, u2] = orderedPair(currentUserId, otherUserId);

  const { data: convs } = await supabase
    .from("conversations")
    .select("id, role_context, last_message_at")
    .eq("user1_id", u1)
    .eq("user2_id", u2)
    .order("last_message_at", { ascending: false });

  if (!convs?.length) {
    return getOrCreateConversation(currentUserId, otherUserId, preferredRole);
  }

  const roleMatch = convs.find((c) => c.role_context === preferredRole);
  if (roleMatch) {
    await unhideConversation(roleMatch.id, currentUserId);
    return { id: roleMatch.id, error: null };
  }

  const { data: unread } = await supabase
    .from("messages")
    .select("conversation_id")
    .eq("sender_id", otherUserId)
    .eq("recipient_id", currentUserId)
    .eq("read", false)
    .in(
      "conversation_id",
      convs.map((c) => c.id),
    )
    .order("created_at", { ascending: false })
    .limit(1);

  if (unread?.[0]?.conversation_id) {
    const id = unread[0].conversation_id;
    await unhideConversation(id, currentUserId);
    return { id, error: null };
  }

  await unhideConversation(convs[0].id, currentUserId);
  return { id: convs[0].id, error: null };
}

/**
 * Total unread message count for the current user across all conversations.
 * Used by the bottom navigation badge.
 */
/**
 * Total unread message count for the current user.
 * Note: this counts ALL unread messages, not role-scoped — the navbar badge
 * just needs a single number, and counting per-role would require an extra
 * query on every message change (very expensive when realtime fires often).
 */
export function useUnreadMessageCount(_roleContext?: UserMode | null) {
  const [count, setCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const refresh = useCallback(async (uid: string) => {
    const { count: c } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", uid)
      .eq("read", false);
    setCount(c ?? 0);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let mounted = true;

    awaitCurrentUserId().then((uid) => {
      if (!mounted) return;
      setUserId(uid);
      if (!uid) {
        setCount(0);
        return;
      }
      refresh(uid);
      channel = supabase
        .channel(`unread-msgs-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages", filter: `recipient_id=eq.${uid}` },
          () => refresh(uid)
        )
        .subscribe();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) refresh(uid);
      else setCount(0);
    });

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  return { count, userId };
}

/**
 * List of conversations for the current user, with the other participant's
 * profile, last message preview, and unread count. Excludes hidden ones.
 * Shows all role contexts — hiding by active mode caused missing threads while
 * the navbar still counted their unread messages.
 */
export function useConversations() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (uid: string) => {
    setLoading(true);

    const [{ data: convs }, { data: hiddenRows }] = await Promise.all([
      supabase
        .from("conversations")
        .select("*")
        .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
        .order("last_message_at", { ascending: false }),
      supabase
        .from("conversation_deletes")
        .select("conversation_id, deleted_at")
        .eq("user_id", uid),
    ]);

    const hidden = new Map<string, string>();
    (hiddenRows ?? []).forEach((r: any) => hidden.set(r.conversation_id, r.deleted_at));

    // Don't filter by role — users must see every thread with unread messages.
    const visible = (convs ?? []).filter((c) => {
      const hAt = hidden.get(c.id);
      if (!hAt) return true;
      // Re-show conversation if a new message arrived after deletion
      return new Date(c.last_message_at).getTime() > new Date(hAt).getTime();
    });

    if (visible.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const otherIds = Array.from(
      new Set(visible.map((c) => (c.user1_id === uid ? c.user2_id : c.user1_id)))
    );

    const [{ data: profiles }, { data: unreadRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, company_name, company_logo_url, active_mode")
        .in("user_id", otherIds),
      supabase
        .from("messages")
        .select("conversation_id")
        .eq("recipient_id", uid)
        .eq("read", false)
        .in(
          "conversation_id",
          visible.map((c) => c.id)
        ),
    ]);

    const profMap = new Map<string, any>();
    (profiles ?? []).forEach((p: any) => profMap.set(p.user_id, p));

    const unreadMap = new Map<string, number>();
    (unreadRows ?? []).forEach((r: any) => {
      unreadMap.set(r.conversation_id, (unreadMap.get(r.conversation_id) ?? 0) + 1);
    });

    const items: Array<ConversationListItem & { role_context: string }> = visible.map((c: any) => {
      const otherId = c.user1_id === uid ? c.user2_id : c.user1_id;
      const p = profMap.get(otherId);
      // If the other user is in hiring mode (or this conversation is on the
      // hiring side), show their company name + logo instead of their photo.
      const isHiringSide =
        p?.active_mode === "hiring" || c.role_context === "hiring";
      const displayName = isHiringSide
        ? p?.company_name || p?.full_name || "User"
        : p?.full_name || "User";
      const displayAvatar = isHiringSide
        ? p?.company_logo_url || p?.avatar_url || null
        : p?.avatar_url || null;
      return {
        id: c.id,
        otherUserId: otherId,
        otherUserName: displayName,
        otherUserAvatar: displayAvatar,
        lastMessage: c.last_message,
        lastMessageAt: c.last_message_at,
        unreadCount: unreadMap.get(c.id) ?? 0,
        role_context: c.role_context ?? "job_seeker",
      };
    });

    setConversations(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let mounted = true;

    awaitCurrentUserId().then((uid) => {
      if (!mounted) return;
      setCurrentUserId(uid);
      if (!uid) {
        setConversations([]);
        setLoading(false);
        return;
      }
      load(uid);
      const debouncedReload = () => {
        if (reloadTimer.current) clearTimeout(reloadTimer.current);
        reloadTimer.current = setTimeout(() => load(uid), 400);
      };
      channel = supabase
        .channel(`conv-list-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages", filter: `recipient_id=eq.${uid}` },
          debouncedReload
        )
        .subscribe();
    });

    return () => {
      mounted = false;
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, [load]);

  const hideConversation = useCallback(
    async (conversationId: string) => {
      if (!currentUserId) return { error: "Not signed in" };
      // Upsert: delete existing then insert with current timestamp
      await supabase
        .from("conversation_deletes")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", currentUserId);
      const { error } = await supabase
        .from("conversation_deletes")
        .insert({ conversation_id: conversationId, user_id: currentUserId });
      if (!error) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      }
      return { error: error?.message ?? null };
    },
    [currentUserId]
  );

  return { conversations, loading, currentUserId, hideConversation, refresh: () => currentUserId && load(currentUserId) };
}

/**
 * Messages for a single conversation, with realtime updates,
 * send/upload helpers, and read tracking.
 */
export function useConversationMessages(
  conversationId: string | null,
  currentUserId: string | null,
  otherUserId: string | null
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState<BlockStatus>("none");
  const seenIds = useRef<Set<string>>(new Set());

  const checkBlocked = useCallback(async () => {
    if (!otherUserId) {
      setBlocked("none");
      return;
    }
    setBlocked(await getBlockStatus(otherUserId));
  }, [otherUserId]);

  const markRead = useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .eq("recipient_id", currentUserId)
      .eq("read", false);
  }, [conversationId, currentUserId]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    (async () => {
      setLoading(true);
      seenIds.current = new Set();
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (!active) return;
      const list = (data ?? []) as ChatMessage[];
      list.forEach((m) => seenIds.current.add(m.id));
      setMessages(list);
      setLoading(false);
      markRead();
    })();

    channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          if (seenIds.current.has(m.id)) return;
          seenIds.current.add(m.id);
          setMessages((prev) => {
            // Replace any pending message with same content from same sender if present
            const idx = prev.findIndex(
              (p) => p.pending && p.sender_id === m.sender_id && (p.content ?? "") === (m.content ?? "")
            );
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = m;
              return next;
            }
            return [...prev, m];
          });
          if (m.recipient_id === currentUserId) markRead();
        }
      )
      .subscribe();

    checkBlocked();

    const onBlockChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ userId: string }>).detail;
      if (detail?.userId === otherUserId) checkBlocked();
    };
    window.addEventListener(BLOCK_CHANGED_EVENT, onBlockChanged);

    const blockChannel =
      currentUserId && otherUserId
        ? supabase
            .channel(`blocks-${currentUserId}-${otherUserId}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "user_blocks" },
              () => checkBlocked()
            )
            .subscribe()
        : null;

    return () => {
      active = false;
      window.removeEventListener(BLOCK_CHANGED_EVENT, onBlockChanged);
      if (channel) supabase.removeChannel(channel);
      if (blockChannel) supabase.removeChannel(blockChannel);
    };
  }, [conversationId, currentUserId, otherUserId, markRead, checkBlocked]);

  const sendText = useCallback(
    async (text: string) => {
      if (!conversationId || !currentUserId || !otherUserId) return { error: "Not ready" };
      const trimmed = text.trim();
      if (!trimmed) return { error: null };

      const blockStatus = await getBlockStatus(otherUserId);
      if (blockStatus !== "none") {
        setBlocked(blockStatus);
        return { error: "Messaging is disabled for this conversation" };
      }

      const tempId = `tmp-${Date.now()}-${Math.random()}`;
      const optimistic: ChatMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        recipient_id: otherUserId,
        content: trimmed,
        attachment_url: null,
        attachment_name: null,
        attachment_type: null,
        attachment_size: null,
        read: false,
        created_at: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          recipient_id: otherUserId,
          content: trimmed,
        })
        .select("*")
        .single();

      if (error || !data) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return { error: error?.message ?? "Failed to send" };
      }

      seenIds.current.add(data.id);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as ChatMessage) : m)));

      await supabase
        .from("conversations")
        .update({ last_message: trimmed.slice(0, 200), last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      return { error: null };
    },
    [conversationId, currentUserId, otherUserId]
  );

  const sendAttachment = useCallback(
    async (file: File) => {
      if (!conversationId || !currentUserId || !otherUserId) return { error: "Not ready" };

      const blockStatus = await getBlockStatus(otherUserId);
      if (blockStatus !== "none") {
        setBlocked(blockStatus);
        return { error: "Messaging is disabled for this conversation" };
      }

      const MAX = 20 * 1024 * 1024;
      if (file.size > MAX) return { error: "Max file size is 20MB" };

      const ext = file.name.split(".").pop() || "bin";
      const path = `${currentUserId}/${conversationId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) return { error: upErr.message };

      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const preview = isVideo
        ? "🎥 Video message"
        : isImage
        ? "📷 Photo"
        : `📎 ${file.name}`;

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          recipient_id: otherUserId,
          // Store the storage path; we generate signed URLs on read so the
          // bucket can stay private.
          attachment_url: path,
          attachment_name: file.name,
          attachment_type: file.type,
          attachment_size: file.size,
        })
        .select("*")
        .single();
      if (error || !data) return { error: error?.message ?? "Failed to send" };

      seenIds.current.add(data.id);
      setMessages((prev) => [...prev, data as ChatMessage]);

      await supabase
        .from("conversations")
        .update({ last_message: preview, last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      return { error: null };
    },
    [conversationId, currentUserId, otherUserId]
  );

  return { messages, loading, blocked, sendText, sendAttachment, refreshBlockStatus: checkBlocked };
}

export function formatChatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatRelativeShort(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString();
}