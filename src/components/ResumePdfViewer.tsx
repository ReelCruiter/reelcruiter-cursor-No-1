import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPdfJs } from "@/lib/pdfJsLoader";
import type { PDFPageProxy } from "pdfjs-dist";

type ResumePdfViewerProps = {
  url: string;
  fileName: string;
};

type ViewTransform = {
  scale: number;
  x: number;
  y: number;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;

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
  canvas.style.maxWidth = "none";

  return { canvas, ctx, viewport };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampTransform(
  transform: ViewTransform,
  viewportW: number,
  viewportH: number,
  contentW: number,
  contentH: number,
): ViewTransform {
  const scaledW = contentW * transform.scale;
  const scaledH = contentH * transform.scale;

  let x = transform.x;
  let y = transform.y;

  if (scaledW <= viewportW) {
    x = (viewportW - scaledW) / 2;
  } else {
    x = clamp(x, viewportW - scaledW, 0);
  }

  if (scaledH <= viewportH) {
    y = (viewportH - scaledH) / 2;
  } else {
    y = clamp(y, viewportH - scaledH, 0);
  }

  return { scale: transform.scale, x, y };
}

function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const ResumePdfViewer = ({ url, fileName }: ResumePdfViewerProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ViewTransform>({ scale: 1, x: 0, y: 0 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; transform: ViewTransform } | null>(null);
  const panRef = useRef<{ x: number; y: number; transform: ViewTransform } | null>(null);
  const contentSizeRef = useRef({ w: 0, h: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [transform, setTransform] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 });
  const [contentSize, setContentSize] = useState({ w: 0, h: 0 });

  const applyTransform = useCallback((next: ViewTransform) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { w, h } = contentSizeRef.current;
    const clamped = clampTransform(next, viewport.clientWidth, viewport.clientHeight, w, h);
    transformRef.current = clamped;
    setTransform(clamped);
  }, []);

  const resetTransform = useCallback(() => {
    applyTransform({ scale: 1, x: 0, y: 0 });
  }, [applyTransform]);

  const measureContent = useCallback(() => {
    const container = containerRef.current;
    const viewport = viewportRef.current;
    if (!container || !viewport) return;
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    contentSizeRef.current = { w, h };
    setContentSize({ w, h });
    applyTransform(transformRef.current);
  }, [applyTransform]);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setLayoutVersion((v) => v + 1);
      measureContent();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureContent]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measureContent());
    ro.observe(container);
    return () => ro.disconnect();
  }, [measureContent, loading]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 || transformRef.current.scale > 1 || panRef.current) {
        e.preventDefault();
      }
    };

    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      el.setPointerCapture(e.pointerId);
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointersRef.current.size === 2) {
        const pts = [...pointersRef.current.values()];
        pinchRef.current = {
          distance: distanceBetween(pts[0], pts[1]),
          transform: { ...transformRef.current },
        };
        panRef.current = null;
      } else if (pointersRef.current.size === 1) {
        panRef.current = {
          x: e.clientX,
          y: e.clientY,
          transform: { ...transformRef.current },
        };
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointersRef.current.size >= 2 && pinchRef.current) {
        const pts = [...pointersRef.current.values()];
        const dist = distanceBetween(pts[0], pts[1]);
        const ratio = dist / pinchRef.current.distance;
        const nextScale = clamp(pinchRef.current.transform.scale * ratio, MIN_SCALE, MAX_SCALE);

        const rect = el.getBoundingClientRect();
        const midX = (pts[0].x + pts[1].x) / 2 - rect.left;
        const midY = (pts[0].y + pts[1].y) / 2 - rect.top;
        const start = pinchRef.current.transform;
        const scaleRatio = nextScale / start.scale;

        applyTransform({
          scale: nextScale,
          x: midX - (midX - start.x) * scaleRatio,
          y: midY - (midY - start.y) * scaleRatio,
        });
        e.preventDefault();
        return;
      }

      if (pointersRef.current.size === 1 && panRef.current) {
        const dx = e.clientX - panRef.current.x;
        const dy = e.clientY - panRef.current.y;
        applyTransform({
          scale: panRef.current.transform.scale,
          x: panRef.current.transform.x + dx,
          y: panRef.current.transform.y + dy,
        });
        panRef.current = {
          x: e.clientX,
          y: e.clientY,
          transform: { ...transformRef.current },
        };
        e.preventDefault();
      }
    };

    const endPointer = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId);
      if (pointersRef.current.size < 2) pinchRef.current = null;
      if (pointersRef.current.size === 0) panRef.current = null;
      if (el.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const focalX = e.clientX - rect.left;
        const focalY = e.clientY - rect.top;
        const delta = e.deltaY > 0 ? 0.92 : 1.08;
        const start = transformRef.current;
        const nextScale = clamp(start.scale * delta, MIN_SCALE, MAX_SCALE);
        const scaleRatio = nextScale / start.scale;
        applyTransform({
          scale: nextScale,
          x: focalX - (focalX - start.x) * scaleRatio,
          y: focalY - (focalY - start.y) * scaleRatio,
        });
        return;
      }

      const start = transformRef.current;
      if (start.scale > 1 || contentSizeRef.current.h > el.clientHeight) {
        e.preventDefault();
        applyTransform({
          scale: start.scale,
          x: start.x,
          y: start.y - e.deltaY,
        });
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endPointer);
    el.addEventListener("pointercancel", endPointer);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endPointer);
      el.removeEventListener("pointercancel", endPointer);
      el.removeEventListener("wheel", onWheel);
    };
  }, [applyTransform]);

  useEffect(() => {
    const viewportEl = viewportRef.current;
    const container = containerRef.current;
    if (!viewportEl || !container) return;

    let cancelled = false;
    container.replaceChildren();
    resetTransform();

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
          canvas.className = "rounded-lg bg-white shadow-sm select-none";
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `${fileName} page ${pageNum}`);
          canvas.draggable = false;

          await page.render({ canvasContext: ctx, viewport, intent: "display" }).promise;

          const wrap = document.createElement("div");
          wrap.className = mobile
            ? "flex justify-center mb-3 last:mb-0 px-1"
            : "flex justify-center mb-4 last:mb-0";
          wrap.appendChild(canvas);
          container.appendChild(wrap);
        }

        requestAnimationFrame(measureContent);
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
  }, [url, fileName, layoutVersion, measureContent, resetTransform]);

  const zoomed = transform.scale > 1.01;

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        ref={viewportRef}
        className="relative flex-1 min-h-0 overflow-hidden bg-muted/50 touch-none select-none"
        style={{ touchAction: "none" }}
        aria-label="CV preview. Pinch to zoom and drag to move."
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
            className="origin-top-left will-change-transform inline-block min-w-full"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            }}
          >
            <div
              ref={containerRef}
              className="p-2 sm:p-4"
            />
          </div>
        )}
      </div>

      {!loading && !error && contentSize.h > 0 && (
        <div className="shrink-0 px-3 py-2 border-t bg-background/95 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>Pinch or Ctrl + scroll to zoom · drag to move</span>
          {zoomed && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs shrink-0"
              onClick={resetTransform}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumePdfViewer;
