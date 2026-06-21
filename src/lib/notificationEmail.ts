import { supabase } from "@/integrations/supabase/client";

export async function dispatchNotificationEmail(notificationId: string) {
  try {
    await supabase.functions.invoke("process-notification-email", {
      body: { notification_id: notificationId },
    });
  } catch {
    /* Best-effort backup if database webhook dispatch fails */
  }
}
