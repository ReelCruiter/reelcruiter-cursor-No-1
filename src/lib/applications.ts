import { supabase } from "@/integrations/supabase/client";
import { awaitCurrentUserId } from "@/lib/authCache";

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** Route to review applicants for a job you posted. */
export function manageJobApplicationsPath(postId: string): string {
  return `/my-jobs/${postId.trim()}/applications`;
}

export type JobStatus = "active" | "paused" | "closed";

/** Start of today in local time (for deadline comparisons). */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isDeadlinePast(deadline: string | null | undefined): boolean {
  if (!deadline) return false;
  const d = new Date(deadline);
  return !isNaN(d.getTime()) && d < startOfToday();
}

/** Yesterday as YYYY-MM-DD — used when closing/filling a job. */
function yesterdayIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

type PostStatusFields = {
  deadline?: string | null;
  is_public?: boolean | null;
  hidden_from_feed?: boolean | null;
};

/** Derive listing status from visibility flags and application deadline. */
export function deriveJobStatus(post: PostStatusFields): JobStatus {
  if (isDeadlinePast(post.deadline) || post.is_public === false) {
    return "closed";
  }
  if (post.hidden_from_feed === true) {
    return "paused";
  }
  return "active";
}

export function isJobAcceptingApplications(post: PostStatusFields): boolean {
  return deriveJobStatus(post) === "active";
}

/** Map feed/profile post fields to job listing status checks. */
export function jobListingStatusFields(post: {
  deadline?: string;
  isPublic?: boolean;
  hiddenFromFeed?: boolean;
}): PostStatusFields {
  return {
    deadline: post.deadline ?? null,
    is_public: post.isPublic ?? true,
    hidden_from_feed: post.hiddenFromFeed ?? false,
  };
}

export function isActiveJobListing(post: {
  deadline?: string;
  isPublic?: boolean;
  hiddenFromFeed?: boolean;
}): boolean {
  return isJobAcceptingApplications(jobListingStatusFields(post));
}

export type ApplicationStatus = "new" | "viewed" | "shortlisted" | "rejected";

export interface ReceivedApplication {
  id: string;
  postId: string;
  postTitle: string;
  applicantId: string;
  applicantName: string;
  applicantAvatar: string;
  coverNote: string | null;
  createdAt: string;
  status: ApplicationStatus;
}

export interface MyJobSummary {
  id: string;
  title: string;
  city: string | null;
  country: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  companyLogoUrl: string | null;
  status: JobStatus;
  tag: string;
  createdAt: string;
  totalApplicants: number;
  newApplicants: number;
  shortlisted: number;
}

/** Full job context for the manage-job page (owner only). */
export interface ManagedJobDetail {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  country: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  category: string | null;
  jobType: string | null;
  salary: string | null;
  deadline: string | null;
  status: JobStatus;
  createdAt: string;
}

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  active: "Active",
  paused: "Paused",
  closed: "Closed",
};

export const JOB_STATUS_HINT: Record<JobStatus, string> = {
  active: "Live in the feed. Candidates can discover this job and apply.",
  paused: "Hidden from the feed. You can still review existing applicants.",
  closed: "Marked as filled. Not accepting new applications.",
};

export const JOB_STATUS_CLASS: Record<JobStatus, string> = {
  active: "bg-green-500/15 text-green-700 dark:text-green-400 ring-1 ring-green-500/30",
  paused: "bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30",
  closed: "bg-muted text-muted-foreground ring-1 ring-border",
};

export interface MyApplication {
  id: string;
  postId: string;
  postTitle: string;
  employerId: string;
  employerName: string;
  employerAvatar: string;
  city: string | null;
  country: string | null;
  thumbnailUrl: string | null;
  status: ApplicationStatus;
  createdAt: string;
}

