import { supabase } from "@/integrations/supabase/client";
import type { VideoPost } from "@/lib/models";
import { jobTypeLabels } from "@/lib/models";
import { awaitCurrentUserId } from "@/lib/authCache";
import { captureVideoThumbnailFrame } from "@/lib/videoPoster";

export interface CreatePostInput {
  tag: "job-seeker" | "hiring";
  jobTitle: string;
  description: string;
  category: string;
  jobType: VideoPost["jobType"] | VideoPost["jobType"][];
  salary?: string;
  city: string;
  country: string;
  isPublic: boolean;
  hiddenFromFeed: boolean;
  videoFile: File;
  // New optional fields for hiring posts
  workArrangement?: "remote" | "hybrid" | "onsite";
  experienceLevel?: string;
  openings?: number;
  applyUrl?: string;
  deadline?: string; // ISO date "YYYY-MM-DD"
  // Hiring address (optional)
  fullAddress?: string;
  /** "full" → show address, "area" → show area only, "hidden" → reveal at interview */
  addressVisibility?: "full" | "area" | "hidden";
}

export interface DbPostRow {
  id: string;
  user_id: string;
  tag: "job-seeker" | "hiring";
  job_title: string;
  description: string | null;
  category: string | null;
  job_type: VideoPost["jobType"] | null;
  salary: string | null;
  city: string | null;
  country: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  is_public: boolean;
  hidden_from_feed: boolean;
  created_at: string;
  post_kind?: "open_to_work" | "community" | "hiring" | "workplace" | null;
  is_workplace_video?: boolean | null;
  work_arrangement?: "remote" | "hybrid" | "onsite" | null;
  experience_level?: string | null;
  openings?: number | null;
  apply_url?: string | null;
  deadline?: string | null;
  immediate_start?: boolean | null;
  desired_role?: string | null;
  preferred_location?: string | null;
  full_address?: string | null;
  address_visibility?: "full" | "area" | "hidden" | null;
}

export interface AuthorProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  company_name?: string | null;
  company_logo_url?: string | null;
  active_mode?: string | null;
}

const JOB_TYPES = new Set<VideoPost["jobType"]>([
  "full-time",
  "part-time",
  "contract",
  "freelance",
  "internship",
]);

/** Normalize one or many job types for the posts.job_type column. */
export function normalizeJobTypesForDb(
  input?: string | VideoPost["jobType"] | VideoPost["jobType"][] | null,
): string | null {
  if (!input) return null;
  const parts = Array.isArray(input)
    ? input
    : String(input)
        .split(",")
        .map((s) => s.trim());
  const valid = parts.filter((p): p is VideoPost["jobType"] => JOB_TYPES.has(p as VideoPost["jobType"]));
  return valid.length ? valid.join(",") : null;
}

export function parseJobTypesFromDb(raw?: string | null): VideoPost["jobType"][] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((p): p is VideoPost["jobType"] => JOB_TYPES.has(p as VideoPost["jobType"]));
}

export function formatJobTypeLabels(
  raw?: string | VideoPost["jobType"] | VideoPost["jobType"][] | null,
): string {
  const parts = Array.isArray(raw)
    ? raw.filter((p): p is VideoPost["jobType"] => JOB_TYPES.has(p))
    : parseJobTypesFromDb(typeof raw === "string" ? raw : null);
  if (parts.length) return parts.map((t) => jobTypeLabels[t]).join(", ");
  return typeof raw === "string" ? raw : "";
}

