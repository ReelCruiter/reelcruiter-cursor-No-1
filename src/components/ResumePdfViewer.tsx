import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { getPdfJs } from "@/lib/pdfJsLoader";
import { usePinchPan } from "@/lib/usePinchPan";
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
 * Phone / tablet: in-app PDF with pinch zoom + drag inside the preview only.
 */
function MobilePdfCanvasPreview({ url }: ResumePdfViewerProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  usePinchPan(outerRef, innerRef);

  useEffect(() => {
    const pages = pagesRef.current;
    if (!pages) return;

    let cancelled = false;
    pages.replaceChildren();
    setStatus("loading");

    void (async () => {
      try {
        const [pdfjs, data] = await Promise.all([getPdfJs(), fetchResumePdfBytes(url)]);
        if (cancelled) return;

        const pdf = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
        if (cancelled) return;

        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (cancelled) return;

        const cssWidth = Math.max(280, (pages.clientWidth || outerRef.current?.clientWidth || 320) - 8);

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
          pages.appendChild(canvas);
        }

        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) {
          pages.replaceChildren();
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      pages.replaceChildren();
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
      {status === "ready" && (
        <p className="shrink-0 text-center text-[11px] text-muted-foreground py-1.5 px-3 border-b border-border/50 bg-background/80">
          Pinch to zoom · drag to move · double tap to reset
        </p>
      )}
      <div
        ref={outerRef}
        className="flex-1 min-h-0 overflow-hidden touch-none"
        style={{ touchAction: "none" }}
      >
        <div ref={innerRef} className="inline-block min-w-full p-3 sm:p-4">
          <div ref={pagesRef} />
        </div>
      </div>
    </div>
  );
}

const ResumePdfViewer = (props: ResumePdfViewerProps) => {
  if (prefersNativePdfIframe()) return <NativePdfIframePreview {...props} />;
  return <MobilePdfCanvasPreview {...props} />;
};

export default ResumePdfViewer;
