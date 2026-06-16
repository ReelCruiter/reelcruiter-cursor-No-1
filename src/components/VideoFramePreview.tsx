import SecureVideo from "@/components/SecureVideo";
import { videoPosterAttr } from "@/lib/videoPoster";

type Props = {
  videoUrl: string;
  posterUrl?: string | null;
  className?: string;
};

/**
 * Paused video that loads metadata and shows the first frame (Facebook-style)
 * instead of a generic stock thumbnail image.
 */
const VideoFramePreview = ({ videoUrl, posterUrl, className = "w-full h-full object-cover" }: Props) => (
  <SecureVideo
    src={videoUrl}
    streamDirectly
    className={className}
    muted
    playsInline
    preload="metadata"
    poster={videoPosterAttr(posterUrl)}
  />
);

export default VideoFramePreview;
