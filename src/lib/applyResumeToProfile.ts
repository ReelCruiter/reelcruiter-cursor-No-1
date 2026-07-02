import type { ParsedResume } from "@/lib/resumeParse";
import { isGarbledBio } from "@/lib/resumeParse";
import type { ProfileData } from "@/lib/profileStore";
import type { Experience } from "@/lib/models";

export interface ApplyResumeResult {
  bio: boolean;
  name: boolean;
  location: boolean;
  skills: number;
  experiences: number;
}

function shouldFillBio(current: string, parsed: string): boolean {
  const cur = current.trim();
  if (!cur) return true;
  if (isGarbledBio(cur)) return true;
  return cur.length < 50 && parsed.length > cur.length + 20;
}

export function shouldApplyAiBio(current: string, aiBio: string): boolean {
  const next = aiBio.trim();
  if (!next) return false;
  const cur = current.trim();
  if (!cur) return true;
  if (isGarbledBio(cur)) return true;
  if (cur.length < 80) return true;
  return false;
}

function experienceKey(title: string, company: string): string {
  return `${title.toLowerCase().trim()}|${company.toLowerCase().trim()}`;
}

export function buildProfilePatchFromResume(
  profile: ProfileData,
  parsed: ParsedResume,
  options?: { aiBio?: string }
): Partial<ProfileData> {
  const patch: Partial<ProfileData> = {};

  if (parsed.name && !profile.name.trim()) {
    patch.name = parsed.name;
  }
  if (options?.aiBio && shouldApplyAiBio(profile.bio, options.aiBio)) {
    patch.bio = options.aiBio.slice(0, 1200);
  } else if (parsed.bio && shouldFillBio(profile.bio, parsed.bio)) {
    patch.bio = parsed.bio;
  }
  if (parsed.city && parsed.country) {
    patch.city = parsed.city;
    patch.country = parsed.country;
  }

  return patch;
}

export function newSkillsToAdd(profile: ProfileData, skills: string[]): string[] {
  const existing = new Set(profile.skills.map((s) => s.name.toLowerCase().trim()));
  const seen = new Set<string>();
  const out: string[] = [];

  for (const skill of skills) {
    const trimmed = skill.trim();
    const key = trimmed.toLowerCase();
    if (trimmed.length < 2 || trimmed.length > 40) continue;
    if (existing.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= 15) break;
  }

  return out;
}

export function newSkillsFromResume(profile: ProfileData, parsed: ParsedResume): string[] {
  return newSkillsToAdd(profile, parsed.skills);
}

export function newExperiencesFromResume(
  experiences: Experience[],
  parsed: ParsedResume
): ParsedResume["experiences"] {
  const existing = new Set(experiences.map((e) => experienceKey(e.title, e.company)));
  return parsed.experiences.filter((exp) => !existing.has(experienceKey(exp.title, exp.company)));
}