const daysAgo = (iso: string): number => {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

export function isEmployerPost(
  post: {
    tag?: string | null;
    postKind?: string | null;
    post_kind?: string | null;
    is_workplace_video?: boolean | null;
  },
): boolean {
  const kind = post.postKind ?? post.post_kind;
  return (
    post.tag === "hiring" ||
    kind === "hiring" ||
    kind === "workplace" ||
    post.is_workplace_video === true
  );
}

export function employerRepresentativeLine(representativeName?: string | null): string {
  const person = representativeName?.trim();
  return person || "Recruiting team";
}

/** Profile header byline when hiring: personal name with optional recruiting context. */
export function employerProfileByline(
  representativeName?: string | null,
  hasCompanyName?: boolean,
): string | null {
  const person = representativeName?.trim();
  if (!person) return null;
  return hasCompanyName ? `${person} · Recruiting` : person;
}

export function postAuthorSubtitle(
  employerPost: boolean,
  postKind?: VideoPost["postKind"],
  representativeName?: string | null,
): string {
  if (employerPost) return employerRepresentativeLine(representativeName);
  if (postKind === "open_to_work") return "Open to work";
  return "Job seeker profile";
}

export function resolvePostAuthorDisplay(
  row: DbPostRow,
  author?: AuthorProfile | null,
): Pick<VideoPost, "userName" | "userAvatar" | "userTitle"> {
  const employerPost = isEmployerPost(row);
  const postKind =
    (row.post_kind as VideoPost["postKind"]) ||
    (row.is_workplace_video ? "workplace" : row.tag === "hiring" ? "hiring" : undefined);

  if (employerPost) {
    return {
      userName: author?.company_name?.trim() || author?.full_name?.trim() || "Company",
      userAvatar: author?.company_logo_url || author?.avatar_url || "",
      userTitle: postAuthorSubtitle(true, postKind, author?.full_name),
    };
  }

  return {
    userName: author?.full_name?.trim() || "Member",
    userAvatar: author?.avatar_url || "",
    userTitle: postAuthorSubtitle(false, postKind),
  };
}

/** Apply saved company branding to an employer job post (e.g. on your own profile). */
export function brandPostForEmployer(
  post: VideoPost,
  company: { name?: string; logoUrl?: string; representativeName?: string },
): VideoPost {
  if (!isEmployerPost(post)) return post;
  const name = company.name?.trim();
  const logo = company.logoUrl?.trim();
  return {
    ...post,
    userName: name || post.userName,
    userAvatar: logo || post.userAvatar,
    userTitle: company.representativeName?.trim()
      ? employerRepresentativeLine(company.representativeName)
      : post.userTitle,
  };
}

export const dbRowToVideoPost = (
  row: DbPostRow,
  author?: AuthorProfile | null
): VideoPost => {
  const authorDisplay = resolvePostAuthorDisplay(row, author);
  return ({
  id: row.id,
  userId: row.user_id,
  userName: authorDisplay.userName,
  userAvatar: authorDisplay.userAvatar,
  userTitle: authorDisplay.userTitle,
  tag: row.tag,
  postKind:
    (row.post_kind as VideoPost["postKind"]) ||
    (row.is_workplace_video ? "workplace" : row.tag === "hiring" ? "hiring" : "community"),
  jobTitle: row.job_title,
  description: row.description || "",
  category: row.category || "",
  location: { city: row.city || "", country: row.country || "" },
  jobType: (row.job_type || "full-time") as VideoPost["jobType"],
  salary: row.salary || undefined,
  videoUrl: row.video_url || "",
  thumbnail: row.thumbnail_url || "",
  likes: 0,
  comments: 0,
  saved: false,
  createdAt: relativeTime(row.created_at),
  daysAgo: daysAgo(row.created_at),
  createdAtIso: row.created_at,
  isPublic: row.is_public,
  hiddenFromFeed: row.hidden_from_feed,
  workArrangement: row.work_arrangement || undefined,
  experienceLevel: row.experience_level || undefined,
  openings: row.openings ?? undefined,
  applyUrl: row.apply_url || undefined,
  deadline: row.deadline || undefined,
  desiredRole: row.desired_role || undefined,
  preferredLocation: row.preferred_location || undefined,
  immediateStart: row.immediate_start ?? undefined,
  fullAddress: row.full_address || undefined,
  addressVisibility: (row.address_visibility as VideoPost["addressVisibility"]) || undefined,
  });
};

export async function uploadPostVideo(file: File, userId: string): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split(".").pop() || "mp4";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("post-videos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from("post-videos").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

async function uploadPostVideoWithThumbnail(
  file: File,
  userId: string,
): Promise<{ videoUrl: string | null; thumbnailUrl: string | null; error: string | null }> {
  const upload = await uploadPostVideo(file, userId);
  if (upload.error || !upload.url) {
    return { videoUrl: null, thumbnailUrl: null, error: upload.error || "Video upload failed" };
  }

  let thumbnailUrl: string | null = null;
  try {
    const blob = await captureVideoThumbnailFrame(file);
    if (blob) {
      const thumbPath = `${userId}/${Date.now()}-thumb.jpg`;
      const { error: thumbErr } = await supabase.storage
        .from("post-videos")
        .upload(thumbPath, blob, { contentType: "image/jpeg", upsert: false });
      if (!thumbErr) {
        const { data } = supabase.storage.from("post-videos").getPublicUrl(thumbPath);
        thumbnailUrl = data.publicUrl;
      }
    }
  } catch {
    /* Thumbnail is optional; playback still uses the video first frame. */
  }

  return { videoUrl: upload.url, thumbnailUrl, error: null };
}

export async function createPost(input: CreatePostInput): Promise<{ id: string | null; error: string | null }> {
  const userId = await awaitCurrentUserId();
  if (!userId) return { id: null, error: "You must be signed in to post." };

  const upload = await uploadPostVideoWithThumbnail(input.videoFile, userId);
  if (upload.error || !upload.videoUrl) return { id: null, error: upload.error || "Video upload failed" };

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      tag: input.tag,
      post_kind: "hiring",
      job_title: input.jobTitle,
      description: input.description,
      category: input.category,
      job_type: normalizeJobTypesForDb(input.jobType),
      salary: input.salary || null,
      city: input.city,
      country: input.country,
      video_url: upload.videoUrl,
      thumbnail_url: upload.thumbnailUrl,
      is_public: input.isPublic,
      hidden_from_feed: input.hiddenFromFeed,
      work_arrangement: input.workArrangement || null,
      experience_level: input.experienceLevel || null,
      openings: input.openings ?? null,
      apply_url: input.applyUrl || null,
      deadline: input.deadline || null,
      full_address: input.fullAddress?.trim() || null,
      address_visibility: input.addressVisibility || "full",
    })
    .select("id")
    .single();
  if (error) return { id: null, error: error.message };
  return { id: data.id, error: null };
}

