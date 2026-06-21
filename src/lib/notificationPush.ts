import { supabase } from "@/integrations/supabase/client";

export async function dispatchNotificationPush(notificationId: string) {
  try {
    await supabase.functions.invoke("process-notification-push", {
      body: { notification_id: notificationId },
    });
  } catch {
    /* Best-effort backup if database dispatch fails */
  }
}
