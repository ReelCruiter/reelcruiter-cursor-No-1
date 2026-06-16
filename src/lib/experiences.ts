import { supabase } from "@/integrations/supabase/client";
import type { Experience } from "@/lib/models";

export interface DbExperienceRow {
  id: string;
  user_id: string;
  title: string;
  company: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  video_url: string | null;
  category: string;
  created_at: string;
  updated_at: string;
}

export const dbRowToExperience = (row: DbExperienceRow): Experience => ({
  id: row.id,
  title: row.title,
  company: row.company,
  startDate: row.start_date,
  endDate: row.end_date,
  isCurrent: row.is_current,
  videoUrl: row.video_url || "",
  category: row.category,
});

export async function uploadExperienceVideo(
  file: File,
  userId: string
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split(".").pop() || "mp4";
  const path = `${userId}/experiences/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("post-videos")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from("post-videos").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export async function fetchUserExperiences(userId: string): Promise<Experience[]> {
  const { data, error } = await supabase
    .from("experiences")
    .select("*")
    .eq("user_id", userId)
    .order("is_current", { ascending: false })
    .order("end_date", { ascending: false, nullsFirst: true })
    .order("start_date", { ascending: false });
  if (error || !data) return [];
  return (data as DbExperienceRow[]).map(dbRowToExperience);
}

export interface ExperienceInput {
  title: string;
  company: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  videoUrl: string;
  category: string;
}

export async function createExperience(
  input: ExperienceInput
): Promise<{ id: string | null; error: string | null }> {
  const { awaitCurrentUserId } = await import("@/lib/authCache");
  const userId = await awaitCurrentUserId();
  if (!userId) return { id: null, error: "You must be signed in." };
  const { data, error } = await supabase
    .from("experiences")
    .insert({
      user_id: userId,
      title: input.title,
      company: input.company,
      start_date: input.startDate,
      end_date: input.isCurrent ? null : input.endDate,
      is_current: input.isCurrent,
      video_url: input.videoUrl || null,
      category: input.category,
    })
    .select("id")
    .single();
  if (error) return { id: null, error: error.message };
  return { id: data.id, error: null };
}

export async function updateExperienceDb(
  id: string,
  input: ExperienceInput
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("experiences")
    .update({
      title: input.title,
      company: input.company,
      start_date: input.startDate,
      end_date: input.isCurrent ? null : input.endDate,
      is_current: input.isCurrent,
      video_url: input.videoUrl || null,
      category: input.category,
    })
    .eq("id", id);
  return { error: error?.message || null };
}

export async function deleteExperienceDb(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from("experiences").delete().eq("id", id);
  return { error: error?.message || null };
}
