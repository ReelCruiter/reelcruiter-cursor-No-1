import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://reelcruiter.com";

type NotificationRow = {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: "follow" | "message" | "like" | "comment" | "application";
  post_id: string | null;
  message: string | null;
};

function absoluteUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${SITE_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function pushCopy(
  type: NotificationRow["type"],
  actorName: string,
  preview: string | null,
) {
  switch (type) {
    case "message":
      return {
        title: "New message",
        body: preview ? `${actorName}: ${preview}` : `${actorName} sent you a message`,
        url: "/messages",
      };
    case "application":
      return {
        title: "New job application",
        body: preview ? `${actorName} applied — ${preview}` : `${actorName} applied to your job`,
        url: "/my-jobs",
      };
    case "follow":
      return {
        title: "New follower",
        body: `${actorName} started following you`,
        url: `/user/${actorName}`,
      };
    case "like":
      return {
        title: "New like",
        body: `${actorName} liked your post`,
        url: "/notifications",
      };
    case "comment":
      return {
        title: "New comment",
        body: preview ? `${actorName}: ${preview}` : `${actorName} commented on your post`,
        url: "/notifications",
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!publicKey || !privateKey) {
      return new Response(JSON.stringify({ sent: false, reason: "VAPID keys not configured" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    webpush.setVapidDetails("mailto:reelcruiter@gmail.com", publicKey, privateKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const notificationId =
      typeof body.notification_id === "string" ? body.notification_id.trim() : "";

    if (!notificationId) {
      return new Response(JSON.stringify({ error: "notification_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: notification, error: notifError } = await admin
      .from("notifications")
      .select("id, recipient_id, actor_id, type, post_id, message, created_at")
      .eq("id", notificationId)
      .maybeSingle();

    if (notifError || !notification) {
      return new Response(JSON.stringify({ error: "Notification not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const row = notification as NotificationRow;

    const { data: profile } = await admin
      .from("profiles")
      .select("push_notifications_enabled, full_name, company_name, active_mode")
      .eq("user_id", row.recipient_id)
      .maybeSingle();

    if (profile?.push_notifications_enabled === false) {
      return new Response(JSON.stringify({ skipped: true, reason: "user opted out" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", row.recipient_id);

    if (!subs?.length) {
      return new Response(JSON.stringify({ skipped: true, reason: "no subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: actorProfile } = await admin
      .from("profiles")
      .select("full_name, company_name, active_mode")
      .eq("user_id", row.actor_id)
      .maybeSingle();

    const actorHiring = actorProfile?.active_mode === "hiring";
    const actorName =
      (actorHiring ? actorProfile?.company_name : actorProfile?.full_name)?.trim() || "Someone";

    let url = "/notifications";
    if (row.type === "message") url = "/messages";
    else if (row.type === "application") {
      url = row.post_id ? `/my-jobs/${row.post_id}/applications` : "/my-jobs";
    } else if ((row.type === "like" || row.type === "comment") && row.post_id) {
      url = `/post/${row.post_id}`;
    } else if (row.type === "follow") {
      url = `/user/${row.actor_id}`;
    }

    const copy = pushCopy(row.type, actorName, row.message);
    const payload = JSON.stringify({
      title: copy.title,
      body: copy.body,
      url: absoluteUrl(url),
      tag: row.id,
    });

    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    return new Response(JSON.stringify({ sent, total: subs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
