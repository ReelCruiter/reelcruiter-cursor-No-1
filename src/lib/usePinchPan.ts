import { useEffect, useRef } from "react";

type GestureMode = "none" | "pan" | "pinch";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

/**
 * Pinch-to-zoom and drag-to-pan inside a container only (does not zoom the whole page).
 */
export function usePinchPan(
  outerRef: React.RefObject<HTMLElement | null>,
  innerRef: React.RefObject<HTMLElement | null>,
) {
  const state = useRef({
    scale: 1,
    x: 0,
    y: 0,
    mode: "none" as GestureMode,
    startDist: 0,
    startScale: 1,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const apply = () => {
      const s = state.current;
      inner.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) scale(${s.scale})`;
      inner.style.transformOrigin = "0 0";
      inner.style.willChange = "transform";
    };

    const clamp = () => {
      const s = state.current;
      const outerW = outer.clientWidth;
      const outerH = outer.clientHeight;
      const innerW = inner.scrollWidth * s.scale;
      const innerH = inner.scrollHeight * s.scale;
      const minX = Math.min(0, outerW - innerW);
      const minY = Math.min(0, outerH - innerH);
      s.x = Math.min(0, Math.max(minX, s.x));
      s.y = Math.min(0, Math.max(minY, s.y));
    };

    const touchDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      const s = state.current;
      if (e.touches.length === 2) {
        s.mode = "pinch";
        s.startDist = touchDistance(e.touches);
        s.startScale = s.scale;
      } else if (e.touches.length === 1 && s.scale > 1.01) {
        s.mode = "pan";
        s.lastX = e.touches[0].clientX;
        s.lastY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const s = state.current;
      if (s.mode === "pinch" && e.touches.length === 2) {
        e.preventDefault();
        const dist = touchDistance(e.touches);
        if (s.startDist > 0) {
          s.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s.startScale * (dist / s.startDist)));
        }
        clamp();
        apply();
      } else if (s.mode === "pan" && e.touches.length === 1) {
        e.preventDefault();
        const dx = e.touches[0].clientX - s.lastX;
        const dy = e.touches[0].clientY - s.lastY;
        s.x += dx;
        s.y += dy;
        s.lastX = e.touches[0].clientX;
        s.lastY = e.touches[0].clientY;
        clamp();
        apply();
      }
    };

    const onTouchEnd = () => {
      const s = state.current;
      s.mode = "none";
      if (s.scale <= 1.01) {
        s.scale = 1;
        s.x = 0;
        s.y = 0;
        apply();
      }
    };

    let lastTap = 0;
    const onTouchEndDoubleTap = (e: TouchEvent) => {
      if (e.touches.length > 0) return;
      const now = Date.now();
      if (now - lastTap < 300) {
        state.current.scale = 1;
        state.current.x = 0;
        state.current.y = 0;
        apply();
        lastTap = 0;
      } else {
        lastTap = now;
      }
      onTouchEnd();
    };

    outer.addEventListener("touchstart", onTouchStart, { passive: true });
    outer.addEventListener("touchmove", onTouchMove, { passive: false });
    outer.addEventListener("touchend", onTouchEndDoubleTap, { passive: true });
    outer.addEventListener("touchcancel", onTouchEnd, { passive: true });

    apply();

    return () => {
      outer.removeEventListener("touchstart", onTouchStart);
      outer.removeEventListener("touchmove", onTouchMove);
      outer.removeEventListener("touchend", onTouchEndDoubleTap);
      outer.removeEventListener("touchcancel", onTouchEnd);
      inner.style.transform = "";
      inner.style.willChange = "";
    };
  }, [outerRef, innerRef]);
}
