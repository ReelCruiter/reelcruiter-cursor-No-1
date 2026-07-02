import { create } from "zustand";
import { emptyExperiences as mockExperiences, emptyPosts as mockPosts } from "./models";
import type { Experience, VideoPost } from "./models";
import { supabase } from "@/integrations/supabase/client";
import { awaitCurrentUserId, getCurrentUser } from "@/lib/authCache";
import { fetchAllPosts, fetchUserPosts, deletePost as deletePostDb } from "./posts";
import {
  fetchUserExperiences,
  createExperience,
  updateExperienceDb,
  deleteExperienceDb,
} from "./experiences";
import {
  newExperiencesFromResume,
  type ApplyResumeResult,
} from "./applyResumeToProfile";

export interface Skill {
  id: string;
  name: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string; // "" => Present
}

export interface Certificate {
  id: string;
  name: string;
  issuer: string;
  year: string;
  credentialUrl?: string;
}

export interface ProfileData {
  name: string;
  bio: string;
  city: string;
  country: string;
  avatarUrl: string;
  introVideoUrl: string;
  companyName: string;
  companyDescription: string;
  companyWebsite: string;
  companyIndustry: string;
  companySize: string;
  companyLogoUrl: string;
  companyLinkedin: string;
  companyTwitter: string;
  companyInstagram: string;
  companyFacebook: string;
  companyTiktok: string;
  companyYoutube: string;
  companyWhatsapp: string;
  resumeUrl: string;
  resumeName: string;
  skills: Skill[];
  education: Education[];
  certificates: Certificate[];
}

const uid = () => Math.random().toString(36).slice(2, 10);

// Sort: current ("Present" / no endDate) first, then by endDate desc, then startDate desc
export const sortExperiencesByDate = (items: Experience[]): Experience[] => {
  return [...items].sort((a, b) => {
    if (a.isCurrent && !b.isCurrent) return -1;
    if (!a.isCurrent && b.isCurrent) return 1;
    const aEnd = a.endDate ?? "9999-99";
    const bEnd = b.endDate ?? "9999-99";
    if (aEnd !== bEnd) return bEnd.localeCompare(aEnd);
    return b.startDate.localeCompare(a.startDate);
  });
};

interface ProfileStore {
  profile: ProfileData;
  experiences: Experience[];
  posts: VideoPost[];
  userId: string | null;
  loading: boolean;
  // hydration / persistence
  loadProfileFromDb: () => Promise<void>;
  saveProfileToDb: () => Promise<{ error: string | null }>;
  loadPostsFromDb: () => Promise<void>;
  loadMyPostsFromDb: () => Promise<void>;
  loadMyExperiencesFromDb: () => Promise<void>;
  // profile
  updateProfile: (patch: Partial<ProfileData>) => void;
  // skills
  addSkill: (name: string) => void;
  removeSkill: (id: string) => void;
  // education
  addEducation: (edu: Omit<Education, "id">) => void;
  updateEducation: (id: string, patch: Partial<Education>) => void;
  removeEducation: (id: string) => void;
  // certificates
  addCertificate: (cert: Omit<Certificate, "id">) => void;
  updateCertificate: (id: string, patch: Partial<Certificate>) => void;
  removeCertificate: (id: string) => void;
  // experience videos
  addExperience: (exp: Omit<Experience, "id">) => Promise<{ error: string | null }>;
  updateExperience: (id: string, patch: Partial<Experience>) => Promise<{ error: string | null }>;
  removeExperience: (id: string) => Promise<{ error: string | null }>;
  applyResumeFromFile: (file: File) => Promise<ApplyResumeResult>;
  // posts
  removePost: (id: string) => Promise<void>;
}

// Parse "City, Country" stored in profiles.location into separate fields.
const parseLocation = (loc: string | null | undefined): { city: string; country: string } => {
  if (!loc) return { city: "", country: "" };
  const parts = loc.split(",").map((s) => s.trim());
  if (parts.length >= 2) return { city: parts[0], country: parts.slice(1).join(", ") };
  return { city: "", country: parts[0] };
};

