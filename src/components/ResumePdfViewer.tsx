import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { getPdfJs } from "@/lib/pdfJsLoader";

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

/** Sharp canvas render: CSS layout size × devicePixelRatio internal pixels. */
function renderPageToCanvas(
  page: Awaited<ReturnType<Awaited<ReturnType<typeof getPdfJs>>["PDFDocumentProxy"]["prototype"]["getPage"]>>,
  cssWidth: number,
  minCssScale: number,
) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
  const baseViewport = page.getViewport({ scale: 1 });
  const fitScale = cssWidth / baseViewport.width;
  const cssScale = Math.max(fitScale, minCssScale);
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
  canvas.style.maxWidth = "none";

  return { canvas, ctx, viewport };
}

const ResumePdfViewer = ({ url, fileName }: ResumePdfViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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

        const cssWidth = Math.max(container.clientWidth, 320);
        const isNarrow =
          cssWidth < 640 ||
          window.matchMedia("(pointer: coarse)").matches;
        const minCssScale = isNarrow ? 1 : 0.85;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNum);
          const { canvas, ctx, viewport } = renderPageToCanvas(page, cssWidth, minCssScale);
          canvas.className = "rounded-lg bg-white shadow-sm";
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `${fileName} page ${pageNum}`);

          await page.render({ canvasContext: ctx, viewport, intent: "display" }).promise;

          const wrap = document.createElement("div");
          wrap.className = "mb-4 last:mb-0 overflow-x-auto";
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
  }, [url, fileName]);

  return (
    <div className="relative flex-1 min-h-0 overflow-y-auto bg-muted/50">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden />
          <span className="sr-only">Loading CV preview</span>
        </div>
      )}
      {error ? (
        <p className="p-6 text-sm text-muted-foreground text-center">{error}</p>
      ) : (
        <div ref={containerRef} className="p-3 sm:p-4 min-w-0" />
      )}
    </div>
  );
};

export default ResumePdfViewer;
