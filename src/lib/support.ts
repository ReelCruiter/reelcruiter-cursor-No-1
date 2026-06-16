import { supabase } from "@/integrations/supabase/client";

export async function submitSupportMessage(input: {
  subject: string;
  message: string;
}): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke("submit-support", {
    body: {
      subject: input.subject.trim(),
      message: input.message.trim(),
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
