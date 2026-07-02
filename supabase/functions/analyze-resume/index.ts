import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You help build job seeker profiles on a hiring platform.

Given the full text of a candidate's CV, produce:
1. A professional "About" summary of 50–100 words. Write in clear, recruiter-friendly English (first or third person). Synthesize their experience, strengths, and career focus from the ENTIRE document. Do NOT copy contact details, addresses, phone numbers, or email addresses. Do NOT paste poorly formatted or fragmented text. Do NOT quote generic objective statements unless you rewrite them substantially.
2. Up to 12 strongest skills inferred from the ENTIRE CV, including soft skills and role-based competencies even when they are not listed in a Skills section (for example, restaurant management implies Leadership, Customer Service, Operations Management).

Return JSON only with this shape:
{"bio":"...","skills":["Skill One","Skill Two"]}`;

type ExperienceHint = {
  title?: string;
  company?: string;
  category?: string;
};

function sanitizeSkills(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const skill = item.trim().replace(/\s+/g, " ");
    if (skill.length < 2 || skill.length > 40) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
    if (out.length >= 12) break;
  }
  return out;
}

function sanitizeBio(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/\s+/g, " ").slice(0, 1200);
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

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      return new Response(JSON.stringify({ error: "AI analysis is not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text || text.length < 40) {
      return new Response(JSON.stringify({ error: "Resume text is too short" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hints = body?.hints && typeof body.hints === "object" ? body.hints : {};
    const name = typeof hints.name === "string" ? hints.name.trim() : "";
    const experiences = Array.isArray(hints.experiences)
      ? (hints.experiences as ExperienceHint[]).slice(0, 10)
      : [];

    const experienceLines = experiences
      .map((exp) => {
        const title = typeof exp?.title === "string" ? exp.title.trim() : "";
        const company = typeof exp?.company === "string" ? exp.company.trim() : "";
        const category = typeof exp?.category === "string" ? exp.category.trim() : "";
        if (!title && !company) return "";
        return [title, company ? `at ${company}` : "", category ? `(${category})` : ""]
          .filter(Boolean)
          .join(" ");
      })
      .filter(Boolean);

    const userContent = [
      name ? `Candidate name (for context only, do not list contact details): ${name}` : "",
      experienceLines.length ? `Parsed work history hints:\n${experienceLines.join("\n")}` : "",
      "",
      "Full CV text:",
      text.slice(0, 14000),
    ]
      .filter(Boolean)
      .join("\n");

    const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 700,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return new Response(
        JSON.stringify({ error: errBody || `OpenAI HTTP ${res.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const completion = await res.json();
    const content = completion?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: { bio?: unknown; skills?: unknown };
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid AI response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bio = sanitizeBio(parsed.bio);
    const skills = sanitizeSkills(parsed.skills);

    if (!bio || bio.length < 30) {
      return new Response(JSON.stringify({ error: "AI bio was too short" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ bio, skills }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
