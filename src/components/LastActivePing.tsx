import { useEffect } from "react";
import { useAuth } from "@/lib/authCache";
import { touchLastActive } from "@/lib/presence";

const PING_INTERVAL_MS = 2 * 60 * 1000;

/** Keeps the signed in user's last_active_at fresh while they use the app. */
const LastActivePing = () => {
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) return;

    touchLastActive(userId);

    const onVisible = () => {
      if (document.visibilityState === "visible") touchLastActive(userId);
    };

    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => touchLastActive(userId), PING_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, [userId]);

  return null;
};

export default LastActivePing;
