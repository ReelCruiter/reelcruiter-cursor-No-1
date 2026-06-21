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

        const width = Math.max(container.clientWidth - 8, 280);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNum);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = width / baseViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "w-full h-auto rounded-lg bg-white shadow-sm";
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `${fileName} page ${pageNum}`);

          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Could not render PDF");

          await page.render({ canvasContext: ctx, viewport }).promise;

          const wrap = document.createElement("div");
          wrap.className = "mb-3 last:mb-0";
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
        <div ref={containerRef} className="p-3 sm:p-4" />
      )}
    </div>
  );
};

export default ResumePdfViewer;
