/** Supabase storage upload limit per file. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_MB = 50;

const COMPRESS_TIMEOUT_MS = 60_000;

/**
 * Client-side video compression using <canvas> + MediaRecorder.
 *
 * Why: phones produce 4K / 60fps clips that are 100+ MB. Uploading those
 * raw to storage is slow for users and expensive for us. We re-encode in
 * the browser to ~720p at a modest bitrate before the upload begins.
 *
 * Strategy:
 *  - Decode the file into a hidden <video> element.
 *  - Draw frames into a downscaled <canvas>, capture that canvas as a
 *    MediaStream, and pipe it through MediaRecorder.
 *  - Mux the source audio track in via HTMLVideoElement.captureStream().
 *
 * The function fails safely: if anything goes wrong, or the result is not
 * smaller than the source, we return the original File untouched.
 */

export interface CompressOptions {
  /** Cap the longest side at this many CSS pixels. Default 1280. */
  maxWidth?: number;
  /** Target video bitrate. Default 1.8 Mbps. */
  bitsPerSecond?: number;
  /** Skip compression entirely for files at/under this many bytes. Default 12 MB. */
  skipUnderBytes?: number;
  /** Optional progress callback (0..1). */
  onProgress?: (pct: number) => void;
}

const supportsRecorder = (): boolean => {
  if (typeof window === "undefined") return false;
  if (typeof MediaRecorder === "undefined") return false;
  if (!("captureStream" in HTMLCanvasElement.prototype)) return false;
  return true;
};

const pickMimeType = (): string => {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const m of candidates) {
    try {
      if ((MediaRecorder as any).isTypeSupported?.(m)) return m;
    } catch {}
  }
  return "";
};

async function compressVideoFileInternal(
  file: File,
  opts: CompressOptions = {},
): Promise<File> {
  const maxWidth = opts.maxWidth ?? 1280;
  const bitsPerSecond = opts.bitsPerSecond ?? 1_800_000;
  const skipUnder = opts.skipUnderBytes ?? 12 * 1024 * 1024;

  if (!file.type.startsWith("video/")) return file;
  if (file.size <= skipUnder) return file;
  if (!supportsRecorder()) return file;

  // Webcam recordings are already webm/mp4 at modest resolution — re-encoding often hangs.
  if (/^recording-\d+\.(webm|mp4)$/i.test(file.name) && file.size <= MAX_VIDEO_BYTES) {
    return file;
  }

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  (video as any).crossOrigin = "anonymous";

  const cleanup = () => {
    try { URL.revokeObjectURL(url); } catch {}
    try { video.pause(); video.removeAttribute("src"); video.load(); } catch {}
  };

  try {
    await new Promise<void>((res, rej) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        res();
      };
      const fail = (msg: string) => {
        if (settled) return;
        settled = true;
        rej(new Error(msg));
      };
      video.onloadedmetadata = done;
      video.onloadeddata = done;
      video.onerror = () => fail("Could not read video metadata");
      setTimeout(() => fail("Video metadata timeout"), 15_000);
    });

    const rawDuration = video.duration;
    const duration =
      Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 0;
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    if (!srcW || !srcH) {
      cleanup();
      return file;
    }

    // If already small enough, don't bother re-encoding.
    if (srcW <= maxWidth && file.size < 25 * 1024 * 1024) {
      cleanup();
      return file;
    }

    // Browser recordings often report unknown duration — skip risky re-encode.
    if (duration === 0 && file.size <= MAX_VIDEO_BYTES) {
      cleanup();
      return file;
    }

    const scale = Math.min(1, maxWidth / Math.max(srcW, srcH));
    const w = Math.max(2, Math.round((srcW * scale) / 2) * 2);
    const h = Math.max(2, Math.round((srcH * scale) / 2) * 2);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      cleanup();
      return file;
    }

    const canvasStream = (canvas as any).captureStream(30) as MediaStream;

    // Best-effort: attach the original audio track.
    try {
      const vAny = video as any;
      if (typeof vAny.captureStream === "function") {
        const vStream: MediaStream = vAny.captureStream();
        vStream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
      } else if (typeof vAny.mozCaptureStream === "function") {
        const vStream: MediaStream = vAny.mozCaptureStream();
        vStream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
      }
    } catch {
      // Audio is optional — keep going video-only if grab fails.
    }

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(
        canvasStream,
        mimeType
          ? { mimeType, videoBitsPerSecond: bitsPerSecond }
          : { videoBitsPerSecond: bitsPerSecond },
      );
    } catch {
      cleanup();
      return file;
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise<void>((res) => { recorder.onstop = () => res(); });

    let rafId = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(rafId);
      try { video.pause(); } catch {}
      if (recorder.state !== "inactive") {
        try { recorder.stop(); } catch {}
      }
    };

    const draw = () => {
      try { ctx.drawImage(video, 0, 0, w, h); } catch {}
      if (opts.onProgress && duration > 0) {
        opts.onProgress(Math.min(1, video.currentTime / duration));
      }
      if (!finished) rafId = requestAnimationFrame(draw);
    };

    recorder.start(500);
    try { await video.play(); } catch { /* autoplay denial — still try */ }
    draw();

    await new Promise<void>((res) => {
      const done = () => {
        finish();
        res();
      };
      video.addEventListener("ended", done, { once: true });
      const cap =
        duration > 0
          ? Math.min(120_000, Math.max(15_000, duration * 1000 + 5_000))
          : 45_000;
      setTimeout(done, cap);
    });

    await stopped;
    cleanup();

    const outBlob = new Blob(chunks, { type: mimeType || "video/webm" });
    if (!outBlob.size || outBlob.size >= file.size) return file;

    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "video";
    return new File([outBlob], `${baseName}-compressed.${ext}`, {
      type: outBlob.type,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("[compressVideoFile] failed, using original", err);
    cleanup();
    return file;
  }
}

/** Only attempt re-encoding for files close to the upload limit. */
export const COMPRESS_IF_OVER_BYTES = 45 * 1024 * 1024;

export function shouldCompressVideo(file: File): boolean {
  return file.size > COMPRESS_IF_OVER_BYTES;
}

export async function compressVideoFile(
  file: File,
  opts: CompressOptions = {},
): Promise<File> {
  if (!shouldCompressVideo(file)) return file;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      compressVideoFileInternal(file, opts),
      new Promise<File>((resolve) => {
        timer = setTimeout(() => {
          console.warn("[compressVideoFile] timed out, using original");
          resolve(file);
        }, COMPRESS_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
