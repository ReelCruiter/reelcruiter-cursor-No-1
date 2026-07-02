import { supabase } from "@/integrations/supabase/client";
import type { ParsedResume } from "@/lib/resumeParse";
import { buildFallbackBio, inferSkillsFromResume } from "@/lib/resumeSkillInference";
import {
  isAcceptableAiBio,
  isAcceptableFallbackBio,
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

  const fallback = (errorCode: ResumeAiErrorCode): ResumeAiProfile => {
    const candidateBio = buildFallbackBio(parsed).trim();
    const bio = isAcceptableFallbackBio(candidateBio) ? candidateBio.slice(0, 1200) : "";
    const skills = sanitizeProfileSkills(inferSkillsFromResume(cvText, parsed), 8, cvText);

    return {
      bio,
      skills,
      source: "fallback",
      errorCode,
    };
  };

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

export function resumeAiErrorMessage(
  code?: ResumeAiErrorCode,
  bioFilled = true
): string | null {
  if (!code) return null;

  if (!bioFilled) {
    switch (code) {
      case "quota":
        return "AI summary was unavailable (API credits). Add your About manually in Edit Profile.";
      case "unconfigured":
        return "AI is not configured. Add your About manually in Edit Profile.";
      case "rejected":
        return "AI could not produce a clean summary from this CV. Write your About in Edit Profile.";
      case "network":
        return "Could not reach the AI service. Add your About manually in Edit Profile.";
      case "unknown":
        return "AI summary was unavailable. Add your About manually in Edit Profile.";
      default:
        return null;
    }
  }

  switch (code) {
    case "quota":
      return "AI summary was unavailable (API credits). We wrote a professional About from your CV instead — you can edit it anytime.";
    case "unconfigured":
      return "AI is not configured. We wrote a professional About from your CV instead — you can edit it anytime.";
    case "rejected":
      return "AI could not produce a clean summary. We used a basic About from your CV — refine it in Edit Profile if needed.";
    case "network":
      return "Could not reach the AI service. We wrote a professional About from your CV instead.";
    case "unknown":
      return "AI summary was unavailable. We wrote a professional About from your CV instead.";
    default:
      return null;
  }
}
