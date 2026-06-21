import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
  created_at: string;
};

function emailCopy(
  type: NotificationRow["type"],
  actorName: string,
  jobTitle: string | null,
  preview: string | null,
) {
  switch (type) {
    case "message":
      return {
        subject: `${actorName} sent you a message on ReelCruiter`,
        body: [
          `${actorName} sent you a message on ReelCruiter.`,
          preview ? `Preview: "${preview}"` : "",
          "",
          `Open your inbox: ${SITE_URL}/messages`,
        ].filter(Boolean).join("\n"),
      };
    case "application":
      return {
        subject: `${actorName} applied to your job on ReelCruiter`,
        body: [
          `${actorName} applied to your job${jobTitle ? `: ${jobTitle}` : ""}.`,
          preview ? `Note: "${preview}"` : "",
          "",
          `Review applications: ${SITE_URL}/my-jobs`,
        ].filter(Boolean).join("\n"),
      };
    case "follow":
      return {
        subject: `${actorName} started following you on ReelCruiter`,
        body: [
          `${actorName} started following you on ReelCruiter.`,
          "",
          `View their profile: ${SITE_URL}/user/${row.actor_id}`,
        ].join("\n"),
      };
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { data: outbox } = await admin
      .from("notification_email_outbox")
      .select("notification_id, sent_at")
      .eq("notification_id", notificationId)
      .maybeSingle();

    if (!outbox) {
      return new Response(JSON.stringify({ skipped: true, reason: "not in outbox" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (outbox.sent_at) {
      return new Response(JSON.stringify({ skipped: true, reason: "already sent" }), {
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
    if (!["message", "application", "follow"].includes(row.type)) {
      return new Response(JSON.stringify({ skipped: true, reason: "type not emailable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("email_notifications_enabled, full_name, company_name, active_mode")
      .eq("user_id", row.recipient_id)
      .maybeSingle();

    if (profile?.email_notifications_enabled === false) {
      await admin
        .from("notification_email_outbox")
        .update({ sent_at: new Date().toISOString(), last_error: "disabled by user" })
        .eq("notification_id", notificationId);
      return new Response(JSON.stringify({ skipped: true, reason: "user opted out" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: recipientAuth } = await admin.auth.admin.getUserById(row.recipient_id);
    const recipientEmail = recipientAuth?.user?.email;
    if (!recipientEmail) {
      await admin
        .from("notification_email_outbox")
        .update({ last_error: "no email on account" })
        .eq("notification_id", notificationId);
      return new Response(JSON.stringify({ skipped: true, reason: "no recipient email" }), {
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
      (actorHiring ? actorProfile?.company_name : actorProfile?.full_name)?.trim() ||
      recipientEmail.split("@")[0] ||
      "Someone";

    let jobTitle: string | null = null;
    if (row.post_id) {
      const { data: post } = await admin
        .from("posts")
        .select("job_title")
        .eq("id", row.post_id)
        .maybeSingle();
      jobTitle = post?.job_title?.trim() || null;
    }

    const copy = emailCopy(row.type, actorName, jobTitle, row.message);
    if (!copy) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      await admin
        .from("notification_email_outbox")
        .update({ last_error: "RESEND_API_KEY not configured" })
        .eq("notification_id", notificationId);
      return new Response(JSON.stringify({ sent: false, reason: "RESEND_API_KEY missing" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const from =
      Deno.env.get("SUPPORT_FROM_EMAIL") ?? "ReelCruiter <onboarding@resend.dev>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipientEmail],
        subject: copy.subject,
        text: copy.body,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      await admin
        .from("notification_email_outbox")
        .update({ last_error: errText || `HTTP ${res.status}` })
        .eq("notification_id", notificationId);
      return new Response(JSON.stringify({ sent: false, error: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("notification_email_outbox")
      .update({ sent_at: new Date().toISOString(), last_error: null })
      .eq("notification_id", notificationId);

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
