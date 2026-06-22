import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  isRevocablePreviewSrc,
  loadResumePdfPreviewSrc,
} from "@/lib/resumePreview";

type ResumePdfViewerProps = {
  url: string;
  fileName: string;
};

/** Native browser PDF view inside the dialog — full quality, supports zoom on mobile. */
const ResumePdfViewer = ({ url, fileName }: ResumePdfViewerProps) => {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let previewSrc: string | null = null;
    let cancelled = false;

    void (async () => {
      setError(false);
      setSrc(null);
      try {
        previewSrc = await loadResumePdfPreviewSrc(url);
        if (!cancelled) setSrc(previewSrc);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (previewSrc && isRevocablePreviewSrc(previewSrc)) {
        URL.revokeObjectURL(previewSrc);
      }
    };
  }, [url]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground min-h-[50vh]">
        Could not load preview. Try downloading the CV instead.
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex flex-1 items-center justify-center bg-muted/30 min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading preview" />
      </div>
    );
  }

  return (
    <iframe
      src={src}
      title={fileName}
      className="w-full flex-1 min-h-0 min-h-[50vh] border-0 bg-muted/30"
    />
  );
};

export default ResumePdfViewer;
