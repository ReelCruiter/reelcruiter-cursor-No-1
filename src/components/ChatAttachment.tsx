import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, AlertCircle, Download, Play, X, Maximize2 } from "lucide-react";
import { getChatAttachmentUrl } from "@/lib/messaging";
import { motion, AnimatePresence } from "framer-motion";

interface ChatAttachmentProps {
  url: string;
  name?: string | null;
  type?: string | null;
  size?: number | null;
  isMe: boolean;
}

/**
 * Renders a chat attachment by resolving the stored storage path into a
 * fresh signed URL. Handles images, videos, and generic files with a
 * graceful fallback when the URL can't be loaded.
 */
export default function ChatAttachment({ url, name, type, size, isMe }: ChatAttachmentProps) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [played, setPlayed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let cancelled = false;
    setResolved(null);
    setError(false);
    (async () => {
      try {
        const u = await getChatAttachmentUrl(url);
        if (!cancelled) setResolved(u);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const isImage = type?.startsWith("image/") ?? false;
  const isVideo = type?.startsWith("video/") ?? false;

  const fmtDur = (s: number) => {
    if (!isFinite(s)) return "";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  if (error) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-1 text-xs ${
          isMe ? "bg-primary-foreground/15" : "bg-background"
        }`}
      >
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>Failed to load file</span>
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="rounded-2xl mb-1 overflow-hidden bg-gradient-to-br from-muted to-muted/40 animate-pulse w-56 h-40 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin opacity-60" />
      </div>
    );
  }

  if (isImage) {
    return (
      <a href={resolved} target="_blank" rel="noreferrer" className="block group relative">
        <img
          src={resolved}
          alt={name ?? "attachment"}
          className="rounded-2xl max-h-72 object-cover mb-1 shadow-md group-hover:shadow-lg transition-shadow"
          onError={() => setError(true)}
        />
        <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm text-white items-center justify-center hidden group-hover:flex">
          <Maximize2 className="w-3.5 h-3.5" />
        </div>
      </a>
    );
  }

  if (isVideo) {
    return (
      <>
        <motion.button
          type="button"
          onClick={() => {
            setFullscreen(true);
            setPlayed(true);
          }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="relative block w-full max-w-[280px] rounded-2xl overflow-hidden mb-1 shadow-lg group bg-black"
        >
          <video
            ref={videoRef}
            src={resolved}
            preload="metadata"
            muted
            playsInline
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            className="w-full h-44 object-cover"
            onError={() => setError(true)}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30 pointer-events-none" />
          {/* Center play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/95 text-foreground flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
              <Play className="w-6 h-6 fill-current ml-0.5" />
            </div>
          </div>
          {/* Top-left badge */}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-semibold tracking-wide uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Video
          </div>
          {/* Duration */}
          {duration != null && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono">
              {fmtDur(duration)}
            </div>
          )}
          {/* Unwatched dot */}
          {!played && !isMe && (
            <div className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full bg-accent shadow-lg ring-2 ring-black/30" />
          )}
        </motion.button>

        <AnimatePresence>
          {fullscreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
              onClick={() => setFullscreen(false)}
            >
              <button
                onClick={() => setFullscreen(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <motion.video
                initial={{ scale: 0.92 }}
                animate={{ scale: 1 }}
                src={resolved}
                controls
                autoPlay
                playsInline
                onClick={(e) => e.stopPropagation()}
                className="max-h-[90vh] max-w-full rounded-xl shadow-2xl"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <a
      href={resolved}
      target="_blank"
      rel="noreferrer"
      download={name ?? undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-1 transition-colors ${
        isMe ? "bg-primary-foreground/15 hover:bg-primary-foreground/20" : "bg-background hover:bg-muted"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isMe ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"}`}>
        <FileText className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate">{name ?? "Attachment"}</p>
        {size != null && (
          <p className="text-[10px] opacity-70">{(size / 1024).toFixed(1)} KB</p>
        )}
      </div>
      <Download className="w-4 h-4 flex-shrink-0 opacity-70" />
    </a>
  );
}