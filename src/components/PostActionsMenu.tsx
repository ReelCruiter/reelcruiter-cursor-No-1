import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MoreVertical, Edit3, Trash2, Share2, Link2, Users, PauseCircle, PlayCircle, Flag, EyeOff, ThumbsDown, ShieldOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import ReportDialog from "@/components/ReportDialog";
import { useProfileStore } from "@/lib/profileStore";
import { toggleJobStatus, manageJobApplicationsPath } from "@/lib/applications";
import { sharePost, copyPostLink } from "@/lib/sharePost";
import { blockUser } from "@/lib/safety";
import type { VideoPost } from "@/lib/models";
import { toast } from "sonner";

interface Props {
  post: VideoPost;
  isOwner: boolean;
  /** Optional callback when the user chooses "Hide" / "Not interested". */
  onHide?: (postId: string) => void;
  /** Visual variant for the trigger button. */
  variant?: "card" | "overlay";
  className?: string;
}

const PostActionsMenu = ({ post, isOwner, onHide, variant = "card", className = "" }: Props) => {
  const navigate = useNavigate();
  const removePost = useProfileStore((s) => s.removePost);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [paused, setPaused] = useState<boolean>(!!post.hiddenFromFeed);

  const isHiring = (post.postKind ?? (post.tag === "hiring" ? "hiring" : undefined)) === "hiring";

  const handleDelete = async () => {
    await removePost(post.id);
    toast.success("Post deleted");
  };

  const handleTogglePause = async () => {
    const next = paused ? "active" : "paused";
    setPaused(!paused);
    const res = await toggleJobStatus(post.id, next);
    if (!res.ok) {
      setPaused(paused);
      toast.error("Could not update job status");
    } else {
      toast.success(next === "paused" ? "Job paused" : "Job reopened");
    }
  };

  const handleHide = () => {
    onHide?.(post.id);
    toast.success("We'll show fewer posts like this");
  };

  const handleConfirmBlock = async () => {
    setBlockBusy(true);
    const { ok, error } = await blockUser(post.userId);
    setBlockBusy(false);
    setBlockConfirmOpen(false);
    if (!ok) {
      toast.error(error || "Could not block user");
      return;
    }
    toast.success(`${post.userName} blocked`, {
      description: "They can no longer message you or interact with your profile.",
    });
  };

  const triggerCls =
    variant === "overlay"
      ? "w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors text-foreground"
      : "p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            aria-label="Post options"
            className={`${triggerCls} ${className}`}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
          {isOwner ? (
            <>
              <DropdownMenuItem onSelect={() => navigate(`/upload?edit=${post.id}`)}>
                <Edit3 className="w-4 h-4 mr-2" /> Edit post
              </DropdownMenuItem>
              {isHiring && (
                <>
                  <DropdownMenuItem onSelect={() => navigate(manageJobApplicationsPath(post.id))}>
                    <Users className="w-4 h-4 mr-2" /> View applicants
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleTogglePause}>
                    {paused ? (
                      <><PlayCircle className="w-4 h-4 mr-2" /> Resume job</>
                    ) : (
                      <><PauseCircle className="w-4 h-4 mr-2" /> Pause job</>
                    )}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => sharePost(post)}>
                <Share2 className="w-4 h-4 mr-2" /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => copyPostLink(post.id)}>
                <Link2 className="w-4 h-4 mr-2" /> Copy link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(e) => { e.preventDefault(); setConfirmDelete(true); }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete post
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => sharePost(post)}>
                <Share2 className="w-4 h-4 mr-2" /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => copyPostLink(post.id)}>
                <Link2 className="w-4 h-4 mr-2" /> Copy link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleHide}>
                <EyeOff className="w-4 h-4 mr-2" /> Hide post
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleHide}>
                <ThumbsDown className="w-4 h-4 mr-2" /> Not interested
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); setReportOpen(true); }}
                className="text-destructive focus:text-destructive"
              >
                <Flag className="w-4 h-4 mr-2" /> Report user
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); setBlockConfirmOpen(true); }}
                className="text-destructive focus:text-destructive"
              >
                <ShieldOff className="w-4 h-4 mr-2" /> Block user
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the post from the feed and your profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {reportOpen && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetUserId={post.userId}
          targetUserName={post.userName}
        />
      )}

      <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {post.userName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will not be able to message you or interact with your content. You can
              unblock them from their profile menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={blockBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBlock}
              disabled={blockBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {blockBusy ? "Blocking…" : "Block user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PostActionsMenu;