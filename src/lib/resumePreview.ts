import { supabase } from "@/integrations/supabase/client";

function parseSupabaseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    for (const marker of ["/storage/v1/object/public/", "/storage/v1/object/sign/"]) {
      const idx = u.pathname.indexOf(marker);
      if (idx === -1) continue;
      const rest = u.pathname.slice(idx + marker.length);
      const slash = rest.indexOf("/");
      if (slash === -1) continue;
      const bucket = rest.slice(0, slash);
      const path = decodeURIComponent(rest.slice(slash + 1));
      if (bucket && path) return { bucket, path };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Desktop browsers: crisp native PDF plugin in an iframe. */
export function prefersNativePdfIframe(): boolean {
  if (typeof navigator === "undefined") return true;
  const ua = navigator.userAgent;
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  return !ios && !android;
}

/** Load resume PDF bytes (Supabase storage, data URLs, or remote fetch). */
export async function fetchResumePdfBytes(url: string): Promise<Uint8Array> {
  if (!url) throw new Error("No resume URL");

  if (url.startsWith("data:")) {
    const res = await fetch(url);
    return new Uint8Array(await res.arrayBuffer());
  }

  const storage = parseSupabaseStorageUrl(url);
  if (storage) {
    const { data, error } = await supabase.storage.from(storage.bucket).download(storage.path);
    if (error || !data) throw new Error(error?.message || "Could not load PDF");
    return new Uint8Array(await data.arrayBuffer());
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load PDF");
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * Desktop iframe preview — browser PDF viewer at full quality.
 * Do not use on phones: mobile OS often downloads the file instead of inline view.
 */
export async function loadResumePdfPreviewSrc(url: string): Promise<string> {
  if (!url) throw new Error("No resume URL");

  const bare = url.split("#")[0];

  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return bare;
  }

  if (bare.startsWith("http://") || bare.startsWith("https://")) {
    return `${bare}#view=FitH&toolbar=1`;
  }

  const bytes = await fetchResumePdfBytes(url);
  const blob = new Blob([bytes], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}

export function isRevocablePreviewSrc(src: string): boolean {
  return src.startsWith("blob:");
}

export async function downloadResumePdf(url: string, fileName: string): Promise<void> {
  const bytes = await fetchResumePdfBytes(url);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(blobUrl);
}
