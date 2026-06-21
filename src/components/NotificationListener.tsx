import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authCache";
import { notificationHeadline, notificationPath, type AppNotificationType } from "@/lib/notificationCopy";
import { dispatchNotificationEmail } from "@/lib/notificationEmail";

const BROWSER_NOTIF_KEY = "reelcruiter:browser-notifications";

export function browserNotificationsEnabled(): boolean {
  try {
    return localStorage.getItem(BROWSER_NOTIF_KEY) === "1";
  } catch {
    return false;
  }
}

export function setBrowserNotificationsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(BROWSER_NOTIF_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

type NotificationRow = {
  id: string;
  actor_id: string;
  type: AppNotificationType;
  post_id: string | null;
  message: string | null;
};

/** Realtime in-app alerts + optional browser notifications while using the site. */
const NotificationListener = () => {
  const { userId, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!ready || !userId) return;

    const channel = supabase
      .channel(`live-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as NotificationRow;
          if (!row?.id || seen.current.has(row.id)) return;
          seen.current.add(row.id);

          void dispatchNotificationEmail(row.id);

          const { data: actor } = await supabase
            .from("profiles")
            .select("full_name, company_name, active_mode")
            .eq("user_id", row.actor_id)
            .maybeSingle();

          const hiring = actor?.active_mode === "hiring";
          const name =
            (hiring ? actor?.company_name : actor?.full_name)?.trim() || "Someone";
          const headline = notificationHeadline(row.type, name);
          const path = notificationPath(row.type, row.actor_id, row.post_id);

          const onMessagesPage = location.pathname.startsWith("/messages");
          const showToast = row.type !== "message" || !onMessagesPage;

          if (showToast) {
            toast(headline, {
              description: row.message || undefined,
              action: {
                label: "View",
                onClick: () => navigate(path),
              },
            });
          }

          if (
            browserNotificationsEnabled() &&
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted" &&
            document.visibilityState !== "visible"
          ) {
            try {
              const n = new Notification("ReelCruiter", {
                body: row.message ? `${headline}\n${row.message}` : headline,
                tag: row.id,
              });
              n.onclick = () => {
                window.focus();
                navigate(path);
                n.close();
              };
            } catch {
              /* ignore */
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, ready, navigate, location.pathname]);

  return null;
};

export default NotificationListener;
