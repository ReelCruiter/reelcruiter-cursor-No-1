import { jobCategories } from "@/lib/categories";
import { getPdfJs, type PdfTextItem } from "@/lib/pdfJsLoader";
import { preloadCitiesData } from "@/lib/locations";
import { resolveCityCountrySync } from "@/lib/locationResolve";

export interface ParsedExperience {
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  category: string;
}

export interface ParsedResume {
  name?: string;
  bio?: string;
  city?: string;
  country?: string;
  skills: string[];
  experiences: ParsedExperience[];
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const SECTION_HEADERS: { key: string; re: RegExp }[] = [
  { key: "summary", re: /^(profile|summary|about(?: me)?|professional summary|personal statement|objective|career objective)\s*$/i },
  { key: "experience", re: /^(experience|work experience|employment(?: history)?|professional experience|work history|career history|relevant experience)\s*$/i },
  { key: "skills", re: /^(skills|technical skills|core competencies|key skills|areas of expertise|competencies)\s*$/i },
  { key: "education", re: /^(education|qualifications|academic background)\s*$/i },
  { key: "contact", re: /^(contact(?: information)?|personal details)\s*$/i },
];

const DATE_TOKEN =
  "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\\d{1,2}\\/\\d{4}|\\d{4})";

const DATE_RANGE_RE = new RegExp(
  `(${DATE_TOKEN})\\s*(?:[-–—~]|\\bto\\b)\\s*(Present|Current|Now|${DATE_TOKEN})`,
  "i"
);

const JOB_TITLE_HINT =
  /\b(manager|receptionist|assistant|director|coordinator|specialist|supervisor|agent|clerk|host|server|chef|concierge|housekeeper|waiter|bartender|administrator|officer|associate|engineer|developer|analyst|consultant|lead|head|intern|trainee|executive|representative|technician|operator|driver|nurse|teacher|accountant|designer|marketer|sales|cashier|porter|steward|sommelier|front desk|guest relations|hospitality)\b/i;

const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  Hospitality: /\bhospitality|hotel|resort|motel|inn\b|front desk|reception|concierge|housekeeping|banquet|guest service|food and beverage|f\s*&\s*b\b|restaurant|barista|sommelier|hostess|bellhop|valet|lodging/i,
  "Customer Service": /\bcustomer service|call center|help desk|client support|guest relations/i,
  Retail: /\bretail|store associate|shop assistant|merchandis/i,
  Healthcare: /\bhealthcare|hospital|clinic|nurse|medical|care assistant/i,
  "IT / Technology": /\bit\b|technology|tech support|information technology/i,
  "Software Engineering": /\bsoftware|developer|programmer|full[\s-]?stack|backend|frontend/i,
  Construction: /\bconstruction|carpenter|electrician|plumber|site supervisor/i,
  "Finance & Accounting": /\bfinance|accounting|bookkeep|audit|payroll/i,
  "Logistics & Supply Chain": /\blogistics|warehouse|supply chain|inventory|dispatch/i,
  "Transportation & Driving": /\bdriver|delivery|courier|transport|truck/i,
  "Cleaning & Facilities": /\bcleaning|janitor|facilities|maintenance/i,
  "Beauty & Wellness": /\bbeauty|salon|spa|wellness|massage|cosmetolog/i,
  "Education & Training": /\beducation|teacher|tutor|instructor|training/i,
  Sales: /\bsales|business development|account executive/i,
  Marketing: /\bmarketing|social media|brand|content/i,
};

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Repairs PDF lines where each character was extracted as a separate token. */
function normalizeJoinedFragment(fragment: string): string {
  if (fragment.length <= 3) return fragment;
  return fragment.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

export function repairFragmentedLine(line: string): string {
  const parts = line.split(/\s+/).filter(Boolean);
  if (parts.length < 6) return line;

  const singleCharCount = parts.filter((p) => p.length === 1 && /[A-Za-z0-9.@]/.test(p)).length;
  if (singleCharCount / parts.length < 0.55) return line;

  const out: string[] = [];
  let buffer = "";
  for (const part of parts) {
    if (part.length === 1 && /[A-Za-z0-9.@]/.test(part)) {
      buffer += part;
      continue;
    }
    if (buffer) {
      out.push(normalizeJoinedFragment(buffer));
      buffer = "";
    }
    out.push(part);
  }
  if (buffer) out.push(normalizeJoinedFragment(buffer));
  return out.join(" ");
}

function repairFragmentedText(text: string): string {
  return text.split("\n").map(repairFragmentedLine).join("\n");
}

export function isGarbledBio(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const words = trimmed.split(/\s+/);
  const singleChars = words.filter((w) => w.length === 1).length;
  if (words.length > 8 && singleChars / words.length > 0.35) return true;
  if (/@|mailto:|tel:|mobile\s*:|\+\d{6,}/i.test(trimmed)) return true;
  if (
    /\b(PROFESSIONAL SUMMARY|WORK HISTORY|SKILLS|CONTACT INFORMATION)\b/i.test(trimmed) &&
    trimmed.length > 100
  ) {
    return true;
  }
  return false;
}

function pageItemsToLines(items: PdfTextItem[]): string[] {
  const rows = items
    .filter((it) => !!it.str.trim())
    .map((it) => ({ y: it.transform[5], x: it.transform[4], str: it.str.trim() }));

  rows.sort((a, b) => b.y - a.y || a.x - b.x);

  const lines: string[] = [];
  let currentY = Number.POSITIVE_INFINITY;
  let currentLine = "";
  const yTolerance = 4;

  for (const row of rows) {
    if (currentY - row.y > yTolerance) {
      if (currentLine.trim()) lines.push(repairFragmentedLine(currentLine.trim()));
      currentLine = row.str;
      currentY = row.y;
    } else {
      currentLine = currentLine ? `${currentLine} ${row.str}` : row.str;
    }
  }
  if (currentLine.trim()) lines.push(repairFragmentedLine(currentLine.trim()));
  return lines;
}

export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjs = await getPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const lines = pageItemsToLines(content.items as PdfTextItem[]);
    pageTexts.push(lines.join("\n"));
  }

  return repairFragmentedText(normalizeText(pageTexts.join("\n\n")));
}

