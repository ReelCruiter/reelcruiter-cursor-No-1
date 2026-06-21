import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { getPdfJs } from "@/lib/pdfJsLoader";
import type { PDFPageProxy } from "pdfjs-dist";

type ResumePdfViewerProps = {
  url: string;
  fileName: string;
};

async function loadPdfBytes(url: string): Promise<ArrayBuffer> {
  if (url.startsWith("data:")) {
    const res = await fetch(url);
    return res.arrayBuffer();
  }
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error("Failed to load PDF");
  return res.arrayBuffer();
}

function isMobilePreview() {
  return (
    window.matchMedia("(max-width: 639px)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

function renderPageToCanvas(
  page: PDFPageProxy,
  maxWidth: number,
  maxHeight: number,
  fitFullPage: boolean,
) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
  const baseViewport = page.getViewport({ scale: 1 });
  const widthScale = maxWidth / baseViewport.width;
  const heightScale = maxHeight / baseViewport.height;
  const cssScale = fitFullPage
    ? Math.min(widthScale, heightScale)
    : widthScale;
  const renderScale = cssScale * pixelRatio;
  const viewport = page.getViewport({ scale: renderScale });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not render PDF");

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${viewport.width / pixelRatio}px`;
  canvas.style.height = `${viewport.height / pixelRatio}px`;
  canvas.style.display = "block";
  canvas.style.maxWidth = "100%";

  return { canvas, ctx, viewport };
}

const ResumePdfViewer = ({ url, fileName }: ResumePdfViewerProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLayoutVersion((v) => v + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const viewportEl = viewportRef.current;
    const container = containerRef.current;
    if (!viewportEl || !container) return;

    let cancelled = false;
    container.replaceChildren();

    const render = async () => {
      setLoading(true);
      setError(null);

      try {
        const pdfjs = await getPdfJs();
        const data = await loadPdfBytes(url);
        if (cancelled) return;

        const pdf = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;

        const mobile = isMobilePreview();
        const padding = mobile ? 12 : 24;
        const maxWidth = Math.max(viewportEl.clientWidth - padding, 200);
        const maxHeight = Math.max(viewportEl.clientHeight - padding, 280);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNum);
          const { canvas, ctx, viewport } = renderPageToCanvas(
            page,
            maxWidth,
            maxHeight,
            mobile,
          );
          canvas.className = "rounded-lg bg-white shadow-sm";
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `${fileName} page ${pageNum}`);

          await page.render({ canvasContext: ctx, viewport, intent: "display" }).promise;

          const wrap = document.createElement("div");
          if (mobile) {
            wrap.style.minHeight = `${viewportEl.clientHeight}px`;
            wrap.className = "flex items-center justify-center snap-center snap-always shrink-0 px-1";
          } else {
            wrap.className = "flex justify-center mb-4 last:mb-0";
          }
          wrap.appendChild(canvas);
          container.appendChild(wrap);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load this CV preview. Try downloading the file instead.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [url, fileName, layoutVersion]);

  return (
    <div
      ref={viewportRef}
      className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-muted/50 snap-y snap-mandatory"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden />
          <span className="sr-only">Loading CV preview</span>
        </div>
      )}
      {error ? (
        <p className="p-6 text-sm text-muted-foreground text-center">{error}</p>
      ) : (
        <div
          ref={containerRef}
          className="p-2 sm:p-4 min-w-0 min-h-full flex flex-col"
        />
      )}
    </div>
  );
};

export default ResumePdfViewer;
