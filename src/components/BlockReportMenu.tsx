import { useEffect, useState } from "react";
import { MoreHorizontal, ShieldOff, ShieldCheck, Flag, Link2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { blockUser, isUserBlocked, unblockUser, BLOCK_CHANGED_EVENT } from "@/lib/safety";
import { toast } from "sonner";

interface Props {
  targetUserId: string;
  targetUserName: string;
}

const BlockReportMenu = ({ targetUserId, targetUserName }: Props) => {
  const [blocked, setBlocked] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStatusLoading(true);
      const isBlocked = await isUserBlocked(targetUserId);
      if (!cancelled) {
        setBlocked(isBlocked);
        setStatusLoading(false);
      }
    };
    load();

    const onBlockChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ userId: string }>).detail;
      if (detail?.userId === targetUserId) load();
    };
    window.addEventListener(BLOCK_CHANGED_EVENT, onBlockChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(BLOCK_CHANGED_EVENT, onBlockChanged);
    };
  }, [targetUserId]);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/user/${targetUserId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Profile link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleUnblock = async () => {
    setBusy(true);
    const { ok, error } = await unblockUser(targetUserId);
    setBusy(false);
    if (!ok) {
      toast.error(error || "Could not unblock user");
      return;
    }
    setBlocked(false);
    toast.success(`${targetUserName} unblocked`);
  };

  const handleConfirmBlock = async () => {
    setBusy(true);
    const { ok, error } = await blockUser(targetUserId);
    setBusy(false);
    setBlockConfirmOpen(false);
    if (!ok) {
      toast.error(error || "Could not block user");
      return;
    }
    setBlocked(true);
    toast.success(`${targetUserName} blocked`, {
      description: "They can no longer message you or interact with your profile.",
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Profile options"
            className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Profile options
          </DropdownMenuLabel>
          <DropdownMenuItem onSelect={handleCopyLink}>
            <Link2 className="w-4 h-4 mr-2" />
            Copy profile link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Safety
          </DropdownMenuLabel>
          {statusLoading ? (
            <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
          ) : blocked ? (
            <DropdownMenuItem onSelect={handleUnblock} disabled={busy}>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Unblock user
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setBlockConfirmOpen(true);
              }}
            >
              <ShieldOff className="w-4 h-4 mr-2" />
              Block user
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setReportOpen(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Flag className="w-4 h-4 mr-2" />
            Report user
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={blockConfirmOpen} onOpenChange={setBlockConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {targetUserName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will not be able to message you or interact with your content. You can
              unblock them anytime from this menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBlock}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Blocking…" : "Block user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetUserId={targetUserId}
        targetUserName={targetUserName}
      />
    </>
  );
};

export default BlockReportMenu;
