import { supabase } from "@/integrations/supabase/client";
import { awaitCurrentUserId } from "@/lib/authCache";
import {
  isPushSupported,
  pushPreferenceEnabled,
  setNotificationsPreference,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/pushNotifications";

export function isNotificationsEnabled(profile: {
  email_notifications_enabled?: boolean | null;
  push_notifications_enabled?: boolean | null;
} | null | undefined): boolean {
  if (!profile) return true;
  return (
    profile.email_notifications_enabled !== false &&
    profile.push_notifications_enabled !== false
  );
}

export async function loadNotificationsEnabled(): Promise<boolean> {
  const uid = await awaitCurrentUserId();
  if (!uid) return true;
  const { data } = await supabase
    .from("profiles")
    .select("email_notifications_enabled, push_notifications_enabled")
    .eq("user_id", uid)
    .maybeSingle();
  return isNotificationsEnabled(data);
}

export async function setNotificationsEnabled(enabled: boolean): Promise<{ error: string | null }> {
  const uid = await awaitCurrentUserId();
  if (!uid) return { error: "Not signed in" };

  const { error } = await supabase
    .from("profiles")
    .update({
      email_notifications_enabled: enabled,
      push_notifications_enabled: enabled,
    })
    .eq("user_id", uid);

  if (error) return { error: error.message };

  setNotificationsPreference(enabled);

  if (!enabled) {
    await unsubscribeFromPush();
    return { error: null };
  }

  if (isPushSupported()) {
    const pushResult = await subscribeToPush();
    if (pushResult.error && Notification.permission === "denied") {
      return { error: null };
    }
    return pushResult;
  }

  return { error: null };
}

export async function syncNotificationsOnLogin(): Promise<void> {
  const uid = await awaitCurrentUserId();
  if (!uid || !pushPreferenceEnabled() || !isPushSupported()) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email_notifications_enabled, push_notifications_enabled")
    .eq("user_id", uid)
    .maybeSingle();

  if (!isNotificationsEnabled(profile)) return;

  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid);

  if ((count ?? 0) > 0) return;

  if (Notification.permission === "granted") {
    await subscribeToPush();
    return;
  }

  if (Notification.permission === "default") {
    await subscribeToPush();
  }
}
