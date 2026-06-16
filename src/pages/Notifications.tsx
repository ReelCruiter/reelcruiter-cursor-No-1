import Layout from "@/components/Layout";
import { awaitCurrentUserId } from "@/lib/authCache";
import UserAvatar from "@/components/UserAvatar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, UserPlus, Heart, MessageCircle, MessageSquare, Loader2, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";

type NotificationType = "follow" | "message" | "like" | "comment" | "application";

interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  post_id: string | null;
  message: string | null;
  read: boolean;
  created_at: string;
  role_context: "hiring" | "job_seeker";
}

interface ActorProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface JobSummary {
  id: string;
  job_title: string | null;
}

const iconFor = (type: NotificationType) => {
  switch (type) {
    case "follow": return UserPlus;
    case "message": return MessageSquare;
    case "like": return Heart;
    case "comment": return MessageCircle;
    case "application": return Briefcase;
  }
};

const labelFor = (type: NotificationType, name: string) => {
  switch (type) {
    case "follow": return `${name} started following you`;
    case "message": return `${name} sent you a message`;
    case "like": return `${name} liked your post`;
    case "comment": return `${name} commented on your post`;
    case "application": return `${name} applied to your job`;
  }
};

const linkFor = (n: NotificationRow) => {
  if (n.type === "message") return "/messages";
  if (n.type === "application") return n.post_id ? `/my-jobs/${n.post_id}/applications` : "/my-jobs";
  if (n.post_id && (n.type === "like" || n.type === "comment")) return `/post/${n.post_id}`;
  return `/user/${n.actor_id}`;
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const Notifications = () => {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [actors, setActors] = useState<Record<string, ActorProfile>>({});
  const [jobs, setJobs] = useState<Record<string, JobSummary>>({});
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const uid = await awaitCurrentUserId();
    setUserId(uid);
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", uid)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as NotificationRow[];
    setItems(rows);

    const actorIds = Array.from(new Set(rows.map((r) => r.actor_id)));
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", actorIds);
      const map: Record<string, ActorProfile> = {};
      (profiles ?? []).forEach((p) => { map[p.user_id] = p; });
      setActors(map);
    }

    const postIds = Array.from(
      new Set(rows.map((r) => r.post_id).filter((id): id is string => !!id))
    );
    if (postIds.length > 0) {
      const { data: postRows } = await supabase
        .from("posts")
        .select("id, job_title")
        .in("id", postIds);
      const jmap: Record<string, JobSummary> = {};
      (postRows ?? []).forEach((p) => { jmap[p.id] = p as JobSummary; });
      setJobs(jmap);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Realtime: prepend new notifications
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("notifications-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        async (payload) => {
          const row = payload.new as NotificationRow;
          setItems((prev) => [row, ...prev]);
          if (!actors[row.actor_id]) {
            const { data } = await supabase
              .from("profiles")
              .select("user_id, full_name, avatar_url")
              .eq("user_id", row.actor_id)
              .maybeSingle();
            if (data) setActors((a) => ({ ...a, [row.actor_id]: data }));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, actors]);

  const markNotificationRead = (notificationId: string) => {
    setItems((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
    supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("read", false)
      .then(({ error }) => {
        if (error) {
          console.error(error);
          setItems((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: false } : n)));
        }
      });
  };

  // Notifications tab excludes messages (handled in Messages tab).
  // All other activity (follows, likes, comments, applications) is shown together,
  // so the unread badge always matches the list count.
  const visible = items.filter((n) => n.type !== "message");
  const unread = visible.filter((n) => !n.read).length;

  return (
    <Layout>
      <div className="container py-8 max-w-2xl">
        <div className="mb-6">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-2">
              <Bell className="w-7 h-7" /> Notifications
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {unread > 0 ? `${unread} unread` : "You're all caught up"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl card-shadow">
            <Bell className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No new activity yet.</p>
          </div>
        ) : (
          <ul className="bg-card rounded-xl card-shadow overflow-hidden divide-y divide-border">
            {visible.map((n) => {
              const Icon = iconFor(n.type);
              const actor = actors[n.actor_id];
              const name = actor?.full_name || "Someone";
              const job = n.post_id ? jobs[n.post_id] : undefined;
              const jobTitle = job?.job_title?.trim() || null;
              // Avoid showing the same string twice (e.g. "Applied to your job"
              // already in the headline). Prefer job title on the second line.
              const headline = labelFor(n.type, name);
              let secondary: string | null = null;
              if (n.type === "application") {
                secondary = jobTitle ? `Job: ${jobTitle}` : null;
              } else if (n.type === "comment" && n.message) {
                secondary = `"${n.message}"`;
              } else if (n.message && n.message.trim() && n.message.trim() !== headline) {
                secondary = n.message;
              }
              return (
                <li key={n.id}>
                  <Link
                    to={linkFor(n)}
                    onClick={() => {
                      if (!n.read) markNotificationRead(n.id);
                    }}
                    className={`flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors ${
                      n.read ? "" : "bg-primary/5"
                    }`}
                  >
                    <div className="relative">
                      <UserAvatar src={actor?.avatar_url} name={name} className="w-11 h-11" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center">
                        <Icon className="w-3 h-3 text-primary" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-card-foreground">
                        <span className="font-semibold">{name}</span>{" "}
                        <span className="text-muted-foreground">
                          {headline.replace(name, "").trim()}
                        </span>
                      </p>
                      {secondary && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{secondary}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Layout>
  );
};

export default Notifications;
