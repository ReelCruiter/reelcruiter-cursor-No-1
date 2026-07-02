import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { getPdfJs } from "@/lib/pdfJsLoader";
import { fetchResumePdfBytes } from "@/lib/resumePreview";

type ResumePdfViewerProps = {
  url: string;
  fileName: string;
};

function PreviewError() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground min-h-[40vh]">
      Could not load preview. Try downloading the CV instead.
    </div>
  );
}

function PreviewLoading() {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 min-h-[40vh]">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" aria-label="Loading preview" />
    </div>
  );
}

/**
 * Renders every PDF page with pdf.js inside a scrollable document viewer.
 * Works consistently on desktop and mobile (no brittle iframe / pinch quirks).
 */
const ResumePdfViewer = ({ url, fileName }: ResumePdfViewerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const pagesEl = pagesRef.current;
    if (!scrollEl || !pagesEl) return;

    let cancelled = false;

    const render = async () => {
      pagesEl.replaceChildren();
      setStatus("loading");
      setPageCount(0);

      try {
        const [pdfjs, data] = await Promise.all([getPdfJs(), fetchResumePdfBytes(url)]);
        if (cancelled) return;

        const pdf = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
        if (cancelled) return;

        const containerWidth = Math.max(280, scrollEl.clientWidth - 32);
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNum);
          const baseViewport = page.getViewport({ scale: 1 });
          const displayScale = containerWidth / baseViewport.width;
          const viewport = page.getViewport({ scale: displayScale * outputScale });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${Math.floor(viewport.width / outputScale)}px`;
          canvas.style.height = `${Math.floor(viewport.height / outputScale)}px`;
          canvas.className =
            "mx-auto block w-full max-w-full h-auto bg-white shadow-md ring-1 ring-black/5";
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `${fileName} — page ${pageNum} of ${pdf.numPages}`);

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          if (cancelled) return;

          const wrapper = document.createElement("div");
          wrapper.className = "mx-auto w-full max-w-3xl";
          wrapper.appendChild(canvas);
          pagesEl.appendChild(wrapper);
        }

        if (!cancelled) {
          setPageCount(pdf.numPages);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          pagesEl.replaceChildren();
          setStatus("error");
        }
      }
    };

    void render();

    return () => {
      cancelled = true;
      pagesEl.replaceChildren();
    };
  }, [url, fileName]);

  if (status === "error") return <PreviewError />;

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-muted/40">
      {status === "loading" && <PreviewLoading />}
      {status === "ready" && pageCount > 0 && (
        <p className="shrink-0 text-center text-[11px] text-muted-foreground py-2 px-3 border-b border-border/50 bg-background/90">
          {pageCount} page{pageCount === 1 ? "" : "s"} · scroll to read
        </p>
      )}
      <div
        ref={scrollRef}
        className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain ${
          status === "loading" ? "invisible h-0" : ""
        }`}
      >
        <div ref={pagesRef} className="mx-auto max-w-3xl px-4 py-5 space-y-5 pb-8" />
      </div>
    </div>
  );
};

export default ResumePdfViewer;
