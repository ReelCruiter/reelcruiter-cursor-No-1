import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "post-videos";
const SIGNED_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Given either a public URL previously generated for the post-videos bucket,
 * a signed URL, or a bare storage path, return the storage path inside the bucket.
 */
export const extractStoragePath = (urlOrPath: string): string | null => {
  if (!urlOrPath) return null;
  // Already a storage path (no scheme)
  if (!urlOrPath.includes("://")) return urlOrPath.replace(/^\/+/, "");

  try {
    const u = new URL(urlOrPath);
    // Match both /object/public/<bucket>/... and /object/sign/<bucket>/...
    const m = u.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/
    );
    if (!m) return null;
    if (m[1] !== BUCKET) return null;
    // Strip any query string already present in pathname capture (it isn't, but safe)
    return decodeURIComponent(m[2]);
  } catch {
    return null;
  }
};

/**
 * Produce a short-lived signed URL for a stored video. Falls back to the
 * original URL if we can't parse a path (e.g. external URL).
 */
export async function getSignedVideoUrl(urlOrPath: string): Promise<string> {
  const path = extractStoragePath(urlOrPath);
  if (!path) return urlOrPath;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_TTL_SECONDS);
  if (error || !data?.signedUrl) return urlOrPath;
  return data.signedUrl;
}

/**
 * React hook that resolves a video src into a `blob:` URL streamed from a
 * short-lived signed URL. Using a blob source means the native player has no
 * downloadable file URL to expose in its share/download menu.
 *
 * Falls back to a plain signed URL (then to the original) if blob fetching
 * fails (e.g. CORS, range requests not supported).
 */
export function useSecureVideoUrl(
  originalUrl: string | undefined | null,
  options?: { streamDirectly?: boolean },
): {
  url: string;
  loading: boolean;
} {
  const streamDirectly = options?.streamDirectly ?? false;
  const [url, setUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(!!originalUrl);

  useEffect(() => {
    let cancelled = false;
    let createdBlob: string | null = null;

    if (!originalUrl) {
      setUrl("");
      setLoading(false);
      return;
    }

    setLoading(true);

    (async () => {
      const signed = await getSignedVideoUrl(originalUrl);
      if (cancelled) return;

      if (streamDirectly) {
        setUrl(signed);
        setLoading(false);
        return;
      }

      // Try to stream as blob so the player has no downloadable source URL.
      try {
        const res = await fetch(signed);
        if (!res.ok) throw new Error(`status ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        createdBlob = URL.createObjectURL(blob);
        setUrl(createdBlob);
      } catch {
        // Fallback to the signed URL directly
        if (!cancelled) setUrl(signed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (createdBlob) URL.revokeObjectURL(createdBlob);
    };
  }, [originalUrl, streamDirectly]);

  return { url, loading };
}
