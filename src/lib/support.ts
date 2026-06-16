import { supabase } from "@/integrations/supabase/client";
import type { SupportAttachmentMeta } from "@/lib/supportAttachments";

export async function submitSupportMessage(input: {
  subject: string;
  message: string;
  attachments?: SupportAttachmentMeta[];
}): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke("submit-support", {
    body: {
      subject: input.subject.trim(),
      message: input.message.trim(),
      attachments: input.attachments ?? [],
    },
  });

  if (error) {
    return { error: error.message || "Could not send your message" };
  }

  const payload = data as { error?: string } | null;
  if (payload?.error) {
    return { error: payload.error };
  }

  return { error: null };
}
