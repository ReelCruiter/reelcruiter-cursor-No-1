import { supabase } from "@/integrations/supabase/client";

export const SUPPORT_ATTACHMENT_ACCEPT =
  "image/*,application/pdf,.doc,.docx,.txt,video/mp4,video/webm";

export const SUPPORT_MAX_ATTACHMENTS = 5;
export const SUPPORT_MAX_FILE_BYTES = 10 * 1024 * 1024;

export type SupportAttachmentMeta = {
  path: string;
  name: string;
  contentType: string;
};

export function validateSupportAttachment(file: File): string | null {
  if (file.size > SUPPORT_MAX_FILE_BYTES) {
    return `${file.name} is too large (max 10MB per file)`;
  }

  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  const allowed =
    type.startsWith("image/") ||
    type.startsWith("video/") ||
    type === "application/pdf" ||
    type === "application/msword" ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    type === "text/plain" ||
    name.endsWith(".pdf") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".txt") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    name.endsWith(".gif") ||
    name.endsWith(".mp4") ||
    name.endsWith(".webm");

  if (!allowed) {
    return `${file.name} is not a supported file type`;
  }

  return null;
}

export async function uploadSupportAttachments(
  userId: string,
  files: File[],
): Promise<{ attachments: SupportAttachmentMeta[]; error: string | null }> {
  const attachments: SupportAttachmentMeta[] = [];

  for (const file of files) {
    const validationError = validateSupportAttachment(file);
    if (validationError) {
      return { attachments: [], error: validationError };
    }

    const ext = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("support-attachments")
      .upload(path, file, { contentType: file.type || undefined, upsert: false });

    if (error) {
      return { attachments: [], error: error.message || "Could not upload attachment" };
    }

    attachments.push({
      path,
      name: file.name,
      contentType: file.type || "application/octet-stream",
    });
  }

  return { attachments, error: null };
}
