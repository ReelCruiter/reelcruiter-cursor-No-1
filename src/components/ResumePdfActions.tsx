import { useState } from "react";
import { Download, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ResumePdfViewer from "@/components/ResumePdfViewer";
import { toast } from "sonner";

interface ResumePdfActionsProps {
  url: string;
  fileName?: string;
  size?: "sm" | "default";
  layout?: "inline" | "prominent";
  /** Hide download; preview button and dialog only */
  previewOnly?: boolean;
}

const ResumePdfActions = ({
  url,
  fileName = "Resume.pdf",
  size = "default",
  layout = "inline",
  previewOnly = false,
}: ResumePdfActionsProps) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  const download = async () => {
    try {
      if (url.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        return;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Could not download. Opening in a new tab instead.");
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const btnSize = layout === "prominent" ? "default" : size === "sm" ? "sm" : "default";
  const prominent = layout === "prominent";

  return (
    <>
      <div
        className={
          prominent
            ? "flex flex-col sm:flex-row gap-2.5 sm:gap-3"
            : "flex flex-wrap items-center gap-2"
        }
      >
        <Button
          type="button"
          variant={prominent ? "default" : "secondary"}
          size={btnSize}
          onClick={() => setPreviewOpen(true)}
          className={prominent ? "w-full sm:flex-1 h-11 font-semibold shadow-md shadow-primary/20" : undefined}
        >
          <Eye className="w-4 h-4 mr-2" />
          {prominent ? (previewOnly ? "Preview your CV" : "Preview CV now") : "Preview"}
        </Button>
        {!previewOnly && (
        <Button
          type="button"
          variant={prominent ? "secondary" : "default"}
          size={btnSize}
          onClick={download}
          className={prominent ? "w-full sm:w-auto h-11" : undefined}
        >
          <Download className="w-4 h-4 mr-1.5" />
          Download
        </Button>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-[100vw] sm:w-[95vw] h-[100dvh] sm:h-[85vh] max-h-[100dvh] flex flex-col p-0 gap-0 rounded-none sm:rounded-lg">
          <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base pr-8">
              <FileText className="w-4 h-4 shrink-0" />
              <span className="truncate">{fileName}</span>
            </DialogTitle>
          </DialogHeader>
          {previewOpen && <ResumePdfViewer url={url} fileName={fileName} />}
          <div className="px-4 sm:px-6 py-3 border-t flex justify-end gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button variant="secondary" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            {!previewOnly && (
              <Button onClick={download}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ResumePdfActions;
