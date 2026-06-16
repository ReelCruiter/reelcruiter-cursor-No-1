import Layout from "@/components/Layout";
import UserAvatar from "@/components/UserAvatar";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Eye,
  Star,
  X,
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Pencil,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  Copy,
  Trash2,
  Tag,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  fetchApplicationsForPost,
  updateApplicationStatus,
  closeJob,
  reopenJob,
  repostJob,
  toggleJobStatus,
  deleteMyJob,
  JOB_STATUS_LABEL,
  JOB_STATUS_HINT,
  JOB_STATUS_CLASS,
  type ApplicationStatus,
  type ManagedJobDetail,
  type ReceivedApplication,
} from "@/lib/applications";
import { jobTypeLabels } from "@/lib/models";
import { useAuth } from "@/lib/authCache";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import VideoFramePreview from "@/components/VideoFramePreview";

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const formatDate = (iso: string | null) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatJobTypes = (raw: string | null) => {
  if (!raw) return null;
  return raw
    .split(",")
    .map((t) => jobTypeLabels[t.trim() as keyof typeof jobTypeLabels] || t.trim())
    .filter(Boolean)
    .join(", ");
};

type FilterKey = "all" | "new" | "viewed" | "shortlisted" | "rejected";
type SortKey = "newest" | "oldest";

const APPLICANT_STATUS: Record<ApplicationStatus, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-primary text-primary-foreground" },
  viewed: { label: "Reviewed", cls: "bg-muted text-muted-foreground" },
  shortlisted: { label: "Shortlisted", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive" },
};

