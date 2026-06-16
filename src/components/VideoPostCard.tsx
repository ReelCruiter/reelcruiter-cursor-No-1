import { Heart, MessageCircle, Play, Bookmark, MapPin, Briefcase, Clock, DollarSign, Send, Volume2, VolumeX, Share2, Settings2 } from "lucide-react";
import type { VideoPost } from "@/lib/models";
import { formatJobTypeLabels } from "@/lib/posts";
import { useProfileStore } from "@/lib/profileStore";
import { useSavedJobs } from "@/lib/savedJobs";
import { useRef, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import UserAvatar from "@/components/UserAvatar";
import SecureVideo from "@/components/SecureVideo";
import { fetchLikeStats, fetchCommentCount, toggleLike } from "@/lib/interactions";
import { applyToPost, hasApplied, withdrawApplication, manageJobApplicationsPath } from "@/lib/applications";
import { useAuth } from "@/lib/authCache";
import { isEmployerPost } from "@/lib/posts";
import { formatRelativeTime } from "@/lib/time";
import { toast } from "sonner";
import PostActionsMenu from "@/components/PostActionsMenu";
import { videoPosterAttr } from "@/lib/videoPoster";
import { sharePost } from "@/lib/sharePost";

// Global single-video coordinator: ensures only ONE feed video plays at a time.
// Each card registers its <video> element; when one starts playing, all others pause.
const feedVideoRegistry = new Set<HTMLVideoElement>();
function registerFeedVideo(v: HTMLVideoElement) {
  feedVideoRegistry.add(v);
}
function unregisterFeedVideo(v: HTMLVideoElement) {
  feedVideoRegistry.delete(v);
}
function pauseAllExcept(current: HTMLVideoElement | null) {
  feedVideoRegistry.forEach((v) => {
    if (v !== current && !v.paused) {
      try { v.pause(); } catch { /* noop */ }
    }
  });
}

const tryPlayVideo = (v: HTMLVideoElement | null, muted: boolean) => {
  if (!v) return;
  pauseAllExcept(v);
  v.muted = muted;
  v.playsInline = true;
  const p = v.play();
  if (p && typeof p.catch === "function") {
    p.catch(() => { /* autoplay blocked — user can tap to play */ });
  }
};

const VideoPostCard = ({ post }: { post: VideoPost }) => {
  const [inView, setInView] = useState(false);
  const [shouldMountVideo, setShouldMountVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const { userId: currentUserId } = useAuth();
  const [applied, setApplied] = useState(false);
  const [muted, setMuted] = useState(true); // start muted for autoplay; user can unmute
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setVideoReady(false);
  }, [post.videoUrl]);
  const isOwnPost = !!currentUserId && post.userId === currentUserId;
  const isJobListing = isEmployerPost(post);
  const { savedIds, toggleSave, userId } = useSavedJobs();
  const saved = savedIds.has(post.id);

  // Hydrate like + comment counts from DB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [stats, cCount, didApply] = await Promise.all([
        fetchLikeStats(post.id),
        fetchCommentCount(post.id),
        post.tag === "hiring" || isJobListing ? hasApplied(post.id) : Promise.resolve(false),
      ]);
      if (cancelled) return;
      setLiked(stats.likedByMe);
      setLikeCount(stats.count);
      setCommentCount(cCount);
      setApplied(didApply);
    })();
    return () => { cancelled = true; };
  }, [post.id, post.tag]);

  const handleToggleLike = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUserId) {
      toast.error("Sign in to like posts");
      navigate("/signin");
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const res = await toggleLike(post.id);
    if (res.error) {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      toast.error("Could not update like");
    }
  };

  const handleToggleSave = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!userId) {
      toast.error("Sign in to save jobs");
      navigate("/signin");
      return;
    }
    const res = await toggleSave(post.id);
    if (res.error && res.error !== "not-signed-in") {
      toast.error("Could not update saved jobs");
    } else if (!res.error) {
      toast.success(res.saved ? "Job saved" : "Removed from saved");
    }
  };

  const handleManageJob = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!post.id?.trim()) {
      toast.error("Could not open job manager");
      navigate("/my-jobs");
      return;
    }
    navigate(manageJobApplicationsPath(post.id));
  };

  const handleApply = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (isOwnPost && isJobListing) {
      if (!post.id?.trim()) {
        toast.error("Could not open job manager");
        navigate("/my-jobs");
        return;
      }
      navigate(manageJobApplicationsPath(post.id));
      return;
    }
    if (!currentUserId) {
      toast.error("Sign in to apply");
      navigate("/signin");
      return;
    }
    if (post.userId === currentUserId) {
      toast.error("You can't apply to your own job");
      return;
    }
    if (applied) {
      setApplied(false);
      const res = await withdrawApplication(post.id);
      if (!res.ok) {
        setApplied(true);
        toast.error("Could not withdraw");
      } else {
        toast.success("Application withdrawn");
      }
      return;
    }
    setApplied(true);
    const res = await applyToPost(post.id);
    if (!res.ok) {
      setApplied(false);
      toast.error(res.error || "Could not apply");
    } else {
      toast.success("Application sent");
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShouldMountVideo(true);
        setInView(entry.isIntersecting && entry.intersectionRatio >= 0.35);
      },
      { threshold: [0, 0.25, 0.35, 0.5, 0.75, 1], rootMargin: "300px 0px" }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Register/unregister the underlying <video> in the global registry.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    registerFeedVideo(v);
    return () => {
      unregisterFeedVideo(v);
      try { v.pause(); } catch { /* noop */ }
    };
  }, [post.videoUrl, shouldMountVideo, videoReady]);

  // Autoplay the in-view feed video once it is ready to play.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (inView && videoReady) {
      tryPlayVideo(v, muted);
    } else {
      try { v.pause(); } catch { /* noop */ }
    }
  }, [inView, videoReady, muted, post.videoUrl]);

  const handleVideoReady = () => {
    setVideoReady(true);
    if (inView) tryPlayVideo(videoRef.current, muted);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
    if (!next) tryPlayVideo(v, false);
  };

  // Badge styles: OPEN TO WORK (green), HIRING (blue), WORKPLACE (primary), COMMUNITY (neutral)
  const kind = post.postKind || (post.tag === "hiring" ? "hiring" : "community");
  const badge =
    kind === "open_to_work"
      ? { label: "OPEN TO WORK", cls: "bg-emerald-500 text-white" }
      : kind === "hiring"
      ? { label: "JOB", cls: "bg-hiring text-hiring-foreground" }
      : kind === "workplace"
      ? { label: "WORKPLACE", cls: "bg-primary text-primary-foreground" }
      : { label: "COMMUNITY", cls: "bg-muted text-muted-foreground border border-border" };

  // Unified large video-first card used for ALL post kinds
  // (hiring, open-to-work, community, workplace). The previous mini
  // horizontal layout for hiring posts has been removed so every card
  // shows the full video prominently.
  return (
    <div
      ref={cardRef}
      className="bg-card rounded-xl overflow-hidden card-shadow hover:card-shadow-hover transition-shadow duration-300"
    >
      {/* Video thumbnail */}
      <div className="relative aspect-video bg-black overflow-hidden group cursor-pointer" onClick={() => navigate(`/post/${post.id}`)}>
        {post.videoUrl && shouldMountVideo ? (
          <SecureVideo
            ref={videoRef}
            src={post.videoUrl}
            streamDirectly
            className="w-full h-full object-cover"
            muted={muted}
            playsInline
            loop
            autoPlay={inView}
            preload={inView ? "auto" : "metadata"}
            poster={videoPosterAttr(post.thumbnail)}
            onLoadedData={handleVideoReady}
            onCanPlay={handleVideoReady}
          />
        ) : post.videoUrl ? (
          <div className="w-full h-full bg-muted animate-pulse" aria-hidden />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Play className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-card/90 flex items-center justify-center">
            <Play className="w-6 h-6 text-primary ml-0.5" />
          </div>
        </div>
        {post.videoUrl && (
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute video" : "Mute video"}
            className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-foreground/60 hover:bg-foreground/80 flex items-center justify-center text-card transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}
        {/* Save button — only for hiring posts (job listings) */}
        {post.tag === "hiring" && (
          <button
            onClick={handleToggleSave}
            aria-label={saved ? "Remove from saved" : "Save job"}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
          >
            <Bookmark className={`w-4 h-4 ${saved ? "fill-primary text-primary" : "text-foreground"}`} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* User info row */}
        <div className="flex items-start gap-3">
          <Link to={`/user/${post.userId}`}>
            <UserAvatar
              src={post.userAvatar}
              name={post.userName}
              className="w-10 h-10 hover:ring-2 hover:ring-primary transition-all"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link to={`/user/${post.userId}`} className="font-heading font-bold text-sm text-card-foreground truncate hover:text-primary transition-colors">
                {post.userName}
              </Link>
              <span className={`text-[10px] tracking-wide px-2 py-0.5 rounded-full font-bold ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{post.userTitle}</p>
          </div>
          <PostActionsMenu post={post} isOwner={isOwnPost} />
        </div>

        {/* Job title */}
        <h4 className="font-heading font-extrabold text-lg sm:text-xl text-card-foreground leading-tight tracking-tight">
          {post.jobTitle}
        </h4>

        {/* Meta: location, job type, salary — labels differ for Open-to-Work seekers vs Hiring posts */}
        {kind === "open_to_work" ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {(post.preferredLocation || post.location.city || post.location.country) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="font-medium text-card-foreground/80">Preferred:</span>{" "}
                {post.preferredLocation || `${post.location.city}, ${post.location.country}`}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Briefcase className="w-3 h-3" />
              <span className="font-medium text-card-foreground/80">Looking for:</span>{" "}
              {formatJobTypeLabels(post.jobType)}
            </span>
            {post.salary && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                <span className="font-medium text-card-foreground/80">Expected:</span>{" "}
                {post.salary}
              </span>
            )}
            {post.immediateStart && (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <Clock className="w-3 h-3" />
                Available immediately
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span className="font-medium text-card-foreground/80">Posted:</span>{" "}
              {post.createdAtIso ? formatRelativeTime(post.createdAtIso) : (post.daysAgo === 0 ? "just now" : `${post.daysAgo} days ago`)}
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {post.location.city}, {post.location.country}
            </span>
            <span className="flex items-center gap-1">
              <Briefcase className="w-3 h-3" />
              {formatJobTypeLabels(post.jobType)}
            </span>
            {post.salary && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {post.salary}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.createdAtIso ? formatRelativeTime(post.createdAtIso) : (post.daysAgo === 0 ? "just now" : `${post.daysAgo} days ago`)}
            </span>
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-card-foreground leading-relaxed line-clamp-2">
          {post.description}
        </p>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-2 border-t border-border">
          <button
            onClick={handleToggleLike}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              liked ? "text-destructive" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
            {likeCount}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {commentCount}
          </button>
          {post.tag === "hiring" && (
            <button
              onClick={handleToggleSave}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                saved ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
              {saved ? "Saved" : "Save"}
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); sharePost(post); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Share post"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>

          <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full max-w-[45%] truncate">
            {post.category}
          </span>

          {/* Apply button for hiring posts — full width on its own row to avoid overflow on small screens */}
          {isJobListing && (
            <button
              type="button"
              onClick={isOwnPost ? handleManageJob : handleApply}
              className={`basis-full flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                isOwnPost
                  ? "bg-primary text-primary-foreground hover:opacity-90"
                  : applied
                  ? "bg-accent/20 text-accent border border-accent/30"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {isOwnPost ? <Settings2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
              {isOwnPost ? "Manage Job" : applied ? "Applied" : "Apply Now"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPostCard;