export async function fetchMyApplications(): Promise<MyApplication[]> {
  const uid = await awaitCurrentUserId();
  if (!uid) return [];

  const { data: apps } = await supabase
    .from("job_applications")
    .select("id, post_id, status, created_at")
    .eq("applicant_id", uid)
    .order("created_at", { ascending: false });

  const list = apps || [];
  if (list.length === 0) return [];

  const postIds = Array.from(new Set(list.map((a) => a.post_id)));
  const { data: posts } = await supabase
    .from("posts")
    .select("id, job_title, city, country, thumbnail_url, user_id")
    .in("id", postIds);
  const postMap: Record<string, any> = {};
  (posts || []).forEach((p) => { postMap[p.id] = p; });

  const ownerIds = Array.from(new Set((posts || []).map((p) => p.user_id)));
  const profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
  if (ownerIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, company_name, company_logo_url")
      .in("user_id", ownerIds);
    (profs || []).forEach((p: any) => {
      profiles[p.user_id] = {
        full_name: p.company_name || p.full_name,
        avatar_url: p.company_logo_url || p.avatar_url,
      };
    });
  }

  return list.map((a: any) => {
    const p = postMap[a.post_id];
    const ownerId = p?.user_id || "";
    return {
      id: a.id,
      postId: a.post_id,
      postTitle: p?.job_title || "Job post",
      employerId: ownerId,
      employerName: profiles[ownerId]?.full_name || "Employer",
      employerAvatar: profiles[ownerId]?.avatar_url || "",
      city: p?.city || null,
      country: p?.country || null,
      thumbnailUrl: p?.thumbnail_url || null,
      status: (a.status || "new") as ApplicationStatus,
      createdAt: a.created_at,
    };
  });
}

export async function hasApplied(postId: string): Promise<boolean> {
  if (!isUuid(postId)) return false;
  const uid = await awaitCurrentUserId();
  if (!uid) return false;
  const { data } = await supabase
    .from("job_applications")
    .select("id")
    .eq("post_id", postId)
    .eq("applicant_id", uid)
    .maybeSingle();
  return !!data;
}

export async function fetchApplicantCount(postId: string): Promise<number> {
  if (!isUuid(postId)) return 0;
  const { count } = await supabase
    .from("job_applications")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);
  return count || 0;
}

/**
 * Exact applicant count label (real data only).
 * 0 → "0 applicants", 1 → "1 applicant", N → "N applicants".
 */
export function formatApplicantCount(count: number): string {
  const n = Math.max(0, Math.floor(count || 0));
  return `${n} ${n === 1 ? "applicant" : "applicants"}`;
}

export async function applyToPost(
  postId: string,
  coverNote?: string
): Promise<{ ok: boolean; error: string | null }> {
  if (!isUuid(postId)) return { ok: false, error: "invalid-post" };
  const uid = await awaitCurrentUserId();
  if (!uid) return { ok: false, error: "not-signed-in" };

  const { data: post } = await supabase
    .from("posts")
    .select("is_public, hidden_from_feed, deadline")
    .eq("id", postId)
    .maybeSingle();
  if (!post || !isJobAcceptingApplications(post)) {
    return { ok: false, error: "This job is no longer accepting applications" };
  }

  const { error } = await supabase
    .from("job_applications")
    .insert({ post_id: postId, applicant_id: uid, cover_note: coverNote || null });
  if (error) {
    if (error.code === "23505") return { ok: true, error: null };
    return { ok: false, error: error.message };
  }
  return { ok: true, error: null };
}

export async function withdrawApplication(
  postId: string
): Promise<{ ok: boolean; error: string | null }> {
  if (!isUuid(postId)) return { ok: false, error: "invalid-post" };
  const uid = await awaitCurrentUserId();
  if (!uid) return { ok: false, error: "not-signed-in" };
  const { error } = await supabase
    .from("job_applications")
    .delete()
    .eq("post_id", postId)
    .eq("applicant_id", uid);
  return { ok: !error, error: error?.message || null };
}

export async function updateApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase
    .from("job_applications")
    .update({ status })
    .eq("id", applicationId);
  return { ok: !error, error: error?.message || null };
}

export async function fetchMyJobs(): Promise<MyJobSummary[]> {
  const uid = await awaitCurrentUserId();
  if (!uid) return [];

  const { data: posts } = await supabase
    .from("posts")
    .select("id, job_title, city, country, thumbnail_url, video_url, tag, post_kind, created_at, deadline, is_public, hidden_from_feed")
    .eq("user_id", uid)
    .eq("tag", "hiring")
    .order("created_at", { ascending: false });

  const list = posts || [];
  if (list.length === 0) return [];

  const ids = list.map((p) => p.id);
  const { data: apps } = await supabase
    .from("job_applications")
    .select("post_id, status")
    .in("post_id", ids);

  const counts: Record<string, { total: number; nu: number; sh: number }> = {};
  (apps || []).forEach((a: any) => {
    const c = counts[a.post_id] || { total: 0, nu: 0, sh: 0 };
    c.total += 1;
    if (a.status === "new") c.nu += 1;
    if (a.status === "shortlisted") c.sh += 1;
    counts[a.post_id] = c;
  });

  // Fetch this user's profile once for company logo fallback
  const { data: prof } = await supabase
    .from("profiles")
    .select("avatar_url, company_logo_url")
    .eq("user_id", uid)
    .maybeSingle();
  // Hiring posts represent a company — prefer the company logo when present.
  const companyLogoUrl =
    (prof as any)?.company_logo_url || (prof as any)?.avatar_url || null;

  return list.map((p: any) => {
    const status = deriveJobStatus(p);
    return {
    id: p.id,
    title: p.job_title,
    city: p.city,
    country: p.country,
    thumbnailUrl: p.thumbnail_url,
      videoUrl: p.video_url || null,
      companyLogoUrl,
      status,
    tag: p.tag,
    createdAt: p.created_at,
    totalApplicants: counts[p.id]?.total || 0,
    newApplicants: counts[p.id]?.nu || 0,
    shortlisted: counts[p.id]?.sh || 0,
    };
  });
}

