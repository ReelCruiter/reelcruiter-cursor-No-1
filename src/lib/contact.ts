import { supabase } from "@/integrations/supabase/client";

export async function submitContactInquiry(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
  website?: string;
}): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke("submit-contact", {
    body: {
      name: input.name.trim(),
      email: input.email.trim(),
      subject: input.subject.trim(),
      message: input.message.trim(),
      website: input.website?.trim() ?? "",
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
