import { supabase } from "@/integrations/supabase/client";
import type { ParsedExperience, ParsedResume } from "@/lib/resumeParse";
import { inferCategory } from "@/lib/resumeParse";
import { buildFallbackBio, inferSkillsFromResume } from "@/lib/resumeSkillInference";

export interface ResumeAiProfile {
  bio: string;
  skills: string[];
  experiences: ParsedExperience[];
  source: "ai" | "fallback";
}

function normalizeAiSkills(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s.length >= 2 && s.length <= 40)
    .slice(0, 8);
}

function normalizeMonthYear(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) return `${yearOnly[1]}-01`;
  return null;
}

function normalizeAiExperiences(raw: unknown): ParsedExperience[] {
  if (!Array.isArray(raw)) return [];
  const out: ParsedExperience[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const title = typeof (item as { title?: unknown }).title === "string"
      ? (item as { title: string }).title.trim()
      : "";
    const company = typeof (item as { company?: unknown }).company === "string"
      ? (item as { company: string }).company.trim()
      : "";
    const startDate = normalizeMonthYear(
      typeof (item as { startDate?: unknown }).startDate === "string"
        ? (item as { startDate: string }).startDate
        : ""
    );
    const isCurrent = Boolean((item as { isCurrent?: unknown }).isCurrent);
    const endRaw = (item as { endDate?: unknown }).endDate;
    const endDate = isCurrent
      ? null
      : typeof endRaw === "string"
        ? normalizeMonthYear(endRaw)
        : null;

    if (!title || !company || !startDate) continue;
    const key = `${title.toLowerCase()}|${company.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      title: title.slice(0, 120),
      company: company.slice(0, 120),
      startDate,
      endDate,
      isCurrent,
      category: inferCategory(title, company),
    });
    if (out.length >= 8) break;
  }

  return out;
}

export async function analyzeResumeWithAi(
  text: string,
  parsed: ParsedResume
): Promise<ResumeAiProfile> {
  const fallback = (): ResumeAiProfile => ({
    bio: buildFallbackBio(parsed),
    skills: inferSkillsFromResume(text, parsed).slice(0, 8),
    experiences: parsed.experiences,
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

    const payload = data as {
      bio?: string;
      skills?: unknown;
      experiences?: unknown;
      error?: string;
    } | null;
    if (!payload || payload.error) return fallback();

    const bio = typeof payload.bio === "string" ? payload.bio.trim().replace(/\s+/g, " ") : "";
    const skills = normalizeAiSkills(payload.skills);
    const experiences = normalizeAiExperiences(payload.experiences);

    if (!bio || bio.length < 30) return fallback();

    return {
      bio: bio.slice(0, 1200),
      skills: skills.length > 0 ? skills : inferSkillsFromResume(text, parsed).slice(0, 8),
      experiences: experiences.length > 0 ? experiences : parsed.experiences,
      source: "ai",
    };
  } catch {
    return fallback();
  }
}
