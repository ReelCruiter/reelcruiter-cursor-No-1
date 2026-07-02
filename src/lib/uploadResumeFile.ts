import { toast } from "sonner";
import { useProfileStore } from "@/lib/profileStore";
import type { ApplyResumeResult } from "@/lib/applyResumeToProfile";

const fileToDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

export interface UploadResumeOptions {
  hidePhone?: boolean;
  /** When true, shows success/error toasts (Edit Profile). Off for onboarding step flow. */
  showToasts?: boolean;
}

export interface UploadResumeOutcome {
  filled: ApplyResumeResult;
  phoneBlurred: boolean;
  error?: string;
}

export async function uploadResumeFile(
  file: File,
  options: UploadResumeOptions = {}
): Promise<UploadResumeOutcome> {
  const { hidePhone = false, showToasts = true } = options;
  const { applyResumeFromFile, updateProfile, saveProfileToDb } = useProfileStore.getState();

  const emptyResult: ApplyResumeResult = {
    bio: false,
    name: false,
    location: false,
    skills: 0,
    experiences: 0,
  };

  const toastId = showToasts
    ? toast.loading(hidePhone ? "Reading your CV and blurring phone number…" : "Reading your CV…")
    : undefined;

  try {
    const filled = await applyResumeFromFile(file);

    let uploadFile = file;
    let phoneBlurred = false;
    if (hidePhone) {
      try {
        const { blurPhoneNumbersInPdf, pdfContainsPhoneNumber } = await import(
          "@/lib/resumePhoneRedact"
        );
        if (await pdfContainsPhoneNumber(file)) {
          uploadFile = await blurPhoneNumbersInPdf(file);
          phoneBlurred = true;
        }
      } catch {
        if (showToasts && toastId) {
          toast.warning("Could not blur your phone number. Saved the original CV instead.", {
            id: toastId,
          });
        }
      }
    }

    const url = await fileToDataUrl(uploadFile);
    updateProfile({ resumeUrl: url, resumeName: uploadFile.name });

    const save = await saveProfileToDb();
    if (save.error) {
      await useProfileStore.getState().loadProfileFromDb();
      if (showToasts && toastId) toast.error(save.error, { id: toastId });
      return { filled, phoneBlurred, error: save.error };
    }

    if (showToasts && toastId) {
      const { resumeAiErrorMessage } = await import("@/lib/resumeAnalyze");
      const aiWarning = resumeAiErrorMessage(filled.aiError, filled.bio);

      const parts: string[] = [];
      if (filled.bio) parts.push("About");
      if (filled.skills) {
        parts.push(`${filled.skills} skill${filled.skills === 1 ? "" : "s"}`);
      }
      if (filled.name) parts.push("name");
      if (filled.location) parts.push("location");
      if (phoneBlurred) parts.push("phone blurred");

      if (aiWarning) {
        toast.warning(
          parts.length
            ? `CV saved (${parts.join(", ")}). ${aiWarning}`
            : aiWarning,
          { id: toastId, duration: 10000 }
        );
      } else {
        toast.success(
          parts.length
            ? `Profile updated from your CV (${parts.join(", ")})`
            : hidePhone
              ? "Resume uploaded (no phone number detected to blur)"
              : "Resume uploaded to your profile",
          { id: toastId }
        );
      }
    }

    return { filled, phoneBlurred };
  } catch {
    const message = "Resume added, but we could not read it. Try a text-based PDF.";
    if (showToasts && toastId) toast.error(message, { id: toastId });
    return { filled: emptyResult, phoneBlurred: false, error: message };
  }
}
