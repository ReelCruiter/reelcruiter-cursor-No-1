import { supabase } from "@/integrations/supabase/client";
import { awaitCurrentUserId } from "@/lib/authCache";
import type { Database } from "@/integrations/supabase/types";

export type ReportReason = Database["public"]["Enums"]["report_reason"];

async function notifySafetyTeam(payload: {
  type: "block" | "report";
  otherUserId: string;
  reason?: ReportReason;
  description?: string;
}): Promise<{ emailSent: boolean; error: string | null }> {
  const { data, error } = await supabase.functions.invoke("notify-safety-event", {
    body: payload,
  });

  if (error) {
    return { emailSent: false, error: error.message || "Could not notify support team" };
  }

  const result = data as { emailSent?: boolean; error?: string } | null;
  if (result?.error) {
    return { emailSent: false, error: result.error };
  }

  return { emailSent: !!result?.emailSent, error: null };
}

export const REPORT_REASONS: { value: ReportReason; label: string; hint: string }[] = [
  { value: "spam", label: "Spam", hint: "Unwanted or repetitive messages and posts" },
  { value: "harassment", label: "Harassment", hint: "Bullying, threats, or targeted abuse" },
  { value: "inappropriate_content", label: "Inappropriate content", hint: "Offensive or unsafe profile material" },
  { value: "fake_job_scam", label: "Fake job or scam", hint: "Misleading roles, fees, or fraudulent hiring" },
  { value: "other", label: "Other", hint: "Something else that violates community standards" },
];

export type BlockStatus = "none" | "you-blocked" | "blocked-you";

export const BLOCK_CHANGED_EVENT = "reelcruiter:block-changed";

export function notifyBlockChanged(userId: string) {
  window.dispatchEvent(
    new CustomEvent(BLOCK_CHANGED_EVENT, { detail: { userId } })
  );
}

export async function getBlockStatus(otherUserId: string): Promise<BlockStatus> {
  const uid = await awaitCurrentUserId();
  if (!uid || uid === otherUserId) return "none";

  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocker_user_id, blocked_user_id")
    .or(
      `and(blocker_user_id.eq.${uid},blocked_user_id.eq.${otherUserId}),and(blocker_user_id.eq.${otherUserId},blocked_user_id.eq.${uid})`
    );

  if (error || !data?.length) return "none";

  const youBlocked = data.some((r) => r.blocker_user_id === uid);
  const theyBlocked = data.some((r) => r.blocker_user_id === otherUserId);
  if (youBlocked) return "you-blocked";
  if (theyBlocked) return "blocked-you";
  return "none";
}

export async function isUserBlocked(blockedUserId: string): Promise<boolean> {
  return (await getBlockStatus(blockedUserId)) === "you-blocked";
}

export async function blockUser(
  blockedUserId: string
): Promise<{ ok: boolean; error: string | null; emailWarning: string | null }> {
  const uid = await awaitCurrentUserId();
  if (!uid) return { ok: false, error: "not-signed-in", emailWarning: null };
  if (uid === blockedUserId) return { ok: false, error: "cannot-block-self", emailWarning: null };
  const { error } = await supabase.from("user_blocks").insert({
    blocker_user_id: uid,
    blocked_user_id: blockedUserId,
  });
  if (error) {
    if (error.code === "23505") return { ok: true, error: null, emailWarning: null };
    return { ok: false, error: error.message, emailWarning: null };
  }
  notifyBlockChanged(blockedUserId);
  const mail = await notifySafetyTeam({ type: "block", otherUserId: blockedUserId });
  return {
    ok: true,
    error: null,
    emailWarning: mail.emailSent ? null : mail.error,
  };
}

export async function unblockUser(
  blockedUserId: string
): Promise<{ ok: boolean; error: string | null }> {
  const uid = await awaitCurrentUserId();
  if (!uid) return { ok: false, error: "not-signed-in" };
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_user_id", uid)
    .eq("blocked_user_id", blockedUserId);
  if (error) return { ok: false, error: error.message };
  notifyBlockChanged(blockedUserId);
  return { ok: true, error: null };
}

export async function reportUser(input: {
  reportedUserId: string;
  reason: ReportReason;
  description?: string;
}): Promise<{ ok: boolean; error: string | null; emailWarning: string | null }> {
  const uid = await awaitCurrentUserId();
  if (!uid) return { ok: false, error: "not-signed-in", emailWarning: null };
  if (uid === input.reportedUserId) return { ok: false, error: "cannot-report-self", emailWarning: null };
  const { error } = await supabase.from("user_reports").insert({
    reporter_user_id: uid,
    reported_user_id: input.reportedUserId,
    reason: input.reason,
    description: input.description?.trim() || null,
  });
  if (error) {
    return { ok: false, error: error.message, emailWarning: null };
  }

  const mail = await notifySafetyTeam({
    type: "report",
    otherUserId: input.reportedUserId,
    reason: input.reason,
    description: input.description,
  });

  return {
    ok: true,
    error: null,
    emailWarning: mail.emailSent ? null : mail.error,
  };
}
