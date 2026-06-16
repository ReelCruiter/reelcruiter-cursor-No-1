import { useRef, useState } from "react";
import { FileText, Sparkles, Trash2, Upload as UploadIcon } from "lucide-react";
import { toast } from "sonner";
import ResumePdfActions from "@/components/ResumePdfActions";
import { Button } from "@/components/ui/button";
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

interface ResumePdfCardProps {
  url: string;
  fileName?: string;
  /** Own profile vs viewing someone else */
  variant?: "own" | "public";
}

const ResumePdfCard = ({ url, fileName = "Resume.pdf", variant = "public" }: ResumePdfCardProps) => {
  const isOwn = variant === "own";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const saveProfileToDb = useProfileStore((s) => s.saveProfileToDb);

  const onReplaceFile = async (f: File | null) => {
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
      await uploadResumeFile(f, { hidePhone: false, showToasts: true });
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

  return (
    <section
      className="mt-5 relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.12] via-background to-primary/[0.06] card-shadow ring-1 ring-primary/10"
      aria-label={isOwn ? "Your resume PDF" : "Candidate resume PDF"}
    >
      <div
        className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-primary/30"
        aria-hidden
      />

      <div className="relative p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25 shrink-0 rotate-[-2deg]">
              <FileText className="w-7 h-7" strokeWidth={2.25} />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground mb-2.5">
                <Sparkles className="w-3 h-3" />
                {isOwn ? "PDF on your profile" : "PDF tap to preview"}
              </span>

              <h2 className="font-heading font-extrabold text-lg sm:text-xl text-foreground leading-tight">
                {isOwn ? "Your full CV is live here" : "Want the full story in writing?"}
              </h2>

              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {isOwn
                  ? "Recruiters see this on your profile and can open your complete resume without leaving the page."
                  : "If you like to read, preview their full resume in one click. No download needed."}
              </p>

              <p className="text-xs font-medium text-foreground/60 mt-2 truncate">
                {fileName}
              </p>
            </div>
          </div>
        </div>

        {isOwn ? (
          <div className="mt-5 pt-4 border-t border-primary/15 flex flex-col sm:flex-row gap-2.5">
            <div className="w-full sm:flex-1 min-w-0">
              <ResumePdfActions
                url={url}
                fileName={fileName}
                layout="prominent"
                previewOnly
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:flex-1 h-11"
              disabled={uploading || deleting}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon className="w-4 h-4 mr-2" />
              {uploading ? "Uploading…" : "Replace CV"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto h-11 text-destructive hover:text-destructive"
                  disabled={uploading || deleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete CV
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
                    {deleting ? "Removing…" : "Delete CV"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                onReplaceFile(e.target.files?.[0] || null);
                e.target.value = "";
              }}
            />
          </div>
        ) : (
          <div className="mt-5 pt-4 border-t border-primary/15">
            <ResumePdfActions url={url} fileName={fileName} layout="prominent" />
          </div>
        )}
      </div>
    </section>
  );
};

export default ResumePdfCard;
