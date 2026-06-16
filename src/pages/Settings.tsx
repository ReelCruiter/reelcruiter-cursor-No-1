import { useState } from "react";
import { awaitCurrentUserId } from "@/lib/authCache";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ChevronRight,
  Lock,
  LogOut,
  Mail,
  Pencil,
  Trash2,
  LifeBuoy,
  Bookmark,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clearAuthStorage } from "@/lib/authCache";
import { SUPPORT_TEAM_EMAIL } from "@/lib/supportConfig";
import { submitSupportMessage } from "@/lib/support";
import { toast } from "sonner";
import InviteDialog from "@/components/InviteDialog";
import ModeSwitcher from "@/components/ModeSwitcher";

const Settings = () => {
  const navigate = useNavigate();

  // Change password
  const [pwOpen, setPwOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Support
  const [supportOpen, setSupportOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [supportLoading, setSupportLoading] = useState(false);

  // Invite
  const [inviteOpen, setInviteOpen] = useState(false);

  // Delete
  const [deleting, setDeleting] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore sign-out errors */
    }
    await clearAuthStorage();
    toast.success("Signed out");
    // Hard reload so all in-memory caches (posts, profiles, mode) reset.
    window.location.replace("/signin");
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    setPwOpen(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSupport = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in both fields");
      return;
    }
    setSupportLoading(true);
    const { getCurrentUser } = await import("@/lib/authCache");
    const u = getCurrentUser();
    if (!u) {
      toast.error("You must be signed in");
      setSupportLoading(false);
      return;
    }
    const { error } = await submitSupportMessage({
      subject: subject.trim(),
      message: message.trim(),
    });
    setSupportLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Your message has been sent to our support team");
    setSupportOpen(false);
    setSubject("");
    setMessage("");
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await supabase.auth.signOut();
      await clearAuthStorage();
      toast.success("Your account has been deleted");
      window.location.replace("/signin");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="container max-w-2xl py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-heading font-bold">Settings</h1>
        </div>

        {/* Account section */}
        <Section title="Account">
          <Row
            icon={<Pencil className="w-4 h-4" />}
            label="Edit Profile"
            description="Update your name, photo, bio and more"
            onClick={() => navigate("/profile?edit=1")}
          />
          <Row
            icon={<Lock className="w-4 h-4" />}
            label="Change Password"
            description="Update your account password"
            onClick={() => setPwOpen(true)}
          />
        </Section>

        {/* Activity */}
        <Section title="Activity">
          <Row
            icon={<Bookmark className="w-4 h-4" />}
            label="Saved Jobs"
            description="Jobs you bookmarked for later"
            onClick={() => navigate("/saved")}
          />
          <Row
            icon={<UserPlus className="w-4 h-4" />}
            label="Invite Friends"
            description="Share ReelCruiter with your network"
            onClick={() => setInviteOpen(true)}
          />
        </Section>

        {/* Support */}
        <Section title="Support">
          <Row
            icon={<LifeBuoy className="w-4 h-4" />}
            label="Contact Support"
            description={`Messages go to ${SUPPORT_TEAM_EMAIL}`}
            onClick={() => setSupportOpen(true)}
          />
        </Section>

        {/* Session */}
        <Section title="Session">
          <div className="p-4 pb-6">
            <p className="text-sm font-medium text-card-foreground mb-1">How you're using ReelCruiter</p>
            <p className="text-xs text-muted-foreground mb-4">
              Choose the experience that fits what you're here to do. You can switch anytime.
            </p>
            <ModeSwitcher />
          </div>
          <div className="h-2 bg-muted/30" aria-hidden="true" />
          <Row
            icon={<LogOut className="w-4 h-4" />}
            label="Logout"
            description="Sign out of this device"
            onClick={handleLogout}
          />
        </Section>

        {/* Danger zone */}
        <Section title="Danger Zone" tone="danger">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="w-full flex items-center justify-between gap-3 p-4 rounded-lg hover:bg-destructive/5 transition-colors text-left"
                type="button"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-destructive">Delete Account</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Permanently remove your account and data
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action is <strong>permanent and cannot be undone</strong>. Your
                  profile, posts, follows and all associated data will be removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Deleting..." : "Yes, delete forever"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Section>
      </div>

      {/* Change password dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter a new password for your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">New password</Label>
              <Input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Confirm password</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwOpen(false)} disabled={pwLoading}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={pwLoading}>
              {pwLoading ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Support dialog */}
      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Support</DialogTitle>
            <DialogDescription>
              Tell us how we can help. We read every message at{" "}
              <a
                href={`mailto:${SUPPORT_TEAM_EMAIL}`}
                className="text-primary hover:underline font-medium"
              >
                {SUPPORT_TEAM_EMAIL}
              </a>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue..."
                rows={5}
                maxLength={2000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSupportOpen(false)}
              disabled={supportLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSupport} disabled={supportLoading}>
              <Mail className="w-4 h-4 mr-1.5" />
              {supportLoading ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </Layout>
  );
};

const Section = ({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: "danger";
  children: React.ReactNode;
}) => (
  <div className="mb-5">
    <h2
      className={`text-xs uppercase tracking-wider font-semibold mb-2 px-1 ${
        tone === "danger" ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      {title}
    </h2>
    <div className="bg-card rounded-xl card-shadow overflow-hidden divide-y divide-border">
      {children}
    </div>
  </div>
);

const Row = ({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
    type="button"
  >
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-lg bg-muted text-foreground flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-card-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        )}
      </div>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
  </button>
);

export default Settings;
