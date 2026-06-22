import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  loadResumePdfPreviewSrc,
  resumePreviewIframeSrc,
} from "@/lib/resumePreview";

type ResumePdfViewerProps = {
  url: string;
  fileName: string;
};

/** Inline PDF preview via blob URL so the browser does not download the file first. */
const ResumePdfViewer = ({ url, fileName }: ResumePdfViewerProps) => {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let blobUrl: string | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const previewUrl = await loadResumePdfPreviewSrc(url);
        blobUrl = previewUrl.startsWith("blob:") ? previewUrl : null;
        if (!cancelled) {
          setSrc(resumePreviewIframeSrc(previewUrl));
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setSrc(null);
          setError("Could not load preview. Try downloading the CV instead.");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [url]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading preview" />
      </div>
    );
  }

  return (
    <iframe
      src={src}
      title={fileName}
      className="w-full flex-1 min-h-0 border-0 bg-muted/30"
    />
  );
};

export default ResumePdfViewer;