const formatLocation = (city: string, country: string): string =>
  [city, country].filter(Boolean).join(", ");

const INTRO_VIDEO_BUCKET = "post-videos";
const RESUME_BUCKET = "resumes";

/**
 * If the intro video URL is a data: URL (freshly picked from device),
 * upload it to storage and return the public URL.
 * Otherwise return the URL as-is (already-stored URL or empty).
 */
async function ensureIntroVideoUploaded(
  url: string,
  userId: string
): Promise<{ url: string; error: string | null }> {
  if (!url || !url.startsWith("data:")) return { url, error: null };
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "mp4").split(";")[0];
    const path = `${userId}/intro/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(INTRO_VIDEO_BUCKET)
      .upload(path, blob, { contentType: blob.type, upsert: true });
    if (error) return { url: "", error: error.message };
    const { data } = supabase.storage.from(INTRO_VIDEO_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (e: any) {
    return { url: "", error: e?.message || "Failed to upload intro video" };
  }
}

/**
 * If the resume URL is a data: URL (freshly picked from device),
 * upload it to the resumes bucket and return its public URL.
 */
async function ensureResumeUploaded(
  url: string,
  userId: string
): Promise<{ url: string; error: string | null }> {
  if (!url || !url.startsWith("data:")) return { url, error: null };
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const path = `${userId}/resume-${Date.now()}.pdf`;
    const { error } = await supabase.storage
      .from(RESUME_BUCKET)
      .upload(path, blob, { contentType: "application/pdf", upsert: true });
    if (error) return { url: "", error: error.message };
    const { data } = supabase.storage.from(RESUME_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (e: any) {
    return { url: "", error: e?.message || "Failed to upload resume" };
  }
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: {
    name: "",
    bio: "",
    city: "",
    country: "",
    avatarUrl: "",
    introVideoUrl: "",
    companyName: "",
    companyDescription: "",
    companyWebsite: "",
    companyIndustry: "",
    companySize: "",
    companyLogoUrl: "",
    companyLinkedin: "",
    companyTwitter: "",
    companyInstagram: "",
    companyFacebook: "",
    companyTiktok: "",
    companyYoutube: "",
    companyWhatsapp: "",
    resumeUrl: "",
    resumeName: "",
    skills: [],
    education: [],
    certificates: [],
  },
  experiences: [],
  posts: [],
  userId: null,
  loading: false,

  loadProfileFromDb: async () => {
    set({ loading: true });
    const userId = await awaitCurrentUserId();
    if (!userId) {
      set({ loading: false, userId: null });
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, bio, location, avatar_url, company_name, company_description, company_website, company_industry, company_size, company_logo_url, company_linkedin, company_twitter, company_instagram, company_facebook, company_tiktok, company_youtube, company_whatsapp, intro_video_url, resume_url")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("loadProfileFromDb error", error);
      set({ loading: false, userId });
      return;
    }
    const { city, country } = parseLocation(data?.location);

    // Restore pending draft saved before sign-in (if any)
    let pending: Partial<ProfileData> | null = null;
    try {
      const raw = sessionStorage.getItem("hr_pending_profile");
      if (raw) pending = JSON.parse(raw) as Partial<ProfileData>;
    } catch {}

    // Load skills, education, certificates in parallel
    const [skillsRes, eduRes, certsRes] = await Promise.all([
      supabase.from("user_skills").select("id, name").eq("user_id", userId).order("created_at", { ascending: true }),
      supabase.from("user_education").select("id, school, degree, field, start_year, end_year").eq("user_id", userId).order("created_at", { ascending: true }),
      supabase.from("user_certificates").select("id, name, issuer, year, credential_url").eq("user_id", userId).order("created_at", { ascending: true }),
    ]);

    const skills: Skill[] = (skillsRes.data || []).map((r: any) => ({ id: r.id, name: r.name }));
    const education: Education[] = (eduRes.data || []).map((r: any) => ({
      id: r.id,
      school: r.school || "",
      degree: r.degree || "",
      field: r.field || "",
      startYear: r.start_year || "",
      endYear: r.end_year || "",
    }));
    const certificates: Certificate[] = (certsRes.data || []).map((r: any) => ({
      id: r.id,
      name: r.name || "",
      issuer: r.issuer || "",
      year: r.year || "",
      credentialUrl: r.credential_url || undefined,
    }));

    const dbResumeUrl = (data as any)?.resume_url || "";
    const pendingSafe = pending ? { ...pending } : null;
    if (pendingSafe && !pendingSafe.resumeUrl) {
      delete pendingSafe.resumeUrl;
    }

    set((s) => ({
      userId,
      loading: false,
      profile: {
        ...s.profile,
        name:
          data?.full_name ||
          (getCurrentUser()?.user_metadata?.full_name as string) ||
          getCurrentUser()?.email?.split("@")[0] ||
          "",
        bio: data?.bio || "",
        city,
        country,
        avatarUrl: data?.avatar_url || s.profile.avatarUrl,
        companyName: (data as any)?.company_name || "",
        companyDescription: (data as any)?.company_description || "",
        companyWebsite: (data as any)?.company_website || "",
        companyIndustry: (data as any)?.company_industry || "",
        companySize: (data as any)?.company_size || "",
        companyLogoUrl: (data as any)?.company_logo_url || "",
        companyLinkedin: (data as any)?.company_linkedin || "",
        companyTwitter: (data as any)?.company_twitter || "",
        companyInstagram: (data as any)?.company_instagram || "",
        companyFacebook: (data as any)?.company_facebook || "",
        companyTiktok: (data as any)?.company_tiktok || "",
        companyYoutube: (data as any)?.company_youtube || "",
        companyWhatsapp: (data as any)?.company_whatsapp || "",
        introVideoUrl: (data as any)?.intro_video_url || "",
        resumeUrl: pendingSafe?.resumeUrl || dbResumeUrl,
        resumeName: pendingSafe?.resumeName || s.profile.resumeName,
        skills,
        education,
        certificates,
        ...(pendingSafe || {}),
      },
    }));

    // If there was a pending draft, persist it now and clear it
    if (pending) {
      const { error: saveErr } = await get().saveProfileToDb();
      if (!saveErr) {
        try { sessionStorage.removeItem("hr_pending_profile"); } catch {}
      }
    }

    // Load this user's experiences from the database
    await get().loadMyExperiencesFromDb();
  },

  saveProfileToDb: async () => {
    const { profile, userId } = get();
    if (!userId) return { error: "You must be signed in to save your profile." };

    // 1. Upload intro video if it's a fresh data: URL.
    let introUrl = profile.introVideoUrl;
    if (introUrl && introUrl.startsWith("data:")) {
      const res = await ensureIntroVideoUploaded(introUrl, userId);
      if (res.error) return { error: `Intro video upload failed: ${res.error}` };
      introUrl = res.url;
      // Reflect uploaded URL in state so UI no longer holds the data URL
      set((s) => ({ profile: { ...s.profile, introVideoUrl: introUrl } }));
    }

    // 1b. Upload resume PDF if it's a fresh data: URL.
    let resumeUrl = profile.resumeUrl;
    if (resumeUrl && resumeUrl.startsWith("data:")) {
      const res = await ensureResumeUploaded(resumeUrl, userId);
      if (res.error) return { error: `Resume upload failed: ${res.error}` };
      resumeUrl = res.url;
      set((s) => ({ profile: { ...s.profile, resumeUrl } }));
    }

    const payload = {
      user_id: userId,
      full_name: profile.name,
      bio: profile.bio,
      location: formatLocation(profile.city, profile.country),
      avatar_url: profile.avatarUrl,
      company_name: profile.companyName || null,
      company_description: profile.companyDescription || null,
      company_website: profile.companyWebsite || null,
      company_industry: profile.companyIndustry || null,
      company_size: profile.companySize || null,
      company_logo_url: profile.companyLogoUrl || null,
      company_linkedin: profile.companyLinkedin || null,
      company_twitter: profile.companyTwitter || null,
      company_instagram: profile.companyInstagram || null,
      company_facebook: profile.companyFacebook || null,
      company_tiktok: profile.companyTiktok || null,
      company_youtube: profile.companyYoutube || null,
      company_whatsapp: profile.companyWhatsapp || null,
      intro_video_url: introUrl || null,
      resume_url: resumeUrl || null,
    };
    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" });
    if (error) {
      console.error("saveProfileToDb error", error);
      return { error: error.message };
    }

    // 2. Persist skills, education, certificates with a delete-then-insert
    //    pattern. Simple, atomic-feeling, and easy to keep in sync with UI.
    const skillsRows = profile.skills
      .map((s) => ({ user_id: userId, name: s.name.trim() }))
      .filter((r) => r.name.length > 0);
    const eduRows = profile.education.map((e) => ({
      user_id: userId,
      school: e.school || "",
      degree: e.degree || "",
      field: e.field || "",
      start_year: e.startYear || "",
      end_year: e.endYear || "",
    }));
    const certRows = profile.certificates.map((c) => ({
      user_id: userId,
      name: c.name || "",
      issuer: c.issuer || "",
      year: c.year || "",
      credential_url: c.credentialUrl || null,
    }));

    const [delSkills, delEdu, delCerts] = await Promise.all([
      supabase.from("user_skills").delete().eq("user_id", userId),
      supabase.from("user_education").delete().eq("user_id", userId),
      supabase.from("user_certificates").delete().eq("user_id", userId),
    ]);
    const delErr = delSkills.error || delEdu.error || delCerts.error;
    if (delErr) {
      console.error("saveProfileToDb delete error", delErr);
      return { error: delErr.message };
    }

    const insertResults = await Promise.all([
      skillsRows.length
        ? supabase.from("user_skills").insert(skillsRows)
        : Promise.resolve({ error: null } as { error: any }),
      eduRows.length
        ? supabase.from("user_education").insert(eduRows)
        : Promise.resolve({ error: null } as { error: any }),
      certRows.length
        ? supabase.from("user_certificates").insert(certRows)
        : Promise.resolve({ error: null } as { error: any }),
    ]);
    for (const r of insertResults) {
      if ((r as any).error) {
        console.error("saveProfileToDb insert error", (r as any).error);
        return { error: (r as any).error.message };
      }
    }

    // 3. Reload from DB so local IDs match server IDs.
    await get().loadProfileFromDb();

    return { error: null };
  },

  updateProfile: (patch) =>
    set((s) => ({ profile: { ...s.profile, ...patch } })),

  addSkill: (name) =>
    set((s) => ({
      profile: { ...s.profile, skills: [...s.profile.skills, { id: uid(), name: name.trim() }] },
    })),
  removeSkill: (id) =>
    set((s) => ({
      profile: { ...s.profile, skills: s.profile.skills.filter((sk) => sk.id !== id) },
    })),

  addEducation: (edu) =>
    set((s) => ({
      profile: { ...s.profile, education: [...s.profile.education, { ...edu, id: uid() }] },
    })),
  updateEducation: (id, patch) =>
    set((s) => ({
      profile: {
        ...s.profile,
        education: s.profile.education.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      },
    })),
  removeEducation: (id) =>
    set((s) => ({
      profile: { ...s.profile, education: s.profile.education.filter((e) => e.id !== id) },
    })),

  addCertificate: (cert) =>
    set((s) => ({
      profile: { ...s.profile, certificates: [...s.profile.certificates, { ...cert, id: uid() }] },
    })),
  updateCertificate: (id, patch) =>
    set((s) => ({
      profile: {
        ...s.profile,
        certificates: s.profile.certificates.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      },
    })),
  removeCertificate: (id) =>
    set((s) => ({
      profile: { ...s.profile, certificates: s.profile.certificates.filter((c) => c.id !== id) },
    })),

  addExperience: async (exp) => {
    const { id, error } = await createExperience({
      title: exp.title,
      company: exp.company,
      startDate: exp.startDate,
      endDate: exp.endDate ?? null,
      isCurrent: exp.isCurrent,
      videoUrl: exp.videoUrl,
      category: exp.category,
    });
    if (error || !id) return { error: error || "Failed to add experience" };
    set((s) => ({
      experiences: sortExperiencesByDate([...s.experiences, { ...exp, id }]),
    }));
    return { error: null };
  },
  updateExperience: async (id, patch) => {
    const current = get().experiences.find((e) => e.id === id);
    if (!current) return { error: "Experience not found" };
    const merged = { ...current, ...patch };
    const { error } = await updateExperienceDb(id, {
      title: merged.title,
      company: merged.company,
      startDate: merged.startDate,
      endDate: merged.endDate ?? null,
      isCurrent: merged.isCurrent,
      videoUrl: merged.videoUrl,
      category: merged.category,
    });
    if (error) return { error };
    set((s) => ({
      experiences: sortExperiencesByDate(
        s.experiences.map((e) => (e.id === id ? merged : e))
      ),
    }));
    return { error: null };
  },
  removeExperience: async (id) => {
    const { error } = await deleteExperienceDb(id);
    if (error) return { error };
    set((s) => ({ experiences: s.experiences.filter((e) => e.id !== id) }));
    return { error: null };
  },

  applyResumeFromFile: async (file) => {
    const { extractTextFromPdf, parseResumeText } = await import("./resumeParse");
    const { analyzeResumeWithAi } = await import("./resumeAnalyze");
    const { buildProfilePatchFromResume, newExperiencesFromResume, newSkillsToAdd } =
      await import("./applyResumeToProfile");
    const { preloadCitiesData } = await import("./locations");

    await preloadCitiesData();
    const text = await extractTextFromPdf(file);
    if (!text || text.length < 40) {
      throw new Error("Could not read enough text from this PDF");
    }

    const parsed = parseResumeText(text);
    const aiProfile = await analyzeResumeWithAi(text, parsed);
    const { profile, experiences, userId } = get();
    const result: ApplyResumeResult = {
      bio: false,
      name: false,
      location: false,
      skills: 0,
      experiences: 0,
    };

    const patch = buildProfilePatchFromResume(profile, parsed, {
      aiBio: aiProfile.bio,
      replaceBioOnUpload: aiProfile.source === "ai",
    });
    if (patch.bio) result.bio = true;
    if (patch.name) result.name = true;
    if (patch.city || patch.country) result.location = true;
    if (Object.keys(patch).length > 0) {
      get().updateProfile(patch);
    }

    for (const skill of newSkillsToAdd(profile, aiProfile.skills)) {
      get().addSkill(skill);
      result.skills += 1;
    }

    for (const exp of newExperiencesFromResume(experiences, parsed)) {
      if (userId) {
        const { error } = await get().addExperience({
          title: exp.title,
          company: exp.company,
          startDate: exp.startDate,
          endDate: exp.endDate,
          isCurrent: exp.isCurrent,
          videoUrl: "",
          category: exp.category,
        });
        if (!error) result.experiences += 1;
      } else {
        set((s) => ({
          experiences: sortExperiencesByDate([
            ...s.experiences,
            { ...exp, id: uid(), videoUrl: "" },
          ]),
        }));
        result.experiences += 1;
      }
    }

    return result;
  },

  loadMyExperiencesFromDb: async () => {
    const { userId } = get();
    if (!userId) return;
    const items = await fetchUserExperiences(userId);
    set({ experiences: sortExperiencesByDate(items) });
  },

  removePost: async (id) => {
    // Try delete in DB (no-op for legacy mock IDs); always remove locally.
    try { await deletePostDb(id); } catch {}
    set((s) => ({ posts: s.posts.filter((p) => p.id !== id) }));
  },

  loadPostsFromDb: async () => {
    const real = await fetchAllPosts();
    set({ posts: real });
  },

  loadMyPostsFromDb: async () => {
    const { userId } = get();
    if (!userId) return;
    const mine = await fetchUserPosts(userId);
    set((s) => {
      // Replace any existing posts by this user with fresh DB data
      const others = s.posts.filter((p) => p.userId !== userId);
      return { posts: [...mine, ...others] };
    });
  },
}));