export async function fetchApplicationsForPost(postId: string): Promise<{
  post: ManagedJobDetail | null;
  applications: ReceivedApplication[];
  error?: string | null;
}> {
  const normalizedId = postId.trim();
  if (!isUuid(normalizedId)) {
    return { post: null, applications: [], error: "invalid-post" };
  }
  const uid = await awaitCurrentUserId();
  if (!uid) return { post: null, applications: [], error: "not-signed-in" };

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select(
      "id, job_title, description, user_id, city, country, thumbnail_url, video_url, category, job_type, salary, deadline, created_at, is_public, hidden_from_feed"
    )
    .eq("id", normalizedId)
    .maybeSingle();
  if (postError) {
    return { post: null, applications: [], error: postError.message };
  }
  if (!post || post.user_id !== uid) {
    return { post: null, applications: [], error: "not-owner" };
  }

  const { data: apps, error: appsError } = await supabase
    .from("job_applications")
    .select("id, post_id, applicant_id, cover_note, created_at, status")
    .eq("post_id", normalizedId)
    .order("created_at", { ascending: false });
  if (appsError) {
    return { post: null, applications: [], error: appsError.message };
  }

  const list = apps || [];
  const applicantIds = Array.from(new Set(list.map((a) => a.applicant_id)));
  const profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
  if (applicantIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", applicantIds);
    (profs || []).forEach((p: any) => {
      profiles[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
    });
  }

  const managed: ManagedJobDetail = {
    id: post.id,
    title: post.job_title,
    description: post.description,
    city: post.city,
    country: post.country,
    thumbnailUrl: post.thumbnail_url,
    videoUrl: post.video_url,
    category: post.category,
    jobType: post.job_type,
    salary: post.salary,
    deadline: post.deadline,
    status: deriveJobStatus(post),
    createdAt: post.created_at,
  };

  return {
    post: managed,
    applications: list.map((a: any) => ({
      id: a.id,
      postId: a.post_id,
      postTitle: post.job_title,
      applicantId: a.applicant_id,
      applicantName: profiles[a.applicant_id]?.full_name || "Member",
      applicantAvatar: profiles[a.applicant_id]?.avatar_url || "",
      coverNote: a.cover_note,
      createdAt: a.created_at,
      status: (a.status || "new") as ApplicationStatus,
    })),
  };
}

export async function fetchReceivedApplications(): Promise<ReceivedApplication[]> {
  const uid = await awaitCurrentUserId();
  if (!uid) return [];

  const { data: myPosts } = await supabase
    .from("posts")
    .select("id, job_title")
    .eq("user_id", uid);
  const postIds = (myPosts || []).map((p) => p.id);
  if (postIds.length === 0) return [];
  const titleById: Record<string, string> = {};
  (myPosts || []).forEach((p) => { titleById[p.id] = p.job_title; });

  const { data: apps } = await supabase
    .from("job_applications")
    .select("id, post_id, applicant_id, cover_note, created_at, status")
    .in("post_id", postIds)
    .order("created_at", { ascending: false });

  const list = apps || [];
  const applicantIds = Array.from(new Set(list.map((a) => a.applicant_id)));
  const profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
  if (applicantIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", applicantIds);
    (profs || []).forEach((p) => {
      profiles[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
    });
  }

  return list.map((a: any) => ({
    id: a.id,
    postId: a.post_id,
    postTitle: titleById[a.post_id] || "Job post",
    applicantId: a.applicant_id,
    applicantName: profiles[a.applicant_id]?.full_name || "Member",
    applicantAvatar: profiles[a.applicant_id]?.avatar_url || "",
    coverNote: a.cover_note,
    createdAt: a.created_at,
    status: (a.status || "new") as ApplicationStatus,
  }));
}

export async function fetchReceivedApplicationsCount(): Promise<number> {
  const uid = await awaitCurrentUserId();
  if (!uid) return 0;
  const { data: myPosts } = await supabase
    .from("posts").select("id").eq("user_id", uid);
  const ids = (myPosts || []).map((p) => p.id);
  if (!ids.length) return 0;
  const { count } = await supabase
    .from("job_applications")
    .select("id", { count: "exact", head: true })
    .in("post_id", ids);
  return count || 0;
}

export async function fetchNewApplicantsCount(): Promise<number> {
  const uid = await awaitCurrentUserId();
  if (!uid) return 0;
  const { data: myPosts } = await supabase
    .from("posts").select("id").eq("user_id", uid);
  const ids = (myPosts || []).map((p) => p.id);
  if (!ids.length) return 0;
  const { count } = await supabase
    .from("job_applications")
    .select("id", { count: "exact", head: true })
    .in("post_id", ids)
    .eq("status", "new");
  return count || 0;
}

export async function toggleJobStatus(
  postId: string,
  status: "active" | "paused"
): Promise<{ ok: boolean; error: string | null }> {
  if (!isUuid(postId)) return { ok: false, error: "invalid-post" };
  const { error } = await supabase
    .from("posts")
    .update({
      is_public: true,
      hidden_from_feed: status === "paused",
    })
    .eq("id", postId);
  return { ok: !error, error: error?.message || null };
}

export async function deleteMyJob(
  postId: string
): Promise<{ ok: boolean; error: string | null }> {
  if (!isUuid(postId)) return { ok: false, error: "invalid-post" };
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  return { ok: !error, error: error?.message || null };
}

export async function closeJob(
  postId: string
): Promise<{ ok: boolean; error: string | null }> {
  if (!isUuid(postId)) return { ok: false, error: "invalid-post" };
  const deadlineStr = yesterdayIsoDate();
  const { error } = await supabase
    .from("posts")
    .update({ is_public: false, hidden_from_feed: true, deadline: deadlineStr })
    .eq("id", postId);
  return { ok: !error, error: error?.message || null };
}

export async function reopenJob(
  postId: string
): Promise<{ ok: boolean; error: string | null }> {
  if (!isUuid(postId)) return { ok: false, error: "invalid-post" };
  const { error } = await supabase
    .from("posts")
    .update({ is_public: true, hidden_from_feed: false, deadline: null })
    .eq("id", postId);
  return { ok: !error, error: error?.message || null };
}

export async function repostJob(
  postId: string,
  closeOriginal: boolean
): Promise<{ ok: boolean; newId: string | null; error: string | null }> {
  if (!isUuid(postId)) return { ok: false, newId: null, error: "invalid-post" };
  const uid = await awaitCurrentUserId();
  if (!uid) return { ok: false, newId: null, error: "not-signed-in" };

  const { data: original } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();
  if (!original) return { ok: false, newId: null, error: "post-not-found" };
  if (original.user_id !== uid) return { ok: false, newId: null, error: "not-owner" };

  // Fresh listing: never inherit a past deadline from a closed/filled post.
  const { data: inserted, error: insertError } = await supabase
    .from("posts")
    .insert({
      user_id: uid,
      tag: original.tag,
      post_kind: original.post_kind,
      job_title: original.job_title,
      description: original.description,
      category: original.category,
      job_type: original.job_type,
      salary: original.salary,
      city: original.city,
      country: original.country,
      video_url: original.video_url,
      thumbnail_url: original.thumbnail_url,
      is_public: true,
      hidden_from_feed: false,
      work_arrangement: original.work_arrangement,
      experience_level: original.experience_level,
      openings: original.openings,
      apply_url: original.apply_url,
      deadline: null,
      immediate_start: original.immediate_start,
      desired_role: original.desired_role,
      preferred_location: original.preferred_location,
      full_address: original.full_address,
      address_visibility: original.address_visibility,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return { ok: false, newId: null, error: insertError?.message || "repost-failed" };
  }

  if (closeOriginal) {
    const deadlineStr = yesterdayIsoDate();
    await supabase
      .from("posts")
      .update({ is_public: false, hidden_from_feed: true, deadline: deadlineStr })
      .eq("id", postId);
  }

  return { ok: true, newId: inserted.id, error: null };
}
