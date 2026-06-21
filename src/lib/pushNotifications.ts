import { supabase } from "@/integrations/supabase/client";
import { awaitCurrentUserId } from "@/lib/authCache";

const PUSH_PREF_KEY = "reelcruiter:push-enabled";

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() || "";

export function setNotificationsPreference(enabled: boolean) {
  try {
    localStorage.setItem(PUSH_PREF_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function pushPreferenceEnabled(): boolean {
  try {
    const value = localStorage.getItem(PUSH_PREF_KEY);
    if (value === "0") return false;
    return true;
  } catch {
    return true;
  }
}

export function isPushConfigured(): boolean {
  return vapidPublicKey.length > 20;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    isPushConfigured()
  );
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function subscribeToPush(): Promise<{ error: string | null }> {
  if (!isPushSupported()) {
    return { error: "Push notifications are not supported on this device or browser." };
  }

  const userId = await awaitCurrentUserId();
  if (!userId) return { error: "You must be signed in." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { error: "Notification permission was denied." };
  }

  const registration = await registerServiceWorker();
  if (!registration) return { error: "Could not register the notification service." };

  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const json = subscription.toJSON();
  if (!json.keys?.p256dh || !json.keys?.auth) {
    return { error: "Could not read push subscription keys." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) return { error: error.message };

  await supabase
    .from("profiles")
    .update({
      email_notifications_enabled: true,
      push_notifications_enabled: true,
    })
    .eq("user_id", userId);

  setNotificationsPreference(true);
  return { error: null };
}

export async function unsubscribeFromPush(): Promise<void> {
  const userId = await awaitCurrentUserId();

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      if (userId) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", endpoint);
      }
    }
  }

  if (userId) {
    await supabase.from("push_subscriptions").delete().eq("user_id", userId);
    await supabase
      .from("profiles")
      .update({
        email_notifications_enabled: false,
        push_notifications_enabled: false,
      })
      .eq("user_id", userId);
  }

  setNotificationsPreference(false);
}

/** Re-attach push subscription after sign-in when notifications stay enabled. */
export async function syncPushSubscriptionOnLogin(): Promise<void> {
  const { syncNotificationsOnLogin } = await import("@/lib/notificationPreferences");
  await syncNotificationsOnLogin();
}