function splitSections(text: string): Map<string, string> {
  const lines = text.split("\n");
  const sections = new Map<string, string>();
  let currentKey = "body";
  let buffer: string[] = [];

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content) {
      const existing = sections.get(currentKey);
      sections.set(currentKey, existing ? `${existing}\n\n${content}` : content);
    }
    buffer = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    const header = SECTION_HEADERS.find((h) => h.re.test(line));
    if (header) {
      flush();
      currentKey = header.key;
      continue;
    }
    if (line) buffer.push(line);
  }
  flush();
  return sections;
}

function parseMonthYear(token: string): string | null {
  const t = token.trim();
  if (/^\d{4}-\d{2}$/.test(t)) return t;

  const slash = t.match(/^(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[2]}-${slash[1].padStart(2, "0")}`;

  const monthYear = t.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYear) {
    const month = MONTH_NAMES[monthYear[1].toLowerCase()];
    if (month) return `${monthYear[2]}-${String(month).padStart(2, "0")}`;
  }

  const yearOnly = t.match(/^(\d{4})$/);
  if (yearOnly) return `${yearOnly[1]}-01`;

  return null;
}

function parseDateRange(text: string): {
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  remainder: string;
} | null {
  const match = text.match(DATE_RANGE_RE);
  if (!match) return null;

  const startDate = parseMonthYear(match[1]);
  if (!startDate) return null;

  const endToken = match[2];
  const isCurrent = /present|current|now/i.test(endToken);
  const endDate = isCurrent ? null : parseMonthYear(endToken);

  const remainder = text.replace(match[0], "").replace(/\s*[|•·,–—-]\s*$/, "").trim();
  return { startDate, endDate, isCurrent, remainder };
}

function inferCategory(title: string, company: string, context = ""): string {
  const blob = `${title} ${company} ${context}`.toLowerCase();
  for (const category of jobCategories) {
    const re = CATEGORY_KEYWORDS[category];
    if (re?.test(blob)) return category;
  }
  return "Other";
}

function looksLikeJobTitle(line: string): boolean {
  const s = line.trim();
  if (s.length < 3 || s.length > 90) return false;
  if (/@|https?:|www\.|linkedin|phone|email|\(\d{3}\)/i.test(s)) return false;
  if (DATE_RANGE_RE.test(s)) return false;
  if (/^(skills|education|experience|summary|profile|contact)\b/i.test(s)) return false;
  return JOB_TITLE_HINT.test(s);
}

function looksLikeName(line: string): boolean {
  const s = line.trim();
  if (s.length < 3 || s.length > 50) return false;
  if (s.includes(",") || /@|\d{3}|http|linkedin|curriculum vitae|resume|cv\b/i.test(s)) return false;
  const words = s.split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  return words.every((w) => /^[A-ZÀ-ÿ][a-zà-ÿ'`-]{1,}$/.test(w) || /^[A-Z]{2,}$/.test(w));
}

