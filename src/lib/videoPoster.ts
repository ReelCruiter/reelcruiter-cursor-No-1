/** Legacy stock image used before real video frames were stored. */
const LEGACY_PLACEHOLDER =
  "images.unsplash.com/photo-1498050108023-c5249f4df085";

export function isRealThumbnail(thumbnail: string | null | undefined): boolean {
  if (!thumbnail?.trim()) return false;
  if (thumbnail.includes(LEGACY_PLACEHOLDER)) return false;
  return true;
}

/** Only pass a poster URL to <video> when it is a real stored frame, not a stock placeholder. */
export function videoPosterAttr(thumbnail: string | null | undefined): string | undefined {
  return isRealThumbnail(thumbnail) ? thumbnail!.trim() : undefined;
}

/** Capture a JPEG still from a local video file (used when publishing). */
export function captureVideoThumbnailFrame(
  file: File,
  seekSeconds = 0.25,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      resolve(blob);
    };

    video.onloadedmetadata = () => {
      const t = Math.min(
        seekSeconds,
        Math.max(0, (video.duration || seekSeconds) * 0.05),
      );
      try {
        video.currentTime = t;
      } catch {
        finish(null);
      }
    };

    video.onseeked = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) {
        finish(null);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        finish(null);
        return;
      }
      ctx.drawImage(video, 0, 0, w, h);
      canvas.toBlob((blob) => finish(blob), "image/jpeg", 0.82);
    };

    video.onerror = () => finish(null);
    video.src = objectUrl;
  });
}
