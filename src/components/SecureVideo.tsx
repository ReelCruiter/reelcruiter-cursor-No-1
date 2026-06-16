import { forwardRef } from "react";
import { useSecureVideoUrl } from "@/lib/videoUrl";

type Props = Omit<React.VideoHTMLAttributes<HTMLVideoElement>, "src"> & {
  src: string;
  /** Optional placeholder shown while the signed/blob URL is loading. */
  fallback?: React.ReactNode;
  /** Stream via signed URL (fast start). Default false uses blob for harder downloads. */
  streamDirectly?: boolean;
};

/**
 * <video> wrapper that streams the source through a short-lived signed URL
 * fetched as a blob, so the native player has no shareable/downloadable file
 * URL. Adds `controlsList`, `disablePictureInPicture`, and a context-menu
 * blocker as additional deterrents.
 */
const SecureVideo = forwardRef<HTMLVideoElement, Props>(function SecureVideo(
  { src, fallback, streamDirectly = false, controlsList, onContextMenu, onLoadedData, ...rest },
  ref
) {
  const { url, loading } = useSecureVideoUrl(src, { streamDirectly });
  const guard = [
    "nodownload",
    "noremoteplayback",
    "noplaybackrate",
    controlsList || "",
  ]
    .filter(Boolean)
    .join(" ");

  if (loading || !url) {
    return (
      fallback ?? (
        <div className="w-full h-full bg-black flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-card/40 border-t-card animate-spin" />
        </div>
      )
    );
  }

  return (
    <video
      ref={ref}
      src={url}
      controlsList={guard}
      disablePictureInPicture
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e);
      }}
      onLoadedData={(e) => {
        onLoadedData?.(e);
      }}
      {...rest}
    />
  );
});

export default SecureVideo;
