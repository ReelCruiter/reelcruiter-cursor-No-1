import { useRef, useState } from "react";
import { FileText, Upload as UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  uploadResumeFile,
  type UploadResumeOutcome,
} from "@/lib/uploadResumeFile";

interface ResumeUploadBlockProps {
  compact?: boolean;
  onUploaded?: (outcome: UploadResumeOutcome) => void;
  onUploadStart?: () => void;
  showToasts?: boolean;
}

const ResumeUploadBlock = ({
  compact = false,
  onUploaded,
  onUploadStart,
  showToasts = true,
}: ResumeUploadBlockProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [hidePhoneOnResume, setHidePhoneOnResume] = useState(false);

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

    onUploadStart?.();
    setUploading(true);
    try {
      const outcome = await uploadResumeFile(f, {
        hidePhone: hidePhoneOnResume,
        showToasts,
      });
      onUploaded?.(outcome);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Upload a PDF to auto fill your About section and location.
        </p>
      )}

      <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-3">
        <div className="space-y-1">
          <Label htmlFor="hide-phone-cv-block" className="text-sm font-medium leading-snug">
            Blur phone number on CV
          </Label>
          <p className="text-xs text-muted-foreground">
            Hides phone numbers in the saved PDF before recruiters can download it.
          </p>
        </div>
        <Switch
          id="hide-phone-cv-block"
          checked={hidePhoneOnResume}
          onCheckedChange={setHidePhoneOnResume}
        />
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          "Uploading CV…"
        ) : (
          <>
            <UploadIcon className="w-4 h-4 mr-2" />
            {compact ? "Choose PDF" : "Upload PDF"}
          </>
        )}
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0] || null);
          e.target.value = "";
        }}
      />

      {!compact && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="w-4 h-4 shrink-0" />
          <span>Text-based PDFs work best (Word or Google Docs export).</span>
        </div>
      )}
    </div>
  );
};

export default ResumeUploadBlock;