// ----- Lightweight social feed posts (for Job Seekers / Recruiter updates) -----

export interface CreateFeedPostInput {
  caption: string;
  hashtags?: string;
  city?: string;
  country?: string;
  videoFile: File;
  tag?: "job-seeker" | "hiring";
  /** "open_to_work" or "community" — drives the badge shown in the feed. */
  postKind?: "open_to_work" | "community";
  // Optional open-to-work fields
  desiredRole?: string;
  preferredLocation?: string;
  jobType?: VideoPost["jobType"] | VideoPost["jobType"][] | string;
  immediateStart?: boolean;
  salaryExpectation?: string;
}

export async function createFeedPost(
  input: CreateFeedPostInput
): Promise<{ id: string | null; error: string | null }> {
  const userId = await awaitCurrentUserId();
  if (!userId) return { id: null, error: "You must be signed in to post." };

  const upload = await uploadPostVideoWithThumbnail(input.videoFile, userId);
  if (upload.error || !upload.videoUrl)
    return { id: null, error: upload.error || "Video upload failed" };

  // Combine caption + hashtags into description; first line of caption -> job_title (required column)
  const caption = input.caption.trim();
  const hashtags = (input.hashtags || "")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .join(" ");
  const description = [caption, hashtags].filter(Boolean).join("\n\n");
  const titleSeed = caption.split("\n")[0].trim();
  const jobTitle = (titleSeed || "Update").slice(0, 80);

  const kind = input.postKind || "community";
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      tag: input.tag || "job-seeker",
      post_kind: kind,
      job_title: jobTitle,
      description,
      category: null,
      job_type: normalizeJobTypesForDb(input.jobType),
      salary: input.salaryExpectation || null,
      city: input.city || null,
      country: input.country || null,
      video_url: upload.videoUrl,
      thumbnail_url: upload.thumbnailUrl,
      is_public: true,
      hidden_from_feed: false,
      desired_role: input.desiredRole || null,
      preferred_location: input.preferredLocation || null,
      immediate_start: input.immediateStart ?? false,
    })
    .select("id")
    .single();
  if (error) return { id: null, error: error.message };
  return { id: data.id, error: null };
}

// ----- Workplace videos (Hiring accounts: branding/culture content) -----

export interface CreateWorkplaceVideoInput {
  caption: string;
  hashtags?: string;
  videoFile: File;
}

