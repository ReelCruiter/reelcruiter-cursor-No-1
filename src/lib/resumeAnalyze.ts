import { supabase } from "@/integrations/supabase/client";
import type { ParsedResume } from "@/lib/resumeParse";
import { buildFallbackBio, inferSkillsFromResume } from "@/lib/resumeSkillInference";

export interface ResumeAiProfile {
  bio: string;
  skills: string[];
  source: "ai" | "fallback";
}

function normalizeAiSkills(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s.length >= 2 && s.length <= 40)
    .slice(0, 12);
}

export async function analyzeResumeWithAi(
  text: string,
  parsed: ParsedResume
): Promise<ResumeAiProfile> {
  const fallback = (): ResumeAiProfile => ({
    bio: buildFallbackBio(parsed),
    skills: inferSkillsFromResume(text, parsed),
    source: "fallback",
  });

  try {
    const { data, error } = await supabase.functions.invoke("analyze-resume", {
      body: {
        text: text.slice(0, 14000),
        hints: {
          name: parsed.name,
          city: parsed.city,
          country: parsed.country,
          experiences: parsed.experiences.slice(0, 10).map((e) => ({
            title: e.title,
            company: e.company,
            category: e.category,
          })),
        },
      },
    });

    if (error) return fallback();

    const payload = data as { bio?: string; skills?: unknown; error?: string } | null;
    if (!payload || payload.error) return fallback();

    const bio = typeof payload.bio === "string" ? payload.bio.trim().replace(/\s+/g, " ") : "";
    const skills = normalizeAiSkills(payload.skills);

    if (!bio || bio.length < 30) return fallback();

    return {
      bio: bio.slice(0, 1200),
      skills: skills.length > 0 ? skills : inferSkillsFromResume(text, parsed),
      source: "ai",
    };
  } catch {
    return fallback();
  }
}
