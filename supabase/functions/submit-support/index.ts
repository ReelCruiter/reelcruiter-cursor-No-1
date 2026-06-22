import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORT_TEAM_EMAIL = Deno.env.get("SUPPORT_TEAM_EMAIL") ?? "reelcruiter@gmail.com";
const SUPPORT_BUCKET = "support-attachments";
const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7;

type AttachmentInput = {
  path: string;
  name: string;
  contentType: string;
};

function parseAttachments(raw: unknown): AttachmentInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const path = typeof (item as AttachmentInput).path === "string"
        ? (item as AttachmentInput).path.trim()
        : "";
      const name = typeof (item as AttachmentInput).name === "string"
        ? (item as AttachmentInput).name.trim()
        : "attachment";
      const contentType = typeof (item as AttachmentInput).contentType === "string"
        ? (item as AttachmentInput).contentType.trim()
        : "application/octet-stream";
      if (!path) return null;
      return { path, name, contentType };
    })
    .filter((item): item is AttachmentInput => item !== null)
    .slice(0, 5);
}

async function notifySupportInbox(payload: {
  userEmail: string;
  userId: string;
  subject: string;
  message: string;
  attachmentLines: string[];
}): Promise<{ sent: boolean; reason?: string }> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  const from =
    Deno.env.get("SUPPORT_FROM_EMAIL") ?? "ReelCruiter Support <onboarding@resend.dev>";

  const lines = [
    "New ReelCruiter support message",
    "",
    `From: ${payload.userEmail || "(no email on account)"}`,
    `User ID: ${payload.userId}`,
    `Subject: ${payload.subject}`,
    "",
    payload.message || "(no message text)",
  ];

  if (payload.attachmentLines.length > 0) {
    lines.push("", "Attachments:");
    lines.push(...payload.attachmentLines);
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [SUPPORT_TEAM_EMAIL],
      reply_to: payload.userEmail || undefined,
      subject: `[ReelCruiter Support] ${payload.subject}`,
      text: lines.join("\n"),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { sent: false, reason: body || `Resend HTTP ${res.status}` };
  }

  return { sent: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const attachments = parseAttachments(body.attachments);

    if (!subject) {
      return new Response(JSON.stringify({ error: "Subject is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!message && attachments.length === 0) {
      return new Response(JSON.stringify({ error: "Message or attachment is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (subject.length > 120 || message.length > 2000) {
      return new Response(JSON.stringify({ error: "Message is too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;
    const userEmail = user.email ?? "";

    for (const attachment of attachments) {
      if (!attachment.path.startsWith(`${user.id}/`)) {
        return new Response(JSON.stringify({ error: "Invalid attachment" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const attachmentLines: string[] = [];
    if (attachments.length > 0 && serviceRoleKey) {
      const admin = createClient(supabaseUrl, serviceRoleKey);
      for (const [index, attachment] of attachments.entries()) {
        const { data, error } = await admin.storage
          .from(SUPPORT_BUCKET)
          .createSignedUrl(attachment.path, SIGNED_URL_TTL_SEC);
        if (error || !data?.signedUrl) {
          attachmentLines.push(`${index + 1}. ${attachment.name} (link unavailable)`);
        } else {
          attachmentLines.push(`${index + 1}. ${attachment.name}: ${data.signedUrl}`);
        }
      }
    } else if (attachments.length > 0) {
      attachments.forEach((attachment, index) => {
        attachmentLines.push(`${index + 1}. ${attachment.name} (stored in support-attachments/${attachment.path})`);
      });
    }

    const { error: insertError } = await userClient.from("support_messages").insert({
      user_id: user.id,
      email: userEmail,
      subject,
      message: message || "(attachments only)",
      attachments,
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mail = await notifySupportInbox({
      userEmail,
      userId: user.id,
      subject,
      message,
      attachmentLines,
    });

    if (!mail.sent) {
      console.warn("Support email not sent:", mail.reason);
    }

    return new Response(JSON.stringify({ success: true, emailSent: mail.sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
