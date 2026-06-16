import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { awaitCurrentUserId } from "@/lib/authCache";

/**
 * Real-time count of unread notifications for the current user.
 * Excludes `message` type — messages have their own unread badge.
 */
export function useUnreadNotificationCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async (uid: string) => {
    const { count: c } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", uid)
      .eq("read", false)
      .neq("type", "message");
    setCount(c ?? 0);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let mounted = true;

    awaitCurrentUserId().then((uid) => {
      if (!mounted) return;
      if (!uid) {
        setCount(0);
        return;
      }
      refresh(uid);
      channel = supabase
        .channel(`unread-notifs-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${uid}` },
          () => refresh(uid)
        )
        .subscribe();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      if (uid) refresh(uid);
      else setCount(0);
    });

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  return { count };
}