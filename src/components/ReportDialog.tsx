import { useState } from "react";
import { Flag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_REASONS, reportUser, type ReportReason } from "@/lib/safety";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUserName: string;
}

const ReportDialog = ({ open, onOpenChange, targetUserId, targetUserName }: Props) => {
  const [reason, setReason] = useState<ReportReason | "">("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason("");
    setDescription("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    const { ok, error, emailWarning } = await reportUser({
      reportedUserId: targetUserId,
      reason,
      description,
    });
    setSubmitting(false);
    if (!ok) {
      toast.error(error || "Could not submit report");
      return;
    }
    toast.success("Report submitted", {
      description: emailWarning
        ? "Your report was saved. The support inbox could not be notified automatically."
        : "Our team will review this profile. Thank you for helping keep ReelCruiter safe.",
    });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-destructive" />
            Report {targetUserName}
          </DialogTitle>
          <DialogDescription>
            Tell us what happened. Reports are confidential and reviewed by our team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Reason</Label>
            <RadioGroup
              value={reason}
              onValueChange={(v) => setReason(v as ReportReason)}
              className="space-y-2"
            >
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                    reason === r.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value={r.value} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{r.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {r.hint}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-details" className="text-sm font-medium">
              Additional details <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="report-details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share any context that helps us review this report…"
              rows={3}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-[11px] text-muted-foreground text-right">
              {description.length}/1000
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason || submitting}
          >
            {submitting ? "Submitting…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