function looksLikeNameWord(word: string): boolean {
  const w = word.trim();
  return w.length >= 2 && w.length <= 24 && /^[A-ZÀ-ÿ][a-zà-ÿ'`-]+$/.test(w);
}

function isContactLine(line: string): boolean {
  return /@|https?:|www\.|linkedin|phone|tel:|mobile|\(\d{3}\)|\+\d{5,}/i.test(line);
}

function isSectionHeaderLine(line: string): boolean {
  return SECTION_HEADERS.some((h) => h.re.test(line.trim()));
}

function parseLocationLine(line: string): { city?: string; country?: string } {
  const trimmed = line.trim();
  const match = trimmed.match(
    /^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{0,38}[A-Za-zÀ-ÿ])\s*,\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'()-]{0,38}[A-Za-zÀ-ÿ])\.?$/
  );
  if (!match) return {};

  const part1 = match[1].trim();
  const part2 = match[2].trim();
  if (part1.split(/\s+/).length > 3 || trimmed.split(",").length > 2) return {};

  return resolveCityCountrySync(part1, part2);
}

function parseMergedNameLocationLine(line: string): {
  name?: string;
  city?: string;
  country?: string;
} | null {
  const match = line.trim().match(/^(.+),\s*(.+)$/);
  if (!match) return null;

  const before = match[1].trim();
  const after = match[2].trim();
  const words = before.split(/\s+/);
  if (words.length < 3) return null;
  if (!looksLikeNameWord(words[0]) || !looksLikeNameWord(words[1])) return null;

  const name = `${words[0]} ${words[1]}`;
  const cityPart = words.slice(2).join(" ");
  if (!cityPart) return null;

  const location = resolveCityCountrySync(cityPart, after);
  if (!location.city || !location.country) return null;

  return { name, ...location };
}

function locationOverlapsName(locationCity: string, name?: string): boolean {
  if (!name) return false;
  const nameWords = new Set(name.toLowerCase().split(/\s+/).filter(Boolean));
  const cityWords = locationCity.toLowerCase().split(/\s+/).filter(Boolean);
  const overlap = cityWords.filter((w) => nameWords.has(w));
  return overlap.length >= 2 || (overlap.length === 1 && cityWords.length > 1);
}

function parseHeaderFields(lines: string[]): {
  name?: string;
  city?: string;
  country?: string;
} {
  const headerLines = lines
    .slice(0, 12)
    .map((l) => l.trim())
    .filter((l) => l && !isContactLine(l) && !isSectionHeaderLine(l));

  let name: string | undefined;
  let city: string | undefined;
  let country: string | undefined;

  for (let i = 0; i < headerLines.length; i++) {
    const merged = parseMergedNameLocationLine(headerLines[i]);
    if (merged?.name) {
      name = merged.name;
      city = merged.city;
      country = merged.country;
      break;
    }
  }

  if (!name) {
    for (let i = 0; i < headerLines.length; i++) {
      const line = headerLines[i];
      if (line.includes(",")) continue;

      if (looksLikeName(line)) {
        name = line;
        break;
      }

      const next = headerLines[i + 1];
      if (next && !next.includes(",") && looksLikeNameWord(line) && looksLikeNameWord(next)) {
        name = `${line} ${next}`;
        break;
      }
    }
  }

  if (!city || !country) {
    for (const line of headerLines) {
      if (!line.includes(",")) continue;
      const parsed = parseLocationLine(line);
      if (!parsed.city || !parsed.country) continue;
      if (locationOverlapsName(parsed.city, name)) continue;
      city = parsed.city;
      country = parsed.country;
      break;
    }
  }

  return { name, city, country };
}

function parseSkillsSection(section: string): string[] {
  const skills = new Set<string>();
  const lines = section.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const cleaned = line.replace(/^[-•*·]\s*/, "").trim();
    if (!cleaned || cleaned.length > 60) continue;

    if (cleaned.includes(",")) {
      for (const part of cleaned.split(/[,;|/]/)) {
        const skill = part.trim();
        if (skill.length >= 2 && skill.length <= 40) skills.add(skill);
      }
    } else if (cleaned.length >= 2 && cleaned.length <= 40) {
      skills.add(cleaned);
    }
  }

  return [...skills].slice(0, 20);
}

function parseSummarySection(section: string): string {
  const lines = section
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !SECTION_HEADERS.some((h) => h.re.test(l)));

  const paragraphs: string[] = [];
  let current = "";

  for (const line of lines) {
    if (DATE_RANGE_RE.test(line) || looksLikeJobTitle(line)) break;
    if (/^[-•*·]/.test(line)) break;
    current = current ? `${current} ${line}` : line;
    if (current.length > 80 && /[.!?]$/.test(line)) {
      paragraphs.push(current);
      current = "";
    }
  }
  if (current) paragraphs.push(current);

  const bio = paragraphs.join(" ").replace(/\s+/g, " ").trim();
  if (bio.length < 40 || isGarbledBio(bio)) return "";
  return bio.slice(0, 1200);
}

