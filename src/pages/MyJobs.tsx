import Layout from "@/components/Layout";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Loader2,
  MapPin,
  ChevronRight,
  Plus,
  MoreVertical,
  Pencil,
  Copy,
  CheckCircle2,
  Trash2,
  PlayCircle,
  PauseCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { fetchMyJobs, deleteMyJob, closeJob, repostJob, reopenJob, toggleJobStatus, JOB_STATUS_LABEL, JOB_STATUS_CLASS, type MyJobSummary } from "@/lib/applications";
import VideoFramePreview from "@/components/VideoFramePreview";
import { toast } from "sonner";

const formatTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return "Today";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const STATUS_LABEL = JOB_STATUS_LABEL;
const STATUS_CLASS = JOB_STATUS_CLASS;

const MyJobs = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<MyJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [repostTarget, setRepostTarget] = useState<MyJobSummary | null>(null);

  const load = async () => {
    setLoading(true);
    setItems(await fetchMyJobs());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkAsFilled = async (job: MyJobSummary) => {
    const { ok, error } = await closeJob(job.id);
    if (!ok) {
      toast.error(error || "Could not close job.");
      return;
    }
    toast.success("Job marked as filled and removed from the feed");
    setItems((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, status: "closed" as const } : j))
    );
  };

  const handleTogglePause = async (job: MyJobSummary) => {
    const next = job.status === "paused" ? "active" : "paused";
    const { ok, error } = await toggleJobStatus(job.id, next);
    if (!ok) {
      toast.error(error || "Could not update job status.");
      return;
    }
    toast.success(next === "paused" ? "Job paused. It is hidden from the feed." : "Job is live again");
    setItems((prev) =>
      prev.map((j) =>
        j.id === job.id ? { ...j, status: next === "paused" ? "paused" : "active" } : j
      )
    );
  };

  const handleReopen = async (job: MyJobSummary) => {
    const { ok, error } = await reopenJob(job.id);
    if (!ok) {
      toast.error(error || "Could not reopen job.");
      return;
    }
    toast.success("Job reopened and live in the feed");
    setItems((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, status: "active" as const } : j))
    );
  };

  const handleRepost = async () => {
    if (!repostTarget) return;
    const closeOriginal = repostTarget.status === "active";
    const { ok, newId, error } = await repostJob(repostTarget.id, closeOriginal);
    setRepostTarget(null);
    if (!ok) {
      toast.error(error || "Could not repost job.");
      return;
    }
    toast.success("New job posted and active in the feed");
    await load();
    if (newId) {
      navigate(`/my-jobs/${newId}/applications`);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { ok, error } = await deleteMyJob(deleteId);
    setDeleteId(null);
    if (!ok) {
      toast.error(error || "Could not delete job.");
      return;
    }
    toast.success("Job deleted");
    setItems((prev) => prev.filter((j) => j.id !== deleteId));
  };

  return (
    <Layout>
      <div className="container py-6 sm:py-8 max-w-3xl">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground flex items-center gap-2">
              <Briefcase className="w-6 h-6 sm:w-7 sm:h-7" /> My jobs
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage your posts and review applicants.
            </p>
          </div>
          <Button asChild size="sm" className="flex-shrink-0">
            <Link to="/upload"><Plus className="w-4 h-4" /> Post job</Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl card-shadow">
            <Briefcase className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-semibold">No jobs yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Post your first job to start receiving applications.
            </p>
            <Button asChild size="sm"><Link to="/upload">Post a job</Link></Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((j) => (
              <li key={j.id} className="relative">
                <Link
                  to={`/my-jobs/${j.id}/applications`}
                  className="group flex items-stretch gap-3 bg-card rounded-xl card-shadow p-3 sm:p-4 hover:shadow-md transition-shadow pr-10 sm:pr-12"
                >
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {j.videoUrl ? (
                      <VideoFramePreview
                        videoUrl={j.videoUrl}
                        posterUrl={j.thumbnailUrl}
                        className="w-full h-full object-cover"
                      />
                    ) : j.thumbnailUrl ? (
                      <img src={j.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : j.companyLogoUrl ? (
                      <img src={j.companyLogoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Briefcase className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-heading font-extrabold text-base sm:text-lg leading-tight tracking-tight text-card-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {j.title}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] sm:text-[11px] font-semibold rounded-full px-2 py-0.5 ${STATUS_CLASS[j.status]}`}>
                          {STATUS_LABEL[j.status]}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground mt-1">
                      {(j.city || j.country) && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3" />
                          {[j.city, j.country].filter(Boolean).join(", ")}
                        </span>
                      )}
                      <span>·</span>
                      <span>{formatTime(j.createdAt)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {j.newApplicants > 0 && (
                        <span className="text-[11px] font-semibold bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                          {j.newApplicants} new {j.newApplicants === 1 ? "applicant" : "applicants"}
                        </span>
                      )}
                      <span className="text-[11px] font-medium bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                        {j.totalApplicants === 0
                          ? "No applications yet"
                          : j.totalApplicants === 1
                          ? "1 person applied"
                          : `${j.totalApplicants} people applied`}
                      </span>
                      {j.shortlisted > 0 && (
                        <span className="text-[11px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded-full px-2 py-0.5">
                          {j.shortlisted} shortlisted
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Three-dot menu — positioned over the card */}
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.preventDefault()}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => navigate(`/upload?edit=${j.id}`)}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit job
                      </DropdownMenuItem>
                      {j.status === "active" && (
                        <DropdownMenuItem onClick={() => handleTogglePause(j)}>
                          <PauseCircle className="w-4 h-4 mr-2" /> Pause hiring
                        </DropdownMenuItem>
                      )}
                      {j.status === "paused" && (
                        <DropdownMenuItem onClick={() => handleTogglePause(j)}>
                          <PlayCircle className="w-4 h-4 mr-2" /> Resume hiring
                        </DropdownMenuItem>
                      )}
                      {j.status === "closed" && (
                        <DropdownMenuItem onClick={() => handleReopen(j)}>
                          <PlayCircle className="w-4 h-4 mr-2" /> Reopen job
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setRepostTarget(j)}>
                        <Copy className="w-4 h-4 mr-2" /> Repost as new
                      </DropdownMenuItem>
                      {(j.status === "active" || j.status === "paused") && (
                        <DropdownMenuItem onClick={() => handleMarkAsFilled(j)}>
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as filled
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setDeleteId(j.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete job
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Repost confirmation dialog */}
        <AlertDialog open={!!repostTarget} onOpenChange={(open) => !open && setRepostTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Repost as new?</AlertDialogTitle>
              <AlertDialogDescription>
                {repostTarget?.status === "active" ? (
                  <>
                    A new active listing will be created in the feed with a fresh posting date and no
                    application deadline. Your current post will be marked as filled.
                  </>
                ) : (
                  <>
                    A new active listing will be created in the feed with a fresh posting date and no
                    application deadline. Your closed post stays in your history.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRepostTarget(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRepost}>Repost</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this job?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the job post and all its applications. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default MyJobs;
