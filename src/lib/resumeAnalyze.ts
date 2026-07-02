import { supabase } from "@/integrations/supabase/client";
import type { ParsedResume } from "@/lib/resumeParse";
import { inferSkillsFromResume } from "@/lib/resumeSkillInference";
import {
  isAcceptableAiBio,
  sanitizeProfileSkills,
  toTitleCaseSkill,
} from "@/lib/resumeSkillFilter";

export type ResumeAiErrorCode =
  | "quota"
  | "unconfigured"
  | "rejected"
  | "network"
  | "unknown";

export interface ResumeAiProfile {
  bio: string;
  skills: string[];
  source: "ai" | "fallback";
  errorCode?: ResumeAiErrorCode;
}

function normalizeAiSkills(raw: unknown, cvText: string): string[] {
  if (!Array.isArray(raw)) return [];
  const rawSkills = raw
    .filter((item): item is string => typeof item === "string")
    .map((s) => toTitleCaseSkill(s.trim().replace(/\s+/g, " ")));
  return sanitizeProfileSkills(rawSkills, 8, cvText);
}

function classifyAiError(message: string): ResumeAiErrorCode {
  const lower = message.toLowerCase();
  if (
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("rate_limit") ||
    lower.includes("insufficient") ||
    lower.includes("billing") ||
    lower.includes("credits") ||
    lower.includes("exceeded") ||
    lower.includes("429") ||
    lower.includes("402")
  ) {
    return "quota";
  }
  if (lower.includes("not configured") || lower.includes("503")) return "unconfigured";
  if (lower.includes("not acceptable") || lower.includes("too short") || lower.includes("invalid ai")) {
    return "rejected";
  }
  return "unknown";
}

export async function analyzeResumeWithAi(
  text: string,
  parsed: ParsedResume
): Promise<ResumeAiProfile> {
  const cvText = text.slice(0, 14000);

  const fallback = (errorCode: ResumeAiErrorCode): ResumeAiProfile => ({
    bio: "",
    skills: sanitizeProfileSkills(inferSkillsFromResume(cvText, parsed), 8, cvText),
    source: "fallback",
    errorCode,
  });

  try {
    const { data, error } = await supabase.functions.invoke("analyze-resume", {
      body: {
        text: cvText,
        hints: {
          name: parsed.name,
          city: parsed.city,
          country: parsed.country,
        },
      },
    });

    if (error) {
      return fallback(classifyAiError(error.message || ""));
    }

    const payload = data as { bio?: string; skills?: unknown; error?: string; code?: string } | null;
    if (!payload) return fallback("unknown");

    if (payload.error) {
      const code =
        payload.code === "provider_quota"
          ? "quota"
          : payload.code === "not_configured"
            ? "unconfigured"
            : classifyAiError(payload.error);
      return fallback(code);
    }

    const bio = typeof payload.bio === "string" ? payload.bio.trim().replace(/\s+/g, " ") : "";
    const skills = normalizeAiSkills(payload.skills, cvText);

    if (!isAcceptableAiBio(bio, cvText)) return fallback("rejected");
    if (skills.length < 3) return fallback("rejected");

    return {
      bio: bio.slice(0, 1200),
      skills,
      source: "ai",
    };
  } catch {
    return fallback("network");
  }
}

export function resumeAiErrorMessage(code?: ResumeAiErrorCode): string | null {
  switch (code) {
    case "quota":
      return "AI could not run — your Groq API may be out of free credits. Check console.groq.com, add billing, or create a new API key. About was not auto-filled.";
    case "unconfigured":
      return "AI is not configured on the server. About was not auto-filled.";
    case "rejected":
      return "AI could not produce a clean summary from this CV. Try again or write your About manually.";
    case "network":
      return "Could not reach the AI service. About was not auto-filled.";
    case "unknown":
      return "AI summary was unavailable. About was not auto-filled.";
    default:
      return null;
  }
}
