import Layout from "@/components/Layout";
import { useAuth } from "@/lib/authCache";
import type { VideoPost } from "@/lib/models";
import { formatJobTypeLabels, fetchPostById, dbRowToVideoPost, isEmployerPost } from "@/lib/posts";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Bookmark, MapPin, Briefcase, Clock, DollarSign, Send, ArrowLeft, Play, Share2, Trash2, MoreHorizontal, ThumbsUp, Smile, Image as ImageIcon, ChevronDown, Users, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import SecureVideo from "@/components/SecureVideo";
import { useSavedJobs } from "@/lib/savedJobs";
import { addComment, deleteComment, fetchComments, fetchLikeStats, toggleCommentLike, toggleLike, type PostComment } from "@/lib/interactions";
import { applyToPost, hasApplied, withdrawApplication, fetchApplicantCount, formatApplicantCount, manageJobApplicationsPath } from "@/lib/applications";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatRelativeTime as fmtRelative, formatRelativeTimeShort } from "@/lib/time";
import PostActionsMenu from "@/components/PostActionsMenu";
import { videoPosterAttr } from "@/lib/videoPoster";
import { sharePost } from "@/lib/sharePost";
import { useProfileStore } from "@/lib/profileStore";

const formatRelativeTime = (iso: string): string => {
  return formatRelativeTimeShort(iso);
};

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const posts = useProfileStore((s) => s.posts);
  const cachedPost = posts.find((p) => p.id === id);
  const [fetchedPost, setFetchedPost] = useState<VideoPost | null>(null);
  const post = cachedPost ?? fetchedPost;

  const { savedIds, toggleSave, userId } = useSavedJobs();
  const { userId: currentUserId, ready: authReady } = useAuth();
  const isJobListing = post ? isEmployerPost(post) : false;
  const isOwnPost = !!currentUserId && !!post && post.userId === currentUserId;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [applied, setApplied] = useState(false);
  const [applicantCount, setApplicantCount] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<PostComment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [myAvatar, setMyAvatar] = useState<string>("");
  const [myName, setMyName] = useState<string>("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [sort, setSort] = useState<"top" | "newest">("newest");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const saved = id ? savedIds.has(id) : false;

  // Load this post only when it is not already in the feed cache.
  useEffect(() => {
    if (!id || cachedPost) return;
    let cancelled = false;
    (async () => {
      const row = await fetchPostById(id);
      if (cancelled || !row) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, role, company_name, company_logo_url, active_mode")
        .eq("user_id", row.user_id)
        .maybeSingle();
      if (cancelled) return;
      setFetchedPost(dbRowToVideoPost(row, prof));
    })();
    return () => {
      cancelled = true;
    };
  }, [id, cachedPost]);

  useEffect(() => {
    if (!authReady || !currentUserId) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", currentUserId)
        .maybeSingle();
      setMyAvatar(prof?.avatar_url || "");
      setMyName(prof?.full_name || "You");
    })();
  }, [authReady, currentUserId]);

  // Hydrate likes + comments from DB
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const [stats, list, didApply, appCount] = await Promise.all([
        fetchLikeStats(id),
        fetchComments(id),
        hasApplied(id),
        fetchApplicantCount(id),
      ]);
      if (cancelled) return;
      setLiked(stats.likedByMe);
      setLikeCount(stats.count);
      setComments(list);
      setApplied(didApply);
      setApplicantCount(appCount);
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Realtime: keep applicant count in sync when applications are added/withdrawn.
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`applicants-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_applications", filter: `post_id=eq.${id}` },
        async () => {
          const next = await fetchApplicantCount(id);
          setApplicantCount(next);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleApply = async () => {
    if (!id || !post) return;
    if (isOwnPost && isJobListing) {
      navigate(manageJobApplicationsPath(id));
      return;
    }
    if (!currentUserId) {
      toast.error("Sign in to apply");
      navigate("/signin");
      return;
    }
    if (applied) {
      // withdraw
      setApplied(false);
      setApplicantCount((c) => Math.max(0, c - 1));
      const res = await withdrawApplication(id);
      if (!res.ok) {
        setApplied(true);
        setApplicantCount((c) => c + 1);
        toast.error("Could not withdraw");
      } else {
        toast.success("Application withdrawn");
      }
      return;
    }
    setApplied(true);
    setApplicantCount((c) => c + 1);
    const res = await applyToPost(id);
    if (!res.ok) {
      setApplied(false);
      setApplicantCount((c) => Math.max(0, c - 1));
      toast.error(res.error || "Could not apply");
    } else {
      toast.success("Application sent");
    }
  };

  const handleToggleLike = async () => {
    if (!id) return;
    if (!currentUserId) {
      toast.error("Sign in to like posts");
      navigate("/signin");
      return;
    }
    // Optimistic
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const res = await toggleLike(id);
    if (res.error) {
      // revert
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      toast.error("Could not update like");
    }
  };

  const handleToggleSave = async () => {
    if (!id) return;
    if (!userId) {
      toast.error("Sign in to save jobs");
      navigate("/signin");
      return;
    }
    const res = await toggleSave(id);
    if (res.error && res.error !== "not-signed-in") toast.error("Could not update saved jobs");
    else if (!res.error) toast.success(res.saved ? "Job saved" : "Removed from saved");
  };

  const handleSubmitComment = async () => {
    if (!id) return;
    const text = comment.trim();
    if (!text) return;
    if (!currentUserId) {
      toast.error("Sign in to comment");
      navigate("/signin");
      return;
    }
    setSubmitting(true);
    const { comment: created, error } = await addComment(id, text);
    setSubmitting(false);
    if (error || !created) {
      toast.error("Could not post comment");
      return;
    }
    setComments((prev) => [created, ...prev]);
    setComment("");
    setComposerOpen(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== commentId));
    const { error } = await deleteComment(commentId);
    if (error) {
      setComments(prev);
      toast.error("Could not delete comment");
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    if (!currentUserId) {
      toast.error("Sign in to like comments");
      navigate("/signin");
      return;
    }
    const target = comments.find((c) => c.id === commentId);
    if (!target) return;
    const next = !target.likedByMe;
    setComments((cs) =>
      cs.map((c) =>
        c.id === commentId
          ? { ...c, likedByMe: next, likeCount: c.likeCount + (next ? 1 : -1) }
          : c
      )
    );
    const res = await toggleCommentLike(commentId);
    if (res.error) {
      // revert
      setComments((cs) =>
        cs.map((c) =>
          c.id === commentId
            ? { ...c, likedByMe: !next, likeCount: c.likeCount + (next ? -1 : 1) }
            : c
        )
      );
      toast.error("Could not update like");
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!id) return;
    const text = replyText.trim();
    if (!text) return;
    if (!currentUserId) {
      toast.error("Sign in to reply");
      navigate("/signin");
      return;
    }
    setReplySubmitting(true);
    const { comment: created, error } = await addComment(id, text, parentId);
    setReplySubmitting(false);
    if (error || !created) {
      toast.error("Could not post reply");
      return;
    }
    setComments((prev) => [created, ...prev]);
    setReplyText("");
    setReplyTo(null);
  };

  const handleShare = async () => {
    if (!id || !post) return;
    await sharePost(post);
  };

  if (!post) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <p className="text-lg text-muted-foreground">Post not found</p>
          <button onClick={() => navigate("/feed")} className="mt-4 text-primary hover:underline text-sm">
            Back to Feed
          </button>
        </div>
      </Layout>
    );
  }

  const tagStyles =
    post.tag === "job-seeker"
      ? "bg-accent text-accent-foreground"
      : "bg-hiring text-hiring-foreground";

  return (
    <Layout>
      <div className="container py-6 max-w-2xl">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Single unified card: author → video → details */}
        <article className="bg-card rounded-2xl card-shadow overflow-hidden">
          {/* Author header */}
          <header className="flex items-center gap-3 p-4 sm:p-5 border-b border-border">
            <Link to={`/user/${post.userId}`} className="flex-shrink-0">
              <UserAvatar
                src={post.userAvatar}
                name={post.userName}
                className="w-12 h-12 rounded-full ring-1 ring-border hover:ring-2 hover:ring-primary transition-all"
              />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/user/${post.userId}`}
                  className="font-heading font-bold text-card-foreground hover:text-primary transition-colors truncate"
                >
                  {post.userName}
                </Link>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tagStyles}`}>
                  {post.tag === "job-seeker" ? "Job Seeker" : "Hiring"}
                </span>
                {post.userId === currentUserId && (
                  <span className="text-[10px] tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                    YOUR POST
                  </span>
                )}
              </div>
              {isEmployerPost(post) && post.userTitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{post.userTitle}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {post.createdAtIso ? fmtRelative(post.createdAtIso) : (post.daysAgo === 0 ? "just now" : `${post.daysAgo} days ago`)}
              </p>
            </div>
            <PostActionsMenu post={post} isOwner={isOwnPost} />
          </header>

          {/* Video Player */}
          <div className="relative aspect-video bg-black">
            {post.videoUrl ? (
              <SecureVideo
                src={post.videoUrl}
                poster={videoPosterAttr(post.thumbnail)}
                controls
                playsInline
                preload="metadata"
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Play className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-5">
            {/* Job title */}
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-card-foreground leading-tight">
              {post.jobTitle}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span className="flex flex-col leading-tight">
                <span>{post.location.city}, {post.location.country}</span>
                {post.tag === "hiring" && post.fullAddress && (
                  <span className="text-xs text-muted-foreground/80">{post.fullAddress}</span>
                )}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              {formatJobTypeLabels(post.jobType)}
            </span>
            {post.salary && (
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                {post.salary}
              </span>
            )}
          </div>

          {/* Description */}
          {post.description && (
            <p className="text-card-foreground leading-relaxed whitespace-pre-line">
              {post.description}
            </p>
          )}

          {/* Actions — wrap to multiple rows on narrow screens so Apply Now is never cut off */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <button
                onClick={handleToggleLike}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  liked ? "text-destructive" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
                {likeCount}
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById("comments-section");
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                {comments.length}
              </button>
              {post.tag === "hiring" && (
                <button
                  onClick={handleToggleSave}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    saved ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Bookmark className={`w-5 h-5 ${saved ? "fill-current" : ""}`} />
                  Save
                </button>
              )}
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>
            </div>

            {isJobListing && (
              <div className="space-y-2">
                <div
                  className="flex items-center gap-1.5 text-sm text-muted-foreground"
                  aria-live="polite"
                >
                  <Users className="w-4 h-4" />
                  <span className="font-medium text-foreground">
                    {formatApplicantCount(applicantCount)}
                  </span>
                </div>
                <button
                type="button"
                onClick={handleApply}
                className={`w-full flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors ${
                  isOwnPost
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : applied
                    ? "bg-accent/20 text-accent border border-accent/30"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
                >
                  {isOwnPost ? <Settings2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {isOwnPost ? "Manage Job" : applied ? "Applied" : "Apply Now"}
                </button>
              </div>
            )}
          </div>

          {/* Comments section — LinkedIn style */}
          <section id="comments-section" className="pt-4 mt-2 border-t border-border">
            {/* Composer */}
            {currentUserId ? (
              <div className="flex gap-2 items-start">
                <UserAvatar src={myAvatar} name={myName} className="w-10 h-10 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div
                    className={`rounded-3xl border border-border bg-card transition-all ${
                      composerOpen ? "ring-1 ring-foreground/20" : "hover:bg-muted/40"
                    }`}
                  >
                    {!composerOpen ? (
                      <button
                        type="button"
                        onClick={() => setComposerOpen(true)}
                        className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground font-medium"
                      >
                        Add a comment…
                      </button>
                    ) : (
                      <div className="px-4 pt-3 pb-2">
                        <textarea
                          value={comment}
                          autoFocus
                          onChange={(e) => setComment(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                              e.preventDefault();
                              handleSubmitComment();
                            }
                          }}
                          rows={1}
                          placeholder="Add a comment…"
                          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none min-h-[24px] max-h-40 leading-6"
                          style={{ height: "auto" }}
                          onInput={(e) => {
                            const t = e.currentTarget;
                            t.style.height = "auto";
                            t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
                          }}
                        />
                        <div className="flex items-center justify-between pt-2 border-t border-border/60 mt-2">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <button
                              type="button"
                              aria-label="Add emoji"
                              className="p-2 rounded-full hover:bg-muted transition-colors"
                            >
                              <Smile className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              aria-label="Add image"
                              className="p-2 rounded-full hover:bg-muted transition-colors"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>
                            <span className={`ml-1 text-[11px] ${comment.length > 480 ? "text-destructive" : "text-muted-foreground"}`}>
                              {comment.length}/500
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setComment("");
                                setComposerOpen(false);
                              }}
                              className="text-xs font-semibold text-muted-foreground hover:bg-muted px-3 py-1.5 rounded-full transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSubmitComment}
                              disabled={submitting || !comment.trim() || comment.length > 500}
                              className="text-xs font-bold bg-primary text-primary-foreground px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                            >
                              {submitting ? "Posting…" : "Comment"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 p-4 bg-muted/40 border border-border rounded-2xl">
                <p className="text-sm text-muted-foreground">Sign in to join the conversation.</p>
                <button
                  onClick={() => navigate("/signin")}
                  className="text-xs font-bold bg-primary text-primary-foreground px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
                >
                  Sign in
                </button>
              </div>
            )}

            {/* Sort bar */}
            {comments.length > 0 && (
              <div className="flex items-center justify-end mt-4 mb-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                      Most {sort === "top" ? "relevant" : "recent"}
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setSort("top")}>Most relevant</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setSort("newest")}>Most recent</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* List */}
            {comments.length === 0 ? (
              <div className="text-center py-8 mt-2">
                <p className="text-sm text-muted-foreground">
                  No comments yet. Be the first to comment.
                </p>
              </div>
            ) : (
              (() => {
                const topLevel = comments.filter((c) => !c.parentId);
                const repliesByParent: Record<string, PostComment[]> = {};
                comments
                  .filter((c) => c.parentId)
                  .forEach((c) => {
                    const pid = c.parentId as string;
                    (repliesByParent[pid] = repliesByParent[pid] || []).push(c);
                  });
                Object.keys(repliesByParent).forEach((k) => {
                  repliesByParent[k].sort(
                    (a, b) =>
                      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                  );
                });
                const sorted = [...topLevel].sort((a, b) =>
                  sort === "newest"
                    ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    : 0
                );

                const renderComment = (c: PostComment, isReply = false) => {
                  const isMine = currentUserId === c.userId;
                  const isAuthor = c.userId === post.userId;
                  const replies = repliesByParent[c.id] || [];
                  return (
                    <li key={c.id} className="flex gap-2 py-2 group">
                      <Link to={`/user/${c.userId}`} className="flex-shrink-0">
                        <UserAvatar
                          src={c.userAvatar}
                          name={c.userName}
                          className={isReply ? "w-8 h-8" : "w-10 h-10"}
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="rounded-lg bg-muted/60 px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Link
                                  to={`/user/${c.userId}`}
                                  className="text-sm font-bold text-foreground hover:text-primary truncate transition-colors"
                                >
                                  {c.userName}
                                </Link>
                                <span
                                  className="text-[11px] text-muted-foreground"
                                  title={new Date(c.createdAt).toLocaleString()}
                                >
                                  • {formatRelativeTimeShort(c.createdAt)}
                                </span>
                                {isAuthor && (
                                  <span className="text-[10px] font-semibold text-muted-foreground">
                                    • Author
                                  </span>
                                )}
                                {isMine && (
                                  <span className="text-[10px] font-semibold text-muted-foreground">
                                    • You
                                  </span>
                                )}
                              </div>
                            </div>
                            {isMine && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    aria-label="Comment options"
                                    className="text-muted-foreground hover:text-foreground p-1 -mr-1 -mt-1 rounded-full hover:bg-background/60 transition-colors"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onSelect={() => handleDeleteComment(c.id)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          <p className="mt-1.5 text-sm text-foreground whitespace-pre-line break-words leading-relaxed">
                            {c.content}
                          </p>
                        </div>
                        {/* Action row */}
                        <div className="flex items-center gap-1 px-2 mt-1 text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => handleToggleCommentLike(c.id)}
                            className={`text-xs font-semibold px-2 py-1 rounded-md transition-colors inline-flex items-center gap-1 hover:bg-muted ${
                              c.likedByMe ? "text-primary" : "hover:text-foreground"
                            }`}
                          >
                            <ThumbsUp
                              className={`w-3.5 h-3.5 ${c.likedByMe ? "fill-current" : ""}`}
                            />
                            Like{c.likeCount > 0 ? ` · ${c.likeCount}` : ""}
                          </button>
                          {!isReply && (
                            <>
                              <span aria-hidden className="text-muted-foreground/60">·</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!currentUserId) {
                                    toast.error("Sign in to reply");
                                    navigate("/signin");
                                    return;
                                  }
                                  setReplyTo((cur) => (cur === c.id ? null : c.id));
                                  setReplyText("");
                                }}
                                className="text-xs font-semibold hover:text-foreground hover:bg-muted px-2 py-1 rounded-md transition-colors"
                              >
                                Reply
                              </button>
                            </>
                          )}
                        </div>

                        {/* Reply composer */}
                        {!isReply && replyTo === c.id && currentUserId && (
                          <div className="flex gap-2 mt-2">
                            <UserAvatar
                              src={myAvatar}
                              name={myName}
                              className="w-8 h-8 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0 rounded-2xl border border-border bg-card px-3 pt-2 pb-1.5 ring-1 ring-foreground/10">
                              <textarea
                                value={replyText}
                                autoFocus
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    handleSubmitReply(c.id);
                                  }
                                  if (e.key === "Escape") {
                                    setReplyTo(null);
                                    setReplyText("");
                                  }
                                }}
                                rows={1}
                                placeholder={`Reply to ${c.userName}…`}
                                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none min-h-[24px] max-h-32 leading-6"
                                onInput={(e) => {
                                  const t = e.currentTarget;
                                  t.style.height = "auto";
                                  t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
                                }}
                              />
                              <div className="flex items-center justify-end gap-1 pt-1 mt-1 border-t border-border/60">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReplyTo(null);
                                    setReplyText("");
                                  }}
                                  className="text-xs font-semibold text-muted-foreground hover:bg-muted px-3 py-1.5 rounded-full transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSubmitReply(c.id)}
                                  disabled={
                                    replySubmitting ||
                                    !replyText.trim() ||
                                    replyText.length > 500
                                  }
                                  className="text-xs font-bold bg-primary text-primary-foreground px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                                >
                                  {replySubmitting ? "Posting…" : "Reply"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Replies */}
                        {!isReply && replies.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {replies.map((r) => renderComment(r, true))}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                };

                return (
                  <ul className="mt-2">{sorted.map((c) => renderComment(c))}</ul>
                );
              })()
            )}
          </section>
          </div>
        </article>
      </div>
    </Layout>
  );
};

export default PostDetail;
