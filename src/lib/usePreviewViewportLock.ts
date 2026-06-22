import { useEffect } from "react";

const LOCKED =
  "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";

/** Stop the whole page from zooming while the CV preview dialog is open. */
export function usePreviewViewportLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!meta) return;

    const previous = meta.getAttribute("content") ?? "width=device-width, initial-scale=1.0";
    meta.setAttribute("content", LOCKED);

    return () => {
      meta.setAttribute("content", previous);
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    };
  }, [active]);
}
