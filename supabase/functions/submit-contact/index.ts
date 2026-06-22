import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INBOX_EMAIL = Deno.env.get("SUPPORT_TEAM_EMAIL") ?? "reelcruiter@gmail.com";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendContactEmail(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
  userId?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  const from =
    Deno.env.get("SUPPORT_FROM_EMAIL") ?? "ReelCruiter <onboarding@resend.dev>";

  const lines = [
    "New ReelCruiter contact form message",
    "",
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    payload.userId ? `User ID: ${payload.userId}` : "User ID: (not signed in)",
    `Subject: ${payload.subject}`,
    "",
    payload.message,
  ];

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [INBOX_EMAIL],
      reply_to: payload.email,
      subject: `[ReelCruiter Contact] ${payload.subject}`,
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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Honeypot — bots fill hidden fields; pretend success.
    if (typeof body.website === "string" && body.website.trim()) {
      return new Response(JSON.stringify({ success: true, emailSent: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name || name.length > 80) {
      return new Response(JSON.stringify({ error: "Please enter your name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || !isValidEmail(email) || email.length > 200) {
      return new Response(JSON.stringify({ error: "Please enter a valid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!subject || subject.length > 120) {
      return new Response(JSON.stringify({ error: "Please enter a subject" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!message || message.length > 2000) {
      return new Response(JSON.stringify({ error: "Please enter your message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string | undefined;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonKey =
        Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      userId = userData.user?.id;
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { error: insertError } = await admin.from("contact_inquiries").insert({
      name,
      email,
      subject,
      message,
      user_id: userId ?? null,
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: "Could not save your message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mail = await sendContactEmail({ name, email, subject, message, userId });
    if (!mail.sent) {
      console.warn("Contact email not sent:", mail.reason);
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
