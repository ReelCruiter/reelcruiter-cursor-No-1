import { useRef } from "react";
import { FileText, Image as ImageIcon, Paperclip, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SUPPORT_ATTACHMENT_ACCEPT,
  SUPPORT_MAX_ATTACHMENTS,
  validateSupportAttachment,
} from "@/lib/supportAttachments";
import { toast } from "sonner";

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
};

function fileIcon(file: File) {
  if (file.type.startsWith("image/")) return ImageIcon;
  if (file.type.startsWith("video/")) return Video;
  return FileText;
}

const SupportAttachmentField = ({ files, onChange, disabled }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming?.length) return;

    const next = [...files];
    for (const file of Array.from(incoming)) {
      if (next.length >= SUPPORT_MAX_ATTACHMENTS) {
        toast.error(`You can attach up to ${SUPPORT_MAX_ATTACHMENTS} files`);
        break;
      }
      const err = validateSupportAttachment(file);
      if (err) {
        toast.error(err);
        continue;
      }
      if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
      next.push(file);
    }
    onChange(next);
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-foreground">Attachments</label>
        <span className="text-xs text-muted-foreground">Optional, up to {SUPPORT_MAX_ATTACHMENTS} files</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={SUPPORT_ATTACHMENT_ACCEPT}
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9"
        disabled={disabled || files.length >= SUPPORT_MAX_ATTACHMENTS}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="w-4 h-4 mr-2" />
        Add photo or file
      </Button>

      <p className="text-xs text-muted-foreground">
        Photos, PDFs, Word docs, text files, or short videos (10MB max each).
      </p>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, index) => {
            const Icon = fileIcon(file);

            return (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
              >
                <div className="w-10 h-10 rounded-md bg-background flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
                <button
                  type="button"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background"
                  aria-label={`Remove ${file.name}`}
                  disabled={disabled}
                  onClick={() => removeFile(index)}
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SupportAttachmentField;
