import { supabase } from "@/integrations/supabase/client";
import type { ParsedResume } from "@/lib/resumeParse";
import { buildFallbackBio, inferSkillsFromResume } from "@/lib/resumeSkillInference";
import {
  isAcceptableAiBio,
  sanitizeProfileSkills,
  toTitleCaseSkill,
} from "@/lib/resumeSkillFilter";

export interface ResumeAiProfile {
  bio: string;
  skills: string[];
  source: "ai" | "fallback";
}

function normalizeAiSkills(raw: unknown, cvText: string): string[] {
  if (!Array.isArray(raw)) return [];
  const rawSkills = raw
    .filter((item): item is string => typeof item === "string")
    .map((s) => toTitleCaseSkill(s.trim().replace(/\s+/g, " ")));
  return sanitizeProfileSkills(rawSkills, 8, cvText);
}

export async function analyzeResumeWithAi(
  text: string,
  parsed: ParsedResume
): Promise<ResumeAiProfile> {
  const cvText = text.slice(0, 14000);

  const fallback = (): ResumeAiProfile => ({
    bio: buildFallbackBio(parsed),
    skills: sanitizeProfileSkills(inferSkillsFromResume(cvText, parsed), 8, cvText),
    source: "fallback",
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

    if (error) return fallback();

    const payload = data as { bio?: string; skills?: unknown; error?: string } | null;
    if (!payload || payload.error) return fallback();

    const bio = typeof payload.bio === "string" ? payload.bio.trim().replace(/\s+/g, " ") : "";
    const skills = normalizeAiSkills(payload.skills, cvText);

    if (!isAcceptableAiBio(bio, cvText)) return fallback();
    if (skills.length < 4) return fallback();

    return {
      bio: bio.slice(0, 1200),
      skills,
      source: "ai",
    };
  } catch {
    return fallback();
  }
}
