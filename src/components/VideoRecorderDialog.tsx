import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, AlertCircle, Video as VideoIcon, Square, RefreshCw, Check, ScrollText, Pause, Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

interface VideoRecorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded: (file: File) => void;
  /** Maximum duration in seconds (defaults to 90) */
  maxSeconds?: number;
}

/**
 * Desktop / laptop in-browser video recorder using getUserMedia + MediaRecorder.
 * Shows a clear fallback when the camera or recording API is unavailable.
 * Always invoked explicitly by the user — never silently swapped for a file picker.
 */
const VideoRecorderDialog = ({
  open,
  onOpenChange,
  onRecorded,
  maxSeconds = 90,
}: VideoRecorderDialogProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const [status, setStatus] = useState<
    "idle" | "requesting" | "ready" | "recording" | "preview" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [recordedFile, setRecordedFile] = useState<File | null>(null);

  // Teleprompter state
  const [teleprompterOn, setTeleprompterOn] = useState(false);
  const [script, setScript] = useState("");
  const [scrollSpeed, setScrollSpeed] = useState(30); // px per second
  const [fontSize, setFontSize] = useState(20);
  const [scrolling, setScrolling] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const scrollLastTsRef = useRef<number | null>(null);

  const supported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    typeof (window as any).MediaRecorder === "function";

  // Cleanup helper
  const cleanup = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
    scrollLastTsRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try { recorderRef.current.stop(); } catch {}
    }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start camera when dialog opens
  useEffect(() => {
    if (!open) {
      cleanup();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl("");
      setRecordedFile(null);
      setSeconds(0);
      setStatus("idle");
      setErrorMsg("");
      return;
    }
    if (!supported) {
      setStatus("error");
      setErrorMsg(
        "Camera recording is not available on this device or browser. Please use Upload Video instead."
      );
      return;
    }

    let cancelled = false;
    const start = async () => {
      setStatus("requesting");
      setErrorMsg("");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          await videoRef.current.play().catch(() => {});
        }
        setStatus("ready");
      } catch (err: any) {
        if (cancelled) return;
        setStatus("error");
        const name = err?.name || "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setErrorMsg(
            "Camera permission was denied. Allow camera access in your browser settings, or use Upload Video instead."
          );
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setErrorMsg(
            "No camera was found on this device. Please use Upload Video instead."
          );
        } else {
          setErrorMsg(
            "Camera is not available on this device. Please use Upload Video instead."
          );
        }
      }
    };
    start();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, supported]);

  // Auto-scroll the teleprompter while recording
  useEffect(() => {
    const shouldScroll =
      teleprompterOn && status === "recording" && scrolling && !!script.trim();
    if (!shouldScroll) {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
      scrollLastTsRef.current = null;
      return;
    }
    const tick = (ts: number) => {
      const el = scrollRef.current;
      if (!el) return;
      if (scrollLastTsRef.current == null) scrollLastTsRef.current = ts;
      const dt = (ts - scrollLastTsRef.current) / 1000;
      scrollLastTsRef.current = ts;
      el.scrollTop = Math.min(el.scrollHeight, el.scrollTop + scrollSpeed * dt);
      scrollRafRef.current = requestAnimationFrame(tick);
    };
    scrollRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
      scrollLastTsRef.current = null;
    };
  }, [teleprompterOn, status, scrolling, scrollSpeed, script]);

  // Reset scroll position when starting a new recording
  useEffect(() => {
    if (status === "recording" && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      setScrolling(true);
    }
  }, [status]);

  const pickMimeType = () => {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    for (const c of candidates) {
      try {
        if ((window as any).MediaRecorder?.isTypeSupported?.(c)) return c;
      } catch {}
    }
    return "";
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(streamRef.current, { mimeType })
        : new MediaRecorder(streamRef.current);
    } catch {
      setStatus("error");
      setErrorMsg("Recording is not supported by this browser. Please use Upload Video instead.");
      return;
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const type = mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `recording-${Date.now()}.${ext}`, { type });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setRecordedFile(file);
      setStatus("preview");
      // Free the camera now that we have the recording
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.muted = false;
        videoRef.current.src = url;
        videoRef.current.controls = true;
      }
    };
    recorder.start(250);
    setSeconds(0);
    setStatus("recording");
    timerRef.current = window.setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        if (next >= maxSeconds) {
          stopRecording();
        }
        return next;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try { recorderRef.current.stop(); } catch {}
    }
  };

  const retake = async () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setRecordedFile(null);
    setSeconds(0);
    if (videoRef.current) {
      videoRef.current.removeAttribute("src");
      videoRef.current.controls = false;
      videoRef.current.muted = true;
    }
    // Reacquire stream
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus("ready");
    } catch {
      setStatus("error");
      setErrorMsg("Could not reopen the camera. Close and try again, or use Upload Video.");
    }
  };

  const useThisRecording = () => {
    if (recordedFile) {
      onRecorded(recordedFile);
      onOpenChange(false);
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-4 h-4" /> Record Video
          </DialogTitle>
          <DialogDescription>
            {status === "preview"
              ? "Review your recording, then use it or retake."
              : `Record up to ${maxSeconds}s using your camera and microphone.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {status === "error" ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Camera unavailable</p>
                <p className="text-xs text-muted-foreground">{errorMsg}</p>
              </div>
            </div>
          ) : (
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
              <video
                ref={videoRef}
                playsInline
                className="w-full h-full object-cover"
              />
              {teleprompterOn && script.trim() && (status === "ready" || status === "recording") && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-t from-black/80 via-black/55 to-transparent">
                  <div
                    ref={scrollRef}
                    className="absolute inset-x-0 bottom-0 top-2 overflow-hidden px-4 pb-4"
                  >
                    <div
                      className="text-white text-center font-medium whitespace-pre-wrap leading-relaxed"
                      style={{ fontSize: `${fontSize}px`, paddingTop: "30%", paddingBottom: "60%" }}
                    >
                      {script}
                    </div>
                  </div>
                  {status === "recording" && (
                    <button
                      type="button"
                      onClick={() => setScrolling((s) => !s)}
                      className="pointer-events-auto absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-xs"
                    >
                      {scrolling ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {scrolling ? "Pause" : "Play"}
                    </button>
                  )}
                </div>
              )}
              {status === "requesting" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Starting camera…
                </div>
              )}
              {status === "recording" && (
                <div className="absolute top-3 left-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  REC {fmt(seconds)}
                </div>
              )}
              {status === "ready" && (
                <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs">
                  <VideoIcon className="w-3 h-3" /> Live preview
                </div>
              )}
            </div>
          )}

          {status !== "error" && status !== "preview" && (
            <div className="rounded-lg border border-border bg-card">
              <button
                type="button"
                onClick={() => setTeleprompterOn((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium"
              >
                <span className="flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-primary" />
                  Teleprompter
                </span>
                <span className="text-xs text-muted-foreground">
                  {teleprompterOn ? "On" : "Off"}
                </span>
              </button>
              {teleprompterOn && (
                <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                  <Textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="Paste or write your script here. It will scroll over the camera while you record."
                    rows={3}
                    disabled={status === "recording"}
                    className="text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Speed ({scrollSpeed} px/s)
                      </label>
                      <Slider
                        value={[scrollSpeed]}
                        min={10}
                        max={120}
                        step={5}
                        onValueChange={(v) => setScrollSpeed(v[0] ?? 30)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Text size ({fontSize}px)
                      </label>
                      <Slider
                        value={[fontSize]}
                        min={14}
                        max={36}
                        step={1}
                        onValueChange={(v) => setFontSize(v[0] ?? 20)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {status === "error" && (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
              Close
            </Button>
          )}
          {status === "ready" && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="sm:w-auto w-full">
                Cancel
              </Button>
              <Button onClick={startRecording} className="sm:flex-1 w-full">
                <Camera className="w-4 h-4 mr-2" /> Start recording
              </Button>
            </>
          )}
          {status === "recording" && (
            <Button variant="destructive" onClick={stopRecording} className="w-full">
              <Square className="w-4 h-4 mr-2" /> Stop recording
            </Button>
          )}
          {status === "preview" && (
            <>
              <Button variant="outline" onClick={retake} className="sm:w-auto w-full">
                <RefreshCw className="w-4 h-4 mr-2" /> Retake
              </Button>
              <Button onClick={useThisRecording} className="sm:flex-1 w-full">
                <Check className="w-4 h-4 mr-2" /> Use this recording
              </Button>
            </>
          )}
          {(status === "idle" || status === "requesting") && (
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VideoRecorderDialog;