const JobApplications = () => {
  const { postId = "" } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { userId, ready } = useAuth();
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<ManagedJobDetail | null>(null);
  const [apps, setApps] = useState<ReceivedApplication[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const reload = useCallback(async () => {
    const { post: loadedPost, applications, error } = await fetchApplicationsForPost(postId);
    setPost(loadedPost);
    setApps(applications);
    setLoadError(error || null);
  }, [postId]);

  useEffect(() => {
    if (!ready) return;
    if (!userId) {
      setLoading(false);
      setPost(null);
      setApps([]);
      setLoadError("not-signed-in");
      return;
    }
    if (!postId.trim()) {
      setLoading(false);
      setPost(null);
      setApps([]);
      setLoadError("invalid-post");
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const { post: loadedPost, applications, error } = await fetchApplicationsForPost(postId);
      if (cancelled) return;
      setPost(loadedPost);
      setApps(applications);
      setLoadError(error || null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [postId, ready, userId]);

  const counts = useMemo(
    () => ({
      all: apps.length,
      new: apps.filter((a) => a.status === "new").length,
      viewed: apps.filter((a) => a.status === "viewed").length,
      shortlisted: apps.filter((a) => a.status === "shortlisted").length,
      rejected: apps.filter((a) => a.status === "rejected").length,
    }),
    [apps],
  );

  const visible = useMemo(() => {
    let list = [...apps];
    if (filter !== "all") list = list.filter((a) => a.status === filter);
    list.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sort === "newest" ? db - da : da - db;
    });
    return list;
  }, [apps, filter, sort]);

  const setStatus = async (id: string, status: ApplicationStatus) => {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    const { ok, error } = await updateApplicationStatus(id, status);
    if (!ok) {
      toast.error(error || "Could not update status");
      await reload();
    } else {
      const labels: Record<ApplicationStatus, string> = {
        new: "Marked as new",
        viewed: "Marked as reviewed",
        shortlisted: "Added to shortlist",
        rejected: "Applicant rejected",
      };
      toast.success(labels[status]);
    }
  };

  const markViewed = async (a: ReceivedApplication) => {
    if (a.status === "new") await setStatus(a.id, "viewed");
  };

  const handleTogglePause = async () => {
    if (!post) return;
    setActionBusy(true);
    const next = post.status === "paused" ? "active" : "paused";
    const { ok, error } = await toggleJobStatus(post.id, next);
    setActionBusy(false);
    if (!ok) {
      toast.error(error || "Could not update job status");
      return;
    }
    toast.success(next === "paused" ? "Job paused and hidden from feed" : "Job is live in the feed again");
    await reload();
  };

  const handleMarkFilled = async () => {
    if (!post) return;
    setActionBusy(true);
    const { ok, error } = await closeJob(post.id);
    setActionBusy(false);
    if (!ok) {
      toast.error(error || "Could not close job");
      return;
    }
    toast.success("Job marked as filled");
    await reload();
  };

  const handleReopen = async () => {
    if (!post) return;
    setActionBusy(true);
    const { ok, error } = await reopenJob(post.id);
    setActionBusy(false);
    if (!ok) {
      toast.error(error || "Could not reopen job");
      return;
    }
    toast.success("Job reopened and live in the feed");
    await reload();
  };

  const handleRepost = async () => {
    if (!post) return;
    setActionBusy(true);
    const closeOriginal = post.status === "active";
    const { ok, newId, error } = await repostJob(post.id, closeOriginal);
    setActionBusy(false);
    setRepostOpen(false);
    if (!ok) {
      toast.error(error || "Could not repost job");
      return;
    }
    toast.success("New job posted");
    if (newId) navigate(`/my-jobs/${newId}/applications`, { replace: true });
    else await reload();
  };

  const handleDelete = async () => {
    if (!post) return;
    setActionBusy(true);
    const { ok, error } = await deleteMyJob(post.id);
    setActionBusy(false);
    setDeleteOpen(false);
    if (!ok) {
      toast.error(error || "Could not delete job");
      return;
    }
    toast.success("Job deleted");
    navigate("/my-jobs", { replace: true });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!post) {
    return (
      <Layout>
        <div className="container py-12 max-w-2xl text-center">
          <Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-semibold">Job not found</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            {loadError === "not-signed-in"
              ? "Sign in to manage your job posts."
              : loadError === "invalid-post"
                ? "This job link is invalid."
                : "You can only manage jobs you posted."}
          </p>
          <Button asChild size="sm" variant="outline">
            <Link to="/my-jobs"><ArrowLeft className="w-4 h-4" /> Back to My jobs</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const jobTypes = formatJobTypes(post.jobType);
  const postedOn = formatDate(post.createdAt);
  const deadlineOn = formatDate(post.deadline);
  const location = [post.city, post.country].filter(Boolean).join(", ");

  const filterTabs: { key: FilterKey; label: string; n: number }[] = [
    { key: "all", label: "All", n: counts.all },
    { key: "new", label: "New", n: counts.new },
    { key: "shortlisted", label: "Shortlisted", n: counts.shortlisted },
    { key: "viewed", label: "Reviewed", n: counts.viewed },
    { key: "rejected", label: "Rejected", n: counts.rejected },
  ];

  return (
    <Layout>
      <div className="container py-4 sm:py-6 max-w-3xl space-y-4">
        {/* Top nav */}
        <div>
          <button
            type="button"
            onClick={() => navigate("/my-jobs")}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All my jobs
          </button>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Manage job</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review applicants and manage this listing.
          </p>
        </div>

        {/* Job overview */}
        <section className="bg-card rounded-xl card-shadow overflow-hidden relative">
          <div className="absolute top-3 right-3 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Job settings"
                  disabled={actionBusy}
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => navigate(`/post/${post.id}`)}>
                  <ExternalLink className="w-4 h-4 mr-2" /> View live post
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate(`/upload?edit=${post.id}`)}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit job details
                </DropdownMenuItem>
                {post.status === "active" && (
                  <DropdownMenuItem onSelect={handleTogglePause} disabled={actionBusy}>
                    <PauseCircle className="w-4 h-4 mr-2" /> Pause hiring
                  </DropdownMenuItem>
                )}
                {post.status === "paused" && (
                  <DropdownMenuItem onSelect={handleTogglePause} disabled={actionBusy}>
                    <PlayCircle className="w-4 h-4 mr-2" /> Resume hiring
                  </DropdownMenuItem>
                )}
                {post.status === "closed" && (
                  <DropdownMenuItem onSelect={handleReopen} disabled={actionBusy}>
                    <PlayCircle className="w-4 h-4 mr-2" /> Reopen job
                  </DropdownMenuItem>
                )}
                {(post.status === "active" || post.status === "paused") && (
                  <DropdownMenuItem onSelect={handleMarkFilled} disabled={actionBusy}>
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as filled
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setRepostOpen(true)} disabled={actionBusy}>
                  <Copy className="w-4 h-4 mr-2" /> Repost as new
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setDeleteOpen(true)}
                  disabled={actionBusy}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete job
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-40 md:w-48 flex-shrink-0 bg-black aspect-video sm:aspect-auto sm:min-h-[140px]">
              {post.videoUrl ? (
                <VideoFramePreview
                  videoUrl={post.videoUrl}
                  posterUrl={post.thumbnailUrl}
                  className="w-full h-full object-cover"
                />
              ) : post.thumbnailUrl ? (
                <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full min-h-[120px] flex items-center justify-center">
                  <Briefcase className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 p-4 sm:p-5 min-w-0 pr-12">
              <div className="flex flex-wrap items-start gap-2 mb-2">
                <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${JOB_STATUS_CLASS[post.status]}`}>
                  {JOB_STATUS_LABEL[post.status]}
                </span>
                {post.category && (
                  <span className="text-[11px] font-medium bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                    {post.category}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-heading font-bold text-card-foreground break-words leading-tight">
                {post.title}
              </h2>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {JOB_STATUS_HINT[post.status]}
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {location && (
                  <li className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    {location}
                  </li>
                )}
                {jobTypes && (
                  <li className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                    {jobTypes}
                  </li>
                )}
                {post.salary && (
                  <li className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
                    {post.salary}
                  </li>
                )}
                {postedOn && (
                  <li className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    Posted {postedOn}
                  </li>
                )}
                {deadlineOn && (
                  <li className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                    Apply by {deadlineOn}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* Applicants list */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm font-heading font-bold text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4" /> Applicants
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Shortlist strong candidates, message them, or reject applications you will not pursue.
              </p>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="text-xs font-medium bg-card border border-border rounded-md px-2 py-1.5 self-start sm:self-auto"
              aria-label="Sort applicants"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide mb-3 pb-1">
            {filterTabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  filter === t.key
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {t.label}
                {t.n > 0 && <span className="ml-1.5 font-bold">{t.n}</span>}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="text-center py-14 bg-card rounded-xl card-shadow border border-dashed border-border">
              <Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-semibold">
                {filter === "all" ? "No applications yet" : `No ${filterTabs.find((t) => t.key === filter)?.label.toLowerCase()} applicants`}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                {filter === "all"
                  ? post.status === "active"
                    ? "Share your job post to start receiving video applications from candidates."
                    : "This job is not live in the feed. Reopen or repost to attract new applicants."
                  : "Try another filter to see more applicants."}
              </p>
              {filter === "all" && post.status === "active" && (
                <Button asChild size="sm" variant="outline" className="mt-4">
                  <Link to={`/post/${post.id}`}>View and share job post</Link>
                </Button>
              )}
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((a) => {
                const meta = APPLICANT_STATUS[a.status];
                return (
                  <li
                    key={a.id}
                    className={`bg-card rounded-xl card-shadow p-4 ${
                      a.status === "new" ? "ring-1 ring-primary/30" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Link to={`/user/${a.applicantId}`} onClick={() => markViewed(a)} className="flex-shrink-0">
                        <UserAvatar src={a.applicantAvatar} name={a.applicantName} className="w-12 h-12" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              to={`/user/${a.applicantId}`}
                              onClick={() => markViewed(a)}
                              className="font-semibold text-sm text-card-foreground hover:text-primary block break-words"
                            >
                              {a.applicantName}
                            </Link>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Applied {formatRelative(a.createdAt)}
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 flex-shrink-0 ${meta.cls}`}>
                            {meta.label}
                          </span>
                        </div>

                        {a.coverNote && (
                          <p className="text-sm text-foreground/90 mt-2 whitespace-pre-line break-words line-clamp-4 bg-muted/40 rounded-lg px-3 py-2">
                            {a.coverNote}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 mt-3">
                          <Button asChild size="sm" variant="secondary" className="h-8">
                            <Link to={`/user/${a.applicantId}`} onClick={() => markViewed(a)}>
                              <Eye className="w-3.5 h-3.5" /> View profile
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="h-8">
                            <Link to={`/messages?to=${a.applicantId}`} onClick={() => markViewed(a)}>
                              <MessageSquare className="w-3.5 h-3.5" /> Message
                            </Link>
                          </Button>
                          {a.status !== "shortlisted" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                              onClick={() => setStatus(a.id, "shortlisted")}
                            >
                              <Star className="w-3.5 h-3.5" /> Shortlist
                            </Button>
                          )}
                          {a.status !== "rejected" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setStatus(a.id, "rejected")}
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </Button>
                          )}
                          {a.status !== "new" && a.status !== "viewed" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 text-muted-foreground"
                              onClick={() => setStatus(a.id, "viewed")}
                            >
                              Mark reviewed
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <AlertDialog open={repostOpen} onOpenChange={setRepostOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Repost as new?</AlertDialogTitle>
            <AlertDialogDescription>
              {post.status === "active"
                ? "A fresh listing will go live in the feed with a new posting date. This post will be marked as filled."
                : "A fresh listing will go live in the feed. This post stays in your history."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRepost} disabled={actionBusy}>
              Repost
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the job and all applications. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default JobApplications;
