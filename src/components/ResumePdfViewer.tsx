import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { getPdfJs } from "@/lib/pdfJsLoader";
import { fetchResumePdfBytes } from "@/lib/resumePreview";
import { cn } from "@/lib/utils";

type ResumePdfViewerProps = {
  url: string;
  fileName: string;
};

/** Renders PDF pages with pdf.js — works on mobile and avoids download-only iframe behaviour. */
const ResumePdfViewer = ({ url }: ResumePdfViewerProps) => {
  const pagesRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    const container = pagesRef.current;
    if (!container) return;

    let cancelled = false;
    container.replaceChildren();
    setStatus("loading");

    void (async () => {
      try {
        const [pdfjs, data] = await Promise.all([getPdfJs(), fetchResumePdfBytes(url)]);
        if (cancelled) return;

        const pdf = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
        if (cancelled) return;

        const renderWidth = Math.max(280, Math.min((container.clientWidth || 320) - 4, 720));

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNum);
          const scale = renderWidth / page.getViewport({ scale: 1 }).width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "w-full h-auto rounded-md border border-border/60 shadow-sm bg-white";

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          if (cancelled) return;
          container.appendChild(canvas);
        }

        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) {
          container.replaceChildren();
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [url]);

  return (
    <div className="flex-1 min-h-[240px] flex flex-col overflow-hidden bg-muted/30">
      {status === "loading" && (
        <div className="flex flex-1 items-center justify-center min-h-[240px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading preview" />
        </div>
      )}
      {status === "error" && (
        <div className="flex flex-1 items-center justify-center min-h-[240px] px-6 text-center text-sm text-muted-foreground">
          Could not load preview. Try downloading the CV instead.
        </div>
      )}
      <div
        ref={pagesRef}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3",
          status !== "ready" && "hidden",
        )}
      />
    </div>
  );
};

export default ResumePdfViewer;
