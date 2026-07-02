import { isGarbledBio } from "@/lib/resumeParse";

const MONTH_NAMES =
  /^(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)$/i;

const SECTION_HEADER =
  /^(skills?|experience|work history|education|summary|profile|contact|references?|certifications?)$/i;

export function isValidProfileSkill(skill: string): boolean {
  const s = skill.trim().replace(/\s+/g, " ");
  if (s.length < 3 || s.length > 40) return false;
  if (!/[a-zA-Z]/.test(s)) return false;
  if (/^\d+$/.test(s)) return false;
  if (/^\d{4}$/.test(s)) return false;
  if (/^\d{1,2}[\/\-.]\d{2,4}$/.test(s)) return false;
  if (/^\d{4}-\d{2}$/.test(s)) return false;
  if (MONTH_NAMES.test(s)) return false;
  if (/@|https?:|www\.|mailto:|tel:/i.test(s)) return false;
  if (/\+\d{5,}|\(\d{3}\)/.test(s)) return false;
  if (SECTION_HEADER.test(s)) return false;
  if (/^(present|current|now|remote|hybrid|onsite|full[\s-]?time|part[\s-]?time)$/i.test(s)) {
    return false;
  }

  const digits = (s.match(/\d/g) || []).length;
  if (digits > 0 && digits / s.length > 0.25) return false;

  const words = s.split(/\s+/);
  if (words.every((w) => /^\d+$/.test(w) || MONTH_NAMES.test(w))) return false;

  return true;
}

/** Profile About should read as the candidate speaking (I/my), not a recruiter describing them. */
export function bioUsesFirstPerson(bio: string): boolean {
  return /\b(I'm|I am|I have|I bring|I've|My |me,|me\.|me to)\b/i.test(bio.trim());
}

export function bioUsesThirdPerson(bio: string): boolean {
  const t = bio.trim();
  if (/\b(he|she|they) (is|has|was|brings)\b/i.test(t)) return true;
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(is|has|brings|was)\s/i.test(t)) return true;
  return false;
}

/** Rule-based About from parsed CV (no AI). Slightly looser than AI validation. */
export function isAcceptableFallbackBio(bio: string): boolean {
  const trimmed = bio.trim();
  if (!trimmed || isGarbledBio(trimmed)) return false;
  if (/@|mailto:|tel:|\+\d{6,}/i.test(trimmed)) return false;
  if (trimmed.length < 60 || trimmed.length > 700) return false;
  if (!bioUsesFirstPerson(trimmed) || bioUsesThirdPerson(trimmed)) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 20 || words.length > 110) return false;

  return true;
}

export function isAcceptableAiBio(bio: string, cvText = ""): boolean {
  const trimmed = bio.trim();
  if (!trimmed || isGarbledBio(trimmed)) return false;
  if (/@|mailto:|tel:|\+\d{6,}/i.test(trimmed)) return false;
  if (!bioUsesFirstPerson(trimmed) || bioUsesThirdPerson(trimmed)) return false;
  if (trimmed.length < 80 || trimmed.length > 900) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 28 || words.length > 130) return false;

  if (cvText && bioLooksCopiedFromCv(trimmed, cvText)) return false;

  return true;
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the bio reuses long phrases straight from the CV instead of synthesizing. */
export function bioLooksCopiedFromCv(bio: string, cvText: string): boolean {
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

  const genericObjectives = [
    "to secure a responsible career opportunity",
    "seeking a challenging position",
    "looking for an opportunity to utilize",
  ];
  if (genericObjectives.some((p) => bioNorm.includes(p) && cvNorm.includes(p))) {
    return true;
  }

  return false;
}

export function skillLooksLikeCvNoise(skill: string, cvText: string): boolean {
  const skillNorm = normalizeForCompare(skill);
  if (!skillNorm || !cvText) return false;

  const cvLines = cvText
    .split(/\n+/)
    .map((line) => normalizeForCompare(line))
    .filter((line) => line.length > 0);

  for (const line of cvLines) {
    if (line === skillNorm && line.length < 4) return true;
    if (line === skillNorm && /^\d{4}$/.test(line)) return true;
    if (line.includes(skillNorm) && line.length > 45) return true;
  }

  return false;
}

export function sanitizeProfileSkills(skills: string[], limit = 8, cvText = ""): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of skills) {
    const skill = raw.trim().replace(/\s+/g, " ");
    if (!isValidProfileSkill(skill)) continue;
    if (cvText && skillLooksLikeCvNoise(skill, cvText)) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
    if (out.length >= limit) break;
  }

  return out;
}

export function toTitleCaseSkill(skill: string): string {
  const small = new Set(["and", "or", "of", "in", "for", "to", "the", "a", "an"]);
  return skill
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && small.has(lower)) return lower;
      if (/^[A-Z]{2,}$/.test(word)) return word;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
