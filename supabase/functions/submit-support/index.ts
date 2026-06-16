import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORT_TEAM_EMAIL = "reelcruiter@gmail.com";

async function notifySupportInbox(payload: {
  userEmail: string;
  userId: string;
  subject: string;
  message: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  const from =
    Deno.env.get("SUPPORT_FROM_EMAIL") ?? "ReelCruiter Support <onboarding@resend.dev>";

  const text = [
    "New ReelCruiter support message",
    "",
    `From: ${payload.userEmail || "(no email on account)"}`,
    `User ID: ${payload.userId}`,
    `Subject: ${payload.subject}`,
    "",
    payload.message,
  ].join("\n");

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
      text,
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

    if (!subject || !message) {
      return new Response(JSON.stringify({ error: "Subject and message are required" }), {
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

    const { error: insertError } = await userClient.from("support_messages").insert({
      user_id: user.id,
      email: userEmail,
      subject,
      message,
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
