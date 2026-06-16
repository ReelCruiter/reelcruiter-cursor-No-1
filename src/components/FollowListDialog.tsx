import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import UserAvatar from "@/components/UserAvatar";
import { fetchFollowers, fetchFollowing, type FollowUser } from "@/lib/follows";
import { Loader2 } from "lucide-react";
import LastActiveLabel from "@/components/LastActiveLabel";
import { useAuth } from "@/lib/authCache";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  mode: "followers" | "following";
}

const FollowListDialog = ({ open, onOpenChange, userId, mode }: Props) => {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { userId: currentUserId } = useAuth();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const fn = mode === "followers" ? fetchFollowers : fetchFollowing;
    fn(userId)
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [open, userId, mode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="capitalize">{mode}</DialogTitle>
        </DialogHeader>
        <div className="max-h-96 overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No {mode} yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {users.map((u) => (
                <li key={u.user_id}>
                  <Link
                    to={`/user/${u.user_id}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 py-3 hover:bg-muted/50 -mx-6 px-6 transition-colors"
                  >
                    <UserAvatar src={u.avatar_url} name={u.full_name} className="w-10 h-10" />
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-bold text-sm text-card-foreground truncate">
                        {u.full_name || "Unnamed user"}
                      </p>
                      {u.bio && (
                        <p className="text-xs text-muted-foreground truncate">{u.bio}</p>
                      )}
                      {u.user_id !== currentUserId && (
                        <LastActiveLabel at={u.last_active_at} className="mt-0.5" />
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FollowListDialog;
