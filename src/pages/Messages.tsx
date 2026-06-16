import Layout from "@/components/Layout";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Send, ArrowLeft, MoreHorizontal, Paperclip, Trash2, Loader2, Check, CheckCheck,
  Search as SearchIcon, Video as VideoIcon, Smile, MessageSquarePlus, Sparkles,
  Briefcase, Search,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import BlockReportMenu from "@/components/BlockReportMenu";
import UserAvatar from "@/components/UserAvatar";
import ChatAttachment from "@/components/ChatAttachment";
import { motion, AnimatePresence } from "framer-motion";
import {
  useConversations,
  useConversationMessages,
  getOrCreateConversation,
  formatChatTime,
  formatRelativeShort,
  type ConversationListItem,
} from "@/lib/messaging";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useUserMode } from "@/lib/userMode";
import { unblockUser } from "@/lib/safety";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const QUICK_EMOJIS = [
  "😀", "😂", "😊", "😍", "🥰", "😎", "🙂", "😉",
  "👍", "👏", "🙏", "💪", "🎉", "🔥", "✨", "❤️",
  "💯", "😅", "🤔", "😢", "😮", "🙌", "👋", "💼",
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Filter = "all" | "unread" | "video" | "people";

const isVideoPreview = (s: string | null) => !!s && /^🎥/.test(s);
const isMediaPreview = (s: string | null) => !!s && /^(🎥|📷|📎)/.test(s);

const squarePalette = [
  "from-orange-400 to-rose-400",
  "from-fuchsia-500 to-pink-400",
  "from-purple-500 to-fuchsia-500",
  "from-sky-400 to-indigo-400",
  "from-violet-500 to-purple-500",
  "from-blue-500 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
];
const initialsOf = (name?: string | null) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
const gradientFor = (name?: string | null) => {
  if (!name) return squarePalette[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return squarePalette[h % squarePalette.length];
};
const SquareAvatar = ({ src, name, size = 56 }: { src?: string | null; name?: string | null; size?: number }) => (
  <div
    className={`relative flex-shrink-0 rounded-2xl overflow-hidden bg-gradient-to-br ${gradientFor(name)} flex items-center justify-center text-white font-heading font-bold`}
    style={{ width: size, height: size, fontSize: size * 0.34 }}
  >
    {src ? (
      <img
        src={src}
        alt={name ?? "User"}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />
    ) : (
      <span>{initialsOf(name)}</span>
    )}
  </div>
);

const Messages = () => {
  const { mode } = useUserMode();
  const isHiring = mode === "hiring";
  const { conversations, loading, currentUserId, hideConversation, refresh } = useConversations(mode);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [newMsg, setNewMsg] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [directChat, setDirectChat] = useState<ConversationListItem | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? directChat,
    [conversations, selectedId, directChat]
  );

  // When opening from a profile link, the thread may exist under a different mode filter.
  useEffect(() => {
    if (!selectedId || !currentUserId) {
      setDirectChat(null);
      return;
    }
    if (conversations.some((c) => c.id === selectedId)) {
      setDirectChat(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, user1_id, user2_id, last_message, last_message_at, role_context")
        .eq("id", selectedId)
        .maybeSingle();
      if (!conv || cancelled) return;

      const otherId = conv.user1_id === currentUserId ? conv.user2_id : conv.user1_id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, company_name, company_logo_url, active_mode")
        .eq("user_id", otherId)
        .maybeSingle();
      if (cancelled) return;

      const hiringSide =
        profile?.active_mode === "hiring" || conv.role_context === "hiring";
      setDirectChat({
        id: conv.id,
        otherUserId: otherId,
        otherUserName: hiringSide
          ? profile?.company_name || profile?.full_name || "User"
          : profile?.full_name || "User",
        otherUserAvatar: hiringSide
          ? profile?.company_logo_url || profile?.avatar_url || null
          : profile?.avatar_url || null,
        lastMessage: conv.last_message,
        lastMessageAt: conv.last_message_at,
        unreadCount: 0,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, conversations, currentUserId]);

  const { messages, loading: msgLoading, blocked, sendText, sendAttachment, refreshBlockStatus } = useConversationMessages(
    selectedId,
    currentUserId,
    selected?.otherUserId ?? null
  );

  const filtered = useMemo(() => {
    let list = conversations;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.otherUserName.toLowerCase().includes(q) ||
          (c.lastMessage ?? "").toLowerCase().includes(q)
      );
    }
    if (filter === "unread") list = list.filter((c) => c.unreadCount > 0);
    if (filter === "video") list = list.filter((c) => isVideoPreview(c.lastMessage));
    if (filter === "people") list = list.filter((c) => !isMediaPreview(c.lastMessage));
    return list;
  }, [conversations, query, filter]);

  const totalUnread = useMemo(
    () => conversations.reduce((n, c) => n + (c.unreadCount > 0 ? 1 : 0), 0),
    [conversations]
  );

  // Open conversation from ?to=<userId>
  useEffect(() => {
    const to = searchParams.get("to");
    if (!to || !currentUserId) return;
    (async () => {
      if (!UUID_RE.test(to)) {
        toast.error("This is a demo profile and can't be messaged. Try a real user.");
        searchParams.delete("to");
        setSearchParams(searchParams, { replace: true });
        return;
      }
      const { id, error } = await getOrCreateConversation(currentUserId, to, mode ?? "job_seeker");
      if (error) toast.error(error);
      else if (id) {
        setSelectedId(id);
        refresh();
      }
      searchParams.delete("to");
      setSearchParams(searchParams, { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedId]);

  const handleSend = async () => {
    if (!newMsg.trim() || !selected || sending) return;
    if (blocked !== "none") {
      toast.error("Messaging is disabled for this conversation");
      return;
    }
    setSending(true);
    const text = newMsg;
    setNewMsg("");
    const { error } = await sendText(text);
    setSending(false);
    if (error) {
      toast.error(error);
      setNewMsg(text);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selected) return;
    if (blocked !== "none") {
      toast.error("Messaging is disabled for this conversation");
      return;
    }
    setUploading(true);
    const { error } = await sendAttachment(file);
    setUploading(false);
    if (error) toast.error(error);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await hideConversation(confirmDelete);
    if (error) toast.error(error);
    else {
      toast.success("Chat deleted");
      if (selectedId === confirmDelete) setSelectedId(null);
    }
    setConfirmDelete(null);
    setShowMenu(false);
  };

  const handleUnblock = async () => {
    if (!selected) return;
    const { ok, error } = await unblockUser(selected.otherUserId);
    if (!ok) {
      toast.error(error || "Could not unblock user");
      return;
    }
    toast.success(`${selected.otherUserName} unblocked`);
    refreshBlockStatus();
  };

  const blockedBanner =
    blocked === "you-blocked"
      ? "You blocked this user. Unblock to send messages again."
      : blocked === "blocked-you"
      ? "You can no longer message this user."
      : null;

  // Group messages by day
  const groupedMessages = useMemo(() => {
    const groups: Array<{ label: string; items: typeof messages }> = [];
    const fmt = (iso: string) => {
      const d = new Date(iso);
      const today = new Date();
      const yest = new Date();
      yest.setDate(today.getDate() - 1);
      const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
      if (sameDay(d, today)) return "Today";
      if (sameDay(d, yest)) return "Yesterday";
      return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    };
    messages.forEach((m) => {
      const label = fmt(m.created_at);
      const last = groups[groups.length - 1];
      if (!last || last.label !== label) groups.push({ label, items: [m] });
      else last.items.push(m);
    });
    return groups;
  }, [messages]);

  const insertEmoji = (emoji: string) => {
    setNewMsg((prev) => prev + emoji);
    setEmojiOpen(false);
  };

  const emptyInboxHint = isHiring
    ? "Message candidates from their profile to start a conversation."
    : "Tap Message on a job or profile to start chatting.";

  const newThreadHint = isHiring
    ? "Send a message to follow up with this candidate."
    : "Send a message to introduce yourself or ask a question.";

  return (
    <Layout>
      <div className="container py-4 sm:py-8 max-w-6xl">
        <div className="bg-card/60 backdrop-blur-sm rounded-3xl card-shadow overflow-hidden flex h-[calc(100vh-7rem)] sm:h-[680px] border border-border/50">
          {/* Conversation List */}
          <div
            className={`flex-shrink-0 flex-col bg-background/30 border-border/60 ${
              selectedId
                ? "hidden sm:flex sm:w-[340px] border-r"
                : "flex w-full flex-1"
            }`}
          >
            {/* Header */}
            <div className="px-5 pt-6 pb-3 bg-background">
              <div className="flex items-center justify-between">
                <h1 className="text-[34px] leading-none font-heading font-extrabold tracking-tight">
                  Chats
                </h1>
                <button
                  onClick={() => setSearchOpen((v) => !v)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-foreground hover:bg-muted transition-colors"
                  title="Search"
                >
                  <SearchIcon className="w-[22px] h-[22px]" strokeWidth={2.25} />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {searchOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="relative">
                      <SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search chats"
                        className="w-full h-10 pl-10 pr-4 rounded-full bg-muted/70 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar -mx-1 px-1">
                      {([
                        { id: "all", label: "All" },
                        { id: "unread", label: `Unread${totalUnread ? ` · ${totalUnread}` : ""}` },
                        { id: "video", label: "Video" },
                        { id: "people", label: isHiring ? "Candidates" : "Recruiters" },
                      ] as Array<{ id: Filter; label: string }>).map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setFilter(f.id)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                            filter === f.id
                              ? "bg-foreground text-background shadow-sm"
                              : "bg-muted/50 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pb-3 bg-background">
              {loading ? (
                <div className="space-y-2 px-4 pt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-3 animate-pulse">
                      <div className="w-14 h-14 rounded-2xl bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/2 rounded bg-muted" />
                        <div className="h-2.5 w-3/4 rounded bg-muted/70" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center mb-4">
                    <Sparkles className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    {query || filter !== "all" ? "No matches" : "Your inbox is empty"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {query || filter !== "all"
                      ? "Try a different search or filter."
                      : emptyInboxHint}
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {filtered.map((conv, idx) => {
                    const isVid = isVideoPreview(conv.lastMessage);
                    const active = selectedId === conv.id;
                    const recentlyActive =
                      Date.now() - new Date(conv.lastMessageAt).getTime() < 5 * 60 * 1000;
                    const activeLabel = (() => {
                      const diff = (Date.now() - new Date(conv.lastMessageAt).getTime()) / 1000;
                      if (diff < 60) return "Active now";
                      if (diff < 3600) return `Active ${Math.floor(diff / 60)}m ago`;
                      if (diff < 86400) return `Active ${Math.floor(diff / 3600)}h ago`;
                      if (diff < 86400 * 7) return `Active ${Math.floor(diff / 86400)}d ago`;
                      return `Last active on ${new Date(conv.lastMessageAt).toLocaleDateString()}`;
                    })();
                    const preview = conv.lastMessage || "Say hi 👋";
                    return (
                      <motion.button
                        key={conv.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: Math.min(idx * 0.02, 0.2), duration: 0.2 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => setSelectedId(conv.id)}
                        className={`w-full px-5 py-3.5 flex items-start gap-4 text-left border-b border-border/60 transition-colors ${
                          active ? "bg-muted/60" : "hover:bg-muted/40"
                        }`}
                      >
                        <SquareAvatar
                          src={conv.otherUserAvatar}
                          name={conv.otherUserName}
                          size={56}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-heading font-extrabold text-[15px] leading-tight text-foreground truncate">
                              {conv.otherUserName}
                            </span>
                            <span className="flex items-center gap-1 flex-shrink-0 text-[12px] font-medium text-muted-foreground pt-0.5">
                              <CheckCheck
                                className={`w-4 h-4 ${conv.unreadCount === 0 ? "text-primary" : "text-muted-foreground/60"}`}
                                strokeWidth={2.25}
                              />
                              <span>{formatRelativeShort(conv.lastMessageAt)}</span>
                            </span>
                          </div>
                          <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                            {activeLabel}
                          </p>
                          <p
                            className={`text-[14px] mt-1 line-clamp-2 flex items-start gap-1.5 ${
                              conv.unreadCount > 0 ? "text-foreground font-semibold" : "text-foreground/85"
                            }`}
                          >
                            {isVid && <VideoIcon className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />}
                            <span className="truncate">{preview}</span>
                            {conv.unreadCount > 0 && (
                              <span className="ml-auto flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                                {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                              </span>
                            )}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Chat Area — only visible once a conversation is selected */}
          <div className={`flex-1 flex-col min-w-0 relative ${selectedId ? "flex" : "hidden"}`}>
            {selected ? (
              <>
                {/* Sticky chat header */}
                <div className="px-3 sm:px-5 py-3 border-b border-border/60 flex items-center gap-1 sm:gap-2 bg-card/80 backdrop-blur-md sticky top-0 z-10">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="sm:hidden p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <Link
                    to={`/user/${selected.otherUserId}`}
                    className="flex items-center gap-3 flex-1 min-w-0 group"
                  >
                    <div className="relative">
                      <UserAvatar
                        src={selected.otherUserAvatar}
                        name={selected.otherUserName}
                        className="w-10 h-10 ring-2 ring-background group-hover:ring-primary/40 transition-all"
                      />
                      {Date.now() - new Date(selected.lastMessageAt).getTime() < 5 * 60 * 1000 && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 ring-2 ring-card" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-sm text-card-foreground group-hover:text-primary transition-colors truncate">
                        {selected.otherUserName}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                          Date.now() - new Date(selected.lastMessageAt).getTime() < 5 * 60 * 1000
                            ? "bg-green-500"
                            : "bg-muted-foreground/50"
                        }`} />
                        {Date.now() - new Date(selected.lastMessageAt).getTime() < 5 * 60 * 1000
                          ? "Active now"
                          : `Active ${formatRelativeShort(selected.lastMessageAt)} ago`}
                      </p>
                    </div>
                  </Link>
                  <button
                    onClick={() => setConfirmDelete(selected.id)}
                    className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    {showMenu && (
                      <BlockReportMenu
                        targetUserId={selected.otherUserId}
                        targetUserName={selected.otherUserName}
                        onClose={() => setShowMenu(false)}
                      />
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-4 bg-gradient-to-b from-background/40 via-background/20 to-background/40">
                  {msgLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
                          <div className={`h-10 rounded-2xl bg-muted animate-pulse ${i % 2 ? "w-40" : "w-56"}`} />
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/15 to-primary/10 flex items-center justify-center mb-4 shadow-lg">
                        <MessageSquarePlus className="w-9 h-9 text-primary" />
                      </div>
                      <p className="text-base font-heading font-bold mb-1">Start the conversation</p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        {newThreadHint}
                      </p>
                    </div>
                  ) : (
                    groupedMessages.map((group) => (
                      <div key={group.label} className="space-y-2">
                        <div className="flex justify-center my-2">
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 backdrop-blur-sm px-3 py-1 rounded-full tracking-wider uppercase">
                            {group.label}
                          </span>
                        </div>
                        {group.items.map((msg, i) => {
                          const isMe = msg.sender_id === currentUserId;
                          const prev = group.items[i - 1];
                          const next = group.items[i + 1];
                          const isFirstOfBurst = !prev || prev.sender_id !== msg.sender_id;
                          const isLastOfBurst = !next || next.sender_id !== msg.sender_id;
                          const hasMedia = !!msg.attachment_url;
                          const isVid = msg.attachment_type?.startsWith("video/");
                          const mediaOnly = hasMedia && isVid && !msg.content;
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 6, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: 0.18 }}
                              className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                            >
                              {!isMe && (
                                <div className={`flex-shrink-0 transition-opacity ${isLastOfBurst ? "opacity-100" : "opacity-0"}`}>
                                  <UserAvatar
                                    src={selected.otherUserAvatar}
                                    name={selected.otherUserName}
                                    className="w-7 h-7"
                                  />
                                </div>
                              )}
                              <div
                                className={`max-w-[78%] sm:max-w-[65%] text-sm break-words ${
                                  mediaOnly
                                    ? ""
                                    : isMe
                                    ? `px-3.5 py-2.5 shadow-sm bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-3xl ${isLastOfBurst ? "rounded-br-md" : ""} ${!isFirstOfBurst ? "rounded-tr-md" : ""}`
                                    : `px-3.5 py-2.5 shadow-sm bg-card text-foreground border border-border/60 rounded-3xl ${isLastOfBurst ? "rounded-bl-md" : ""} ${!isFirstOfBurst ? "rounded-tl-md" : ""}`
                                } ${msg.pending ? "opacity-70" : ""}`}
                              >
                                {msg.attachment_url && (
                                  <ChatAttachment
                                    url={msg.attachment_url}
                                    name={msg.attachment_name}
                                    type={msg.attachment_type}
                                    size={msg.attachment_size}
                                    isMe={isMe}
                                  />
                                )}
                                {msg.content && <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                                <span
                                  className={`text-[10px] mt-1 flex items-center gap-1 ${
                                    mediaOnly
                                      ? "text-muted-foreground justify-end pr-1"
                                      : isMe
                                      ? "text-primary-foreground/70 justify-end"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {formatChatTime(msg.created_at)}
                                  {isMe &&
                                    (msg.pending ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : msg.read ? (
                                      <CheckCheck className={`w-3 h-3 ${mediaOnly ? "text-primary" : "text-sky-300"}`} />
                                    ) : (
                                      <Check className="w-3 h-3" />
                                    ))}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Floating composer */}
                <div className="p-3 sm:p-4 border-t border-border/60 bg-card/80 backdrop-blur-md">
                  {blockedBanner ? (
                    <div className="text-center py-2 space-y-2">
                      <p className="text-xs text-muted-foreground">{blockedBanner}</p>
                      {blocked === "you-blocked" && (
                        <Button size="sm" variant="outline" onClick={handleUnblock}>
                          Unblock user
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
                        onChange={handleFile}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-11 h-11 flex-shrink-0 bg-muted text-muted-foreground rounded-full flex items-center justify-center hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-50 active:scale-95"
                        title="Attach file or video"
                      >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0 relative flex items-center bg-muted/70 rounded-full">
                        <input
                          value={newMsg}
                          onChange={(e) => setNewMsg(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                          placeholder="Write a message…"
                          className="flex-1 min-w-0 bg-transparent rounded-full pl-5 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="absolute right-2 w-8 h-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-colors"
                              aria-label="Add emoji"
                            >
                              <Smile className="w-4 h-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent side="top" align="end" className="w-[17rem] p-2">
                            <div className="grid grid-cols-8 gap-0.5">
                              {QUICK_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => insertEmoji(emoji)}
                                  className="text-xl leading-none p-2 rounded-lg hover:bg-muted transition-colors"
                                  aria-label={`Insert ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleSend}
                        disabled={sending || !newMsg.trim()}
                        className="w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center disabled:opacity-40 shadow-lg transition-all bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-primary/30 disabled:shadow-none"
                        title="Send message"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </motion.button>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              The conversation will be removed from your list. The other person will still see it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Messages;
