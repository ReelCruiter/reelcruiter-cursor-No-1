import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { getPdfJs } from "@/lib/pdfJsLoader";
import {
  fetchResumePdfBytes,
  isRevocablePreviewSrc,
  loadResumePdfPreviewSrc,
  prefersNativePdfIframe,
} from "@/lib/resumePreview";

type ResumePdfViewerProps = {
  url: string;
  fileName: string;
};

function PreviewError() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground min-h-[50vh]">
      Could not load preview. Try downloading the CV instead.
    </div>
  );
}

function PreviewLoading() {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading preview" />
    </div>
  );
}

/** Desktop: native browser PDF in iframe (full quality). */
function NativePdfIframePreview({ url, fileName }: ResumePdfViewerProps) {
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

  if (error) return <PreviewError />;
  if (!src) return <PreviewLoading />;

  return (
    <iframe
      src={src}
      title={fileName}
      className="w-full flex-1 min-h-[50vh] border-0 bg-muted/30"
    />
  );
}

/**
 * Phone / tablet: render inside the app so the OS does not download the PDF first.
 * Uses device pixel ratio so text stays sharp on retina screens.
 */
function MobilePdfCanvasPreview({ url }: ResumePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    const container = containerRef.current;
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

        // Wait one frame so the dialog has laid out and width is correct.
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (cancelled) return;

        const cssWidth = Math.max(280, (container.clientWidth || 320) - 8);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNum);
          const baseViewport = page.getViewport({ scale: 1 });
          const displayScale = cssWidth / baseViewport.width;
          const outputScale = Math.min(window.devicePixelRatio || 1, 2.5);
          const viewport = page.getViewport({ scale: displayScale * outputScale });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${Math.floor(viewport.width / outputScale)}px`;
          canvas.style.height = `${Math.floor(viewport.height / outputScale)}px`;
          canvas.className =
            "mx-auto block max-w-full h-auto rounded-md border border-border/60 shadow-sm bg-white mb-3";

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          await page.render({
            canvasContext: ctx,
            viewport,
            canvas,
          }).promise;

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

  if (status === "error") return <PreviewError />;

  return (
    <div className="relative flex-1 min-h-[50vh] flex flex-col overflow-hidden bg-muted/30">
      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/30">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading preview" />
        </div>
      )}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 touch-pan-y"
      />
    </div>
  );
}

const ResumePdfViewer = (props: ResumePdfViewerProps) => {
  const native = prefersNativePdfIframe();
  if (native) return <NativePdfIframePreview {...props} />;
  return <MobilePdfCanvasPreview {...props} />;
};

export default ResumePdfViewer;
