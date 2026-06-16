import type { ParsedResume } from "@/lib/resumeParse";
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
  return cur.length < 50 && parsed.length > cur.length + 20;
}

function experienceKey(title: string, company: string): string {
  return `${title.toLowerCase().trim()}|${company.toLowerCase().trim()}`;
}

export function buildProfilePatchFromResume(
  profile: ProfileData,
  parsed: ParsedResume
): Partial<ProfileData> {
  const patch: Partial<ProfileData> = {};

  if (parsed.name && !profile.name.trim()) {
    patch.name = parsed.name;
  }
  if (parsed.bio && shouldFillBio(profile.bio, parsed.bio)) {
    patch.bio = parsed.bio;
  }
  if (parsed.city && parsed.country) {
    patch.city = parsed.city;
    patch.country = parsed.country;
  }

  return patch;
}

export function newSkillsFromResume(profile: ProfileData, parsed: ParsedResume): string[] {
  const existing = new Set(profile.skills.map((s) => s.name.toLowerCase().trim()));
  return parsed.skills.filter((skill) => {
    const key = skill.toLowerCase().trim();
    return key.length >= 2 && !existing.has(key);
  });
}

export function newExperiencesFromResume(
  experiences: Experience[],
  parsed: ParsedResume
): ParsedResume["experiences"] {
  const existing = new Set(experiences.map((e) => experienceKey(e.title, e.company)));
  return parsed.experiences.filter((exp) => !existing.has(experienceKey(exp.title, exp.company)));
}
