import type { ParsedResume } from "@/lib/resumeParse";
import { sanitizeProfileSkills } from "@/lib/resumeSkillFilter";

const ROLE_SKILL_RULES: { pattern: RegExp; skills: string[] }[] = [
  {
    pattern: /\brestaurant|food service|hospitality|hotel|resort|chef|waiter|waitress|bartender|hostess|concierge|housekeep/i,
    skills: [
      "Customer Service",
      "Team Management",
      "Operations Management",
      "Communication",
      "Problem Solving",
    ],
  },
  {
    pattern: /\breception|front desk|guest service|guest relations/i,
    skills: ["Customer Service", "Communication", "Organization", "Multitasking"],
  },
  {
    pattern: /\bretail|store associate|shop assistant|cashier|merchandis/i,
    skills: ["Customer Service", "Sales", "Communication", "Attention to Detail"],
  },
  {
    pattern: /\bmanager|supervisor|team lead|head of|director/i,
    skills: ["Leadership", "Team Management", "Decision Making", "Operations Management"],
  },
  {
    pattern: /\bsales|business development|account executive/i,
    skills: ["Sales", "Negotiation", "Relationship Building", "Communication"],
  },
  {
    pattern: /\bsoftware|developer|engineer|programmer|full[\s-]?stack|backend|frontend/i,
    skills: ["Problem Solving", "Technical Analysis", "Collaboration", "Attention to Detail"],
  },
  {
    pattern: /\bnurse|healthcare|clinical|medical|care assistant|hospital/i,
    skills: ["Patient Care", "Communication", "Teamwork", "Attention to Detail"],
  },
  {
    pattern: /\bdriver|delivery|courier|logistics|warehouse|dispatch/i,
    skills: ["Time Management", "Reliability", "Organization", "Safety Awareness"],
  },
  {
    pattern: /\bteacher|tutor|instructor|education|training/i,
    skills: ["Communication", "Instruction", "Patience", "Organization"],
  },
  {
    pattern: /\baccountant|finance|bookkeep|payroll|audit/i,
    skills: ["Attention to Detail", "Numeracy", "Organization", "Analytical Thinking"],
  },
  {
    pattern: /\bmarketing|social media|content|brand/i,
    skills: ["Communication", "Creativity", "Marketing", "Content Creation"],
  },
  {
    pattern: /\bcleaning|janitor|facilities|maintenance/i,
    skills: ["Reliability", "Attention to Detail", "Time Management", "Safety Awareness"],
  },
];

function estimateYears(experiences: ParsedResume["experiences"]): number | null {
  if (experiences.length === 0) return null;
  const starts = experiences
    .map((e) => e.startDate)
    .filter((d) => /^\d{4}/.test(d))
    .map((d) => parseInt(d.slice(0, 4), 10))
    .filter((y) => !Number.isNaN(y));
  if (starts.length === 0) return null;
  const earliest = Math.min(...starts);
  const currentYear = new Date().getFullYear();
  return Math.max(1, currentYear - earliest);
}

export function inferSkillsFromResume(text: string, parsed: ParsedResume): string[] {
  const skills = new Set<string>();
  const blob = [
    text,
    parsed.experiences.map((e) => `${e.title} ${e.company} ${e.category}`).join(" "),
    parsed.skills.join(" "),
  ].join(" ");

  for (const rule of ROLE_SKILL_RULES) {
    if (rule.pattern.test(blob)) {
      for (const skill of rule.skills) skills.add(skill);
    }
  }

  return sanitizeProfileSkills([...skills], 8, text);
}

export function buildFallbackBio(parsed: ParsedResume): string {
  const displayName = parsed.name?.trim() || "An experienced professional";
  const experiences = parsed.experiences;

  if (experiences.length === 0) {
    return `${displayName} is a motivated professional with a practical background and a strong focus on delivering reliable results in a new role.`;
  }

  const latest = experiences[0];
  const years = estimateYears(experiences);
  const sentences: string[] = [];

  if (years && years >= 2) {
    sentences.push(
      `${displayName} brings ${years}+ years of hands-on experience, most recently as ${latest.title} at ${latest.company}.`
    );
  } else {
    sentences.push(
      `${displayName} has recent experience as ${latest.title} at ${latest.company}.`
    );
  }

  const priorTitles = experiences
    .slice(1, 3)
    .map((e) => e.title)
    .filter(Boolean);
  if (priorTitles.length > 0) {
    sentences.push(`Background includes roles such as ${priorTitles.join(" and ")}.`);
  }

  if (latest.category && latest.category !== "Other") {
    sentences.push(
      `Known for a dependable, professional approach within ${latest.category.toLowerCase()}.`
    );
  } else {
    sentences.push("Known for reliability, teamwork, and a practical approach to day-to-day responsibilities.");
  }

  const bio = sentences.join(" ").replace(/\s+/g, " ").trim();
  const words = bio.split(/\s+/);
  if (words.length > 100) {
    return words.slice(0, 100).join(" ").replace(/[,\s]+$/, "") + ".";
  }
  return bio;
}
