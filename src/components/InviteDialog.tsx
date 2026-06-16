import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/authCache";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, MessageCircle, Send, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InviteDialog = ({ open, onOpenChange }: InviteDialogProps) => {
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? "";
      // Short stable invite code derived from user id (simple, no extra table)
      const code = uid ? uid.replace(/-/g, "").slice(0, 8) : "";
      const base = window.location.origin;
      setLink(code ? `${base}/signup?ref=${code}` : `${base}/signup`);
    })();
  }, [open]);

  const message = `Join me on ReelCruiter, the video first hiring app. Sign up here: ${link}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Invite link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const smsUrl = `sms:?&body=${encodeURIComponent(message)}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on ReelCruiter",
          text: "Join me on ReelCruiter, the video first hiring app.",
          url: link,
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite friends to ReelCruiter</DialogTitle>
          <DialogDescription>
            Share your unique invite link. Friends who sign up land straight on the app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={link} readOnly className="flex-1" />
            <Button onClick={handleCopy} variant="secondary" size="icon" aria-label="Copy link">
              {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">WhatsApp</span>
            </a>
            <a
              href={smsUrl}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">Messages</span>
            </a>
            <button
              onClick={handleNativeShare}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
              type="button"
            >
              <div className="w-10 h-10 rounded-full bg-foreground/10 text-foreground flex items-center justify-center">
                <Copy className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium">More</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteDialog;
