import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert recruiter writing polished job seeker profiles.

Your job is to READ AND ANALYZE the ENTIRE CV (every section: work history, education, skills, achievements, responsibilities) and then WRITE NEW CONTENT. You must interpret the candidate's background — never copy, paste, or lightly edit text from the CV.

Rules:
- Read the full CV before writing anything.
- Synthesize what the candidate has done, what they are good at, and what roles they fit.
- Do NOT copy sentences, bullet points, headers, contact details, addresses, emails, phone numbers, or generic objective statements from the CV.
- If the CV has a weak generic objective, ignore it and write a stronger summary based on the rest of the document.

Output ONLY valid JSON with:

1. "bio": A brand-new professional About summary of 50–100 words (4–6 sentences). Recruiter-friendly English. Prefer third person or the candidate's first name once. Highlight experience level, industries, strengths, and value to employers. Must be original prose.

2. "skills": Six to eight INFERRED professional competencies (Title Case). Derive these from the WHOLE CV — including duties and roles even when not listed under a Skills heading. Examples: Customer Service, Team Leadership, Operations Management, Communication, Problem Solving. Never use years, dates, numbers, company names, cities, job titles, months, or CV section labels.

Bad skills (never output): "2022", "Work History", "Restaurant Manager at Bistro"
Good skills: "Customer Service", "Team Leadership", "Operations Management"

{"bio":"...","skills":["Customer Service","Team Leadership"]}`;

const MONTH_NAMES =
  /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)$/i;

function isValidProfileSkill(skill: string): boolean {
  const s = skill.trim().replace(/\s+/g, " ");
  if (s.length < 3 || s.length > 40) return false;
  if (!/[a-zA-Z]/.test(s)) return false;
  if (/^\d+$/.test(s) || /^\d{4}$/.test(s)) return false;
  if (/^\d{1,2}[\/\-.]\d{2,4}$/.test(s) || /^\d{4}-\d{2}$/.test(s)) return false;
  if (MONTH_NAMES.test(s)) return false;
  if (/@|https?:|mailto:|tel:/i.test(s)) return false;
  if (/\+\d{5,}|\(\d{3}\)/.test(s)) return false;
  if (/^(skills?|experience|work history|education|summary|profile|contact)$/i.test(s)) {
    return false;
  }
  const digits = (s.match(/\d/g) || []).length;
  if (digits > 0 && digits / s.length > 0.25) return false;
  return true;
}

function sanitizeSkills(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const skill = item.trim().replace(/\s+/g, " ");
    if (!isValidProfileSkill(skill)) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
    if (out.length >= 8) break;
  }
  return out;
}

function isGarbledBio(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  const words = trimmed.split(/\s+/);
  const singleChars = words.filter((w) => w.length === 1).length;
  if (words.length > 8 && singleChars / words.length > 0.35) return true;
  if (/@|mailto:|tel:|mobile\s*:|\+\d{6,}/i.test(trimmed)) return true;
  return false;
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bioLooksCopiedFromCv(bio: string, cvText: string): boolean {
  const bioNorm = normalizeForCompare(bio);
  const cvNorm = normalizeForCompare(cvText);
  if (!bioNorm || !cvNorm) return false;

  const bioWords = bioNorm.split(/\s+/).filter(Boolean);
  for (let size = 8; size >= 5; size--) {
    for (let i = 0; i <= bioWords.length - size; i++) {
      const phrase = bioWords.slice(i, i + size).join(" ");
      if (phrase.length >= 28 && cvNorm.includes(phrase)) return true;
    }
  }

  return false;
}

function sanitizeBio(raw: unknown, cvText: string): string {
  if (typeof raw !== "string") return "";
  const bio = raw.trim().replace(/\s+/g, " ").slice(0, 1200);
  if (isGarbledBio(bio)) return "";
  const words = bio.split(/\s+/).filter(Boolean);
  if (words.length < 35 || words.length > 130) return "";
  if (bioLooksCopiedFromCv(bio, cvText)) return "";
  return bio;
}

type AiConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  providerLabel: string;
};

function getAiConfig(): AiConfig | null {
  const provider = (Deno.env.get("AI_PROVIDER") ?? "").trim().toLowerCase();

  if (provider === "groq") {
    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) return null;
    return {
      apiKey,
      baseUrl: "https://api.groq.com/openai/v1",
      model: Deno.env.get("GROQ_MODEL") ?? Deno.env.get("AI_MODEL") ?? "llama-3.3-70b-versatile",
      providerLabel: "Groq",
    };
  }

  if (provider === "openai" || provider === "chatgpt") {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return null;
    return {
      apiKey,
      baseUrl: "https://api.openai.com/v1",
      model: Deno.env.get("OPENAI_MODEL") ?? Deno.env.get("AI_MODEL") ?? "gpt-4o-mini",
      providerLabel: "OpenAI",
    };
  }

  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    return {
      apiKey: groqKey,
      baseUrl: "https://api.groq.com/openai/v1",
      model: Deno.env.get("GROQ_MODEL") ?? Deno.env.get("AI_MODEL") ?? "llama-3.3-70b-versatile",
      providerLabel: "Groq",
    };
  }

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (openAiKey) {
    return {
      apiKey: openAiKey,
      baseUrl: "https://api.openai.com/v1",
      model: Deno.env.get("OPENAI_MODEL") ?? Deno.env.get("AI_MODEL") ?? "gpt-4o-mini",
      providerLabel: "OpenAI",
    };
  }

  return null;
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

    const ai = getAiConfig();
    if (!ai) {
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

    const userContent = [
      "Read the entire CV below from start to finish before responding.",
      "Analyze all sections, then write a NEW About summary and NEW inferred skills.",
      "Do not copy text from the CV.",
      name ? `Candidate name (context only — do not list contact details): ${name}` : "",
      "",
      "=== FULL CV TEXT ===",
      text.slice(0, 14000),
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch(`${ai.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ai.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 700,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return new Response(
        JSON.stringify({ error: errBody || `${ai.providerLabel} HTTP ${res.status}` }),
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

    const bio = sanitizeBio(parsed.bio, text);
    const skills = sanitizeSkills(parsed.skills);

    if (!bio) {
      return new Response(JSON.stringify({ error: "AI bio was not acceptable" }), {
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