export async function createWorkplaceVideo(
  input: CreateWorkplaceVideoInput
): Promise<{ id: string | null; error: string | null }> {
  const userId = await awaitCurrentUserId();
  if (!userId) return { id: null, error: "You must be signed in to post." };

  const upload = await uploadPostVideoWithThumbnail(input.videoFile, userId);
  if (upload.error || !upload.videoUrl)
    return { id: null, error: upload.error || "Video upload failed" };

  const caption = input.caption.trim();
  const hashtags = (input.hashtags || "")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`))
    .join(" ");
  const description = [caption, hashtags].filter(Boolean).join("\n\n");
  const titleSeed = caption.split("\n")[0].trim();
  const jobTitle = (titleSeed || "Workplace").slice(0, 80);

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      tag: "hiring",
      post_kind: "workplace",
      is_workplace_video: true,
      job_title: jobTitle,
      description,
      category: null,
      video_url: upload.videoUrl,
      thumbnail_url: upload.thumbnailUrl,
      is_public: true,
      hidden_from_feed: false,
    })
    .select("id")
    .single();
  if (error) return { id: null, error: error.message };
  return { id: data.id, error: null };
}

export async function fetchAllPosts(): Promise<VideoPost[]> {
  const { data: rows, error } = await supabase
    .from("posts")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false });
  if (error || !rows) return [];

  const userIds = Array.from(new Set((rows as unknown as DbPostRow[]).map((r) => r.user_id)));
  const authors: Record<string, AuthorProfile> = {};
  if (userIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, role, company_name, company_logo_url, active_mode")
      .in("user_id", userIds);
    (profs || []).forEach((p) => { authors[p.user_id] = p as AuthorProfile; });
  }
  return (rows as DbPostRow[]).map((r) => dbRowToVideoPost(r, authors[r.user_id]));
}

export async function fetchUserPosts(userId: string): Promise<VideoPost[]> {
  const { data: rows, error } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !rows) return [];
  const { data: prof } = await supabase
    .from("profiles")
    .select("user_id, full_name, avatar_url, role, company_name, company_logo_url, active_mode")
    .eq("user_id", userId)
    .maybeSingle();
  return (rows as DbPostRow[]).map((r) => dbRowToVideoPost(r, prof as AuthorProfile | null));
}

export async function deletePost(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  return { error: error?.message || null };
}

export async function fetchPostById(id: string): Promise<DbPostRow | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as DbPostRow;
}

export interface UpdatePostInput {
  jobTitle: string;
  description: string;
  category: string;
  jobType: VideoPost["jobType"] | VideoPost["jobType"][];
  salary?: string;
  city: string;
  country: string;
  isPublic: boolean;
  hiddenFromFeed: boolean;
  workArrangement?: "remote" | "hybrid" | "onsite";
  experienceLevel?: string;
  openings?: number;
  deadline?: string;
  fullAddress?: string;
  addressVisibility?: "full" | "area" | "hidden";
  videoFile?: File | null;
}

export async function updatePost(
  id: string,
  input: UpdatePostInput
): Promise<{ error: string | null }> {
  const userId = await awaitCurrentUserId();
  if (!userId) return { error: "You must be signed in to update a post." };

  const updates: Record<string, any> = {
    job_title: input.jobTitle.trim(),
    description: input.description.trim() || null,
    category: input.category || null,
    job_type: normalizeJobTypesForDb(input.jobType),
    salary: input.salary?.trim() || null,
    city: input.city,
    country: input.country,
    is_public: input.isPublic,
    hidden_from_feed: input.hiddenFromFeed,
    work_arrangement: input.workArrangement || null,
    experience_level: input.experienceLevel?.trim() || null,
    openings: input.openings ?? null,
    deadline: input.deadline || null,
    full_address: input.fullAddress?.trim() || null,
    address_visibility: input.addressVisibility || "full",
  };

  if (input.videoFile) {
    const upload = await uploadPostVideoWithThumbnail(input.videoFile, userId);
    if (upload.error || !upload.videoUrl) return { error: upload.error || "Video upload failed" };
    updates.video_url = upload.videoUrl;
    updates.thumbnail_url = upload.thumbnailUrl;
  }

  const { error } = await supabase.from("posts").update(updates as any).eq("id", id);
  return { error: error?.message || null };
}