import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORT_TEAM_EMAIL = "reelcruiter@gmail.com";

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  inappropriate_content: "Inappropriate content",
  fake_job_scam: "Fake job or scam",
  other: "Other",
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  company_name: string | null;
  role: string | null;
  active_mode: string | null;
};

function displayName(profile: ProfileRow | undefined, fallbackEmail?: string | null) {
  if (!profile) {
    return fallbackEmail?.split("@")[0] || "Unknown user";
  }
  const hiring = profile.active_mode === "hiring" || profile.role === "employer";
  if (hiring && profile.company_name?.trim()) return profile.company_name.trim();
  if (profile.full_name?.trim()) return profile.full_name.trim();
  return fallbackEmail?.split("@")[0] || "Unknown user";
}

function profileUrl(origin: string, userId: string) {
  return `${origin.replace(/\/$/, "")}/user/${userId}`;
}

function formatUserSection(label: string, user: {
  name: string;
  email: string;
  userId: string;
  profileLink: string;
  accountType: string;
}) {
  return [
    label,
    `  Name: ${user.name}`,
    `  Email: ${user.email || "(none on account)"}`,
    `  User ID: ${user.userId}`,
    `  Account type: ${user.accountType}`,
    `  Profile: ${user.profileLink}`,
  ].join("\n");
}

async function sendSupportEmail(input: {
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return { sent: false, reason: "RESEND_API_KEY not configured" };
  }

  const from =
    Deno.env.get("SUPPORT_FROM_EMAIL") ?? "ReelCruiter Support <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [SUPPORT_TEAM_EMAIL],
      reply_to: input.replyTo || undefined,
      subject: input.subject,
      text: input.text,
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
    const type = body.type === "block" || body.type === "report" ? body.type : null;
    const otherUserId =
      typeof body.otherUserId === "string" ? body.otherUserId.trim() : "";

    if (!type || !otherUserId) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actorId = userData.user.id;
    if (otherUserId === actorId) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let reportReason: string | null = null;
    let reportDescription = "";

    if (type === "report") {
      reportReason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (!reportReason || !REASON_LABELS[reportReason]) {
        return new Response(JSON.stringify({ error: "Invalid report reason" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      reportDescription =
        typeof body.description === "string" ? body.description.trim() : "";
    }

    const origin =
      req.headers.get("origin")?.trim() ||
      Deno.env.get("SITE_URL")?.trim() ||
      "https://reelcruiter.com";

    const actorEmail = userData.user.email ?? "";
    let otherEmail = "";

    const profilesById = new Map<string, ProfileRow>();

    if (serviceRoleKey) {
      const admin = createClient(supabaseUrl, serviceRoleKey);
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, full_name, company_name, role, active_mode")
        .in("user_id", [actorId, otherUserId]);

      for (const row of profiles ?? []) {
        profilesById.set(row.user_id, row as ProfileRow);
      }

      const { data: otherAuth } = await admin.auth.admin.getUserById(otherUserId);
      otherEmail = otherAuth?.user?.email ?? "";
    } else {
      const { data: profiles } = await userClient
        .from("profiles")
        .select("user_id, full_name, company_name, role, active_mode")
        .in("user_id", [actorId, otherUserId]);

      for (const row of profiles ?? []) {
        profilesById.set(row.user_id, row as ProfileRow);
      }
    }

    const actorProfile = profilesById.get(actorId);
    const otherProfile = profilesById.get(otherUserId);

    const accountType = (p: ProfileRow | undefined) => {
      if (!p) return "Unknown";
      if (p.active_mode === "hiring" || p.role === "employer") return "Employer";
      return "Job seeker";
    };

    const actorInfo = {
      name: displayName(actorProfile, actorEmail),
      email: actorEmail,
      userId: actorId,
      profileLink: profileUrl(origin, actorId),
      accountType: accountType(actorProfile),
    };

    const otherInfo = {
      name: displayName(otherProfile, otherEmail),
      email: otherEmail,
      userId: otherUserId,
      profileLink: profileUrl(origin, otherUserId),
      accountType: accountType(otherProfile),
    };

    const timestamp = new Date().toISOString();

    let emailSubject: string;
    let emailText: string;

    if (type === "block") {
      emailSubject = "[ReelCruiter Safety] User blocked";
      emailText = [
        "ReelCruiter user block notification",
        "",
        formatUserSection("User who blocked:", actorInfo),
        "",
        formatUserSection("User who was blocked:", otherInfo),
        "",
        `Time (UTC): ${timestamp}`,
      ].join("\n");
    } else {
      emailSubject = `[ReelCruiter Safety] User report: ${REASON_LABELS[reportReason!]}`;
      emailText = [
        "ReelCruiter user report notification",
        "",
        formatUserSection("Reporter:", actorInfo),
        "",
        formatUserSection("Reported user:", otherInfo),
        "",
        `Reason: ${REASON_LABELS[reportReason!]}`,
        `Additional details: ${reportDescription || "(none provided)"}`,
        "",
        `Time (UTC): ${timestamp}`,
      ].join("\n");
    }

    const mail = await sendSupportEmail({
      subject: emailSubject,
      text: emailText,
      replyTo: actorEmail || undefined,
    });

    if (!mail.sent) {
      console.warn("Safety email not sent:", mail.reason);
      return new Response(
        JSON.stringify({
          success: false,
          emailSent: false,
          error: mail.reason || "Email could not be sent",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ success: true, emailSent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
