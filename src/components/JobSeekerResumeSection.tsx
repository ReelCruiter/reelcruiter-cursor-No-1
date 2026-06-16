import { useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Trash2, Upload as UploadIcon } from "lucide-react";
import { toast } from "sonner";
import ResumePdfActions from "@/components/ResumePdfActions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useProfileStore } from "@/lib/profileStore";
import { uploadResumeFile } from "@/lib/uploadResumeFile";

interface JobSeekerResumeSectionProps {
  variant: "profile" | "edit";
}

const JobSeekerResumeSection = ({ variant }: JobSeekerResumeSectionProps) => {
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const saveProfileToDb = useProfileStore((s) => s.saveProfileToDb);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hidePhoneOnResume, setHidePhoneOnResume] = useState(false);

  const hasResume = Boolean(profile.resumeUrl);
  const isPublishing = hasResume && profile.resumeUrl.startsWith("data:");
  const busy = uploading || deleting;

  const onFile = async (f: File | null) => {
    if (!f) return;
    const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    if (!isPdf) {
      toast.error("Please choose a PDF file");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Resume must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      await uploadResumeFile(f, { hidePhone: hidePhoneOnResume, showToasts: true });
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      updateProfile({ resumeUrl: "", resumeName: "" });
      const save = await saveProfileToDb();
      if (save.error) {
        toast.error(save.error);
        return;
      }
      toast.success("CV removed from your profile");
    } finally {
      setDeleting(false);
    }
  };

  const introCopy =
    variant === "edit"
      ? "Upload a PDF to auto fill Bio and location. Recruiters can preview it on your profile."
      : "Recruiters can open your full CV from this section.";

  const body = (
    <>
      <p className="text-xs text-muted-foreground leading-relaxed">{introCopy}</p>

      <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-3">
        <div className="space-y-1">
          <Label htmlFor={`hide-phone-cv-${variant}`} className="text-sm font-medium leading-snug">
            Blur phone number on CV
          </Label>
            <p className="text-xs text-muted-foreground">
              Hides phone numbers in the saved PDF.
            </p>
        </div>
        <Switch
          id={`hide-phone-cv-${variant}`}
          checked={hidePhoneOnResume}
          onCheckedChange={setHidePhoneOnResume}
        />
      </div>

      {hasResume ? (
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{profile.resumeName || "Resume.pdf"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                {isPublishing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                    Publishing to your profile…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                    Live on your profile
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <ResumePdfActions
              url={profile.resumeUrl}
              fileName={profile.resumeName || "Resume.pdf"}
              layout="prominent"
              previewOnly
            />
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon className="w-4 h-4 mr-2" />
              {uploading ? "Uploading…" : "Replace PDF"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full text-destructive hover:text-destructive"
                  disabled={busy}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove PDF
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove your CV?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the PDF from your profile. Recruiters will no longer see it until you upload a new one.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? "Removing…" : "Remove PDF"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">No PDF uploaded yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Upload a PDF to auto fill Bio and location on your profile.
            </p>
          </div>
          <Button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="min-w-[140px]"
          >
            <UploadIcon className="w-4 h-4 mr-2" />
            {uploading ? "Uploading…" : "Upload PDF"}
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0] || null);
          e.target.value = "";
        }}
      />
    </>
  );

  if (variant === "profile") {
    return (
      <section className="mt-4 bg-background rounded-2xl px-5 py-5 card-shadow">
        <h2 className="font-heading font-extrabold text-foreground text-[15px] flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-primary" />
          Resume (PDF)
        </h2>
        <div className="space-y-3">{body}</div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <Label>Resume (PDF)</Label>
      {body}
    </section>
  );
};

export default JobSeekerResumeSection;