function parseExperienceBlock(titleLine: string, detailLine: string): ParsedExperience | null {
  const rangeOnTitle = parseDateRange(titleLine);
  const rangeOnDetail = parseDateRange(detailLine);

  let title = titleLine.trim();
  let company = "";
  let startDate = "";
  let endDate: string | null = null;
  let isCurrent = false;

  if (rangeOnDetail) {
    title = titleLine.trim();
    const parts = rangeOnDetail.remainder.split(/\s*[|@•·–—-]\s*/).map((p) => p.trim()).filter(Boolean);
    company = parts[0] || rangeOnDetail.remainder || "Unknown employer";
    startDate = rangeOnDetail.startDate;
    endDate = rangeOnDetail.endDate;
    isCurrent = rangeOnDetail.isCurrent;
  } else if (rangeOnTitle) {
    const beforeDates = titleLine.slice(0, titleLine.toLowerCase().indexOf(rangeOnTitle.startDate.slice(0, 4))).trim();
    const chunks = (beforeDates || rangeOnTitle.remainder)
      .split(/\s*[|@•·–—-]\s*/)
      .map((p) => p.trim())
      .filter(Boolean);
    title = chunks[0] || "Role";
    company = chunks[1] || chunks[0] || "Unknown employer";
    if (chunks.length === 1) company = rangeOnTitle.remainder || company;
    startDate = rangeOnTitle.startDate;
    endDate = rangeOnTitle.endDate;
    isCurrent = rangeOnTitle.isCurrent;
  } else {
    const atMatch = detailLine.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
    if (atMatch) {
      title = titleLine.trim() || atMatch[1].trim();
      company = atMatch[2].replace(DATE_RANGE_RE, "").trim();
    } else {
      const split = detailLine.split(/\s*[|•·–—-]\s*/);
      title = titleLine.trim() || split[0]?.trim() || "";
      company = split[1]?.replace(DATE_RANGE_RE, "").trim() || split[0]?.replace(DATE_RANGE_RE, "").trim() || "";
    }

    const fallbackRange = parseDateRange(detailLine) || parseDateRange(titleLine);
    if (!fallbackRange) return null;
    startDate = fallbackRange.startDate;
    endDate = fallbackRange.endDate;
    isCurrent = fallbackRange.isCurrent;
  }

  title = title.replace(DATE_RANGE_RE, "").replace(/\s*[|•·–—-]\s*$/, "").trim();
  company = company.replace(DATE_RANGE_RE, "").trim();

  if (!title || title.length < 2) return null;
  if (!company) company = "Unknown employer";
  if (!startDate) return null;

  return {
    title: title.slice(0, 120),
    company: company.slice(0, 120),
    startDate,
    endDate,
    isCurrent,
    category: inferCategory(title, company),
  };
}

function extractExperiences(text: string): ParsedExperience[] {
  const sections = splitSections(text);
  const source = sections.get("experience") || text;
  const lines = source.split("\n").map((l) => l.trim()).filter(Boolean);
  const found: ParsedExperience[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1] || "";
    const hasDate = DATE_RANGE_RE.test(line) || DATE_RANGE_RE.test(next);

    if (!hasDate) continue;

    let exp: ParsedExperience | null = null;

    if (DATE_RANGE_RE.test(next) && looksLikeJobTitle(line)) {
      exp = parseExperienceBlock(line, next);
      i += 1;
    } else if (DATE_RANGE_RE.test(line)) {
      const prev = lines[i - 1] || "";
      if (looksLikeJobTitle(prev)) {
        exp = parseExperienceBlock(prev, line);
      } else {
        exp = parseExperienceBlock("", line);
      }
    }

    if (!exp) continue;
    const key = `${exp.title.toLowerCase()}|${exp.company.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(exp);
  }

  return found.slice(0, 12);
}

export function parseResumeText(text: string): ParsedResume {
  const normalized = normalizeText(text);
  const sections = splitSections(normalized);
  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);

  const header = parseHeaderFields(lines);

  const bio = parseSummarySection(sections.get("summary") || "");

  const skills = sections.get("skills") ? parseSkillsSection(sections.get("skills")!) : [];

  const experiences = extractExperiences(normalized);

  return {
    name: header.name,
    bio: bio || undefined,
    city: header.city,
    country: header.country,
    skills,
    experiences,
  };
}

export async function parseResumePdf(file: File): Promise<ParsedResume> {
  await preloadCitiesData();
  const text = await extractTextFromPdf(file);
  if (!text || text.length < 40) {
    throw new Error("Could not read enough text from this PDF");
  }
  return parseResumeText(text);
}
