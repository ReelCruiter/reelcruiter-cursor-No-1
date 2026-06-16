import { useRef, useState } from "react";
import { awaitCurrentUserId } from "@/lib/authCache";
import { Plus, Trash2, Save, Video, Camera, ImagePlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { jobCategories } from "@/lib/categories";
import SearchableCombobox from "@/components/SearchableCombobox";
import type { Experience } from "@/lib/models";
import { useProfileStore } from "@/lib/profileStore";
import { toast } from "sonner";
import { uploadExperienceVideo } from "@/lib/experiences";
import { MAX_VIDEO_BYTES, MAX_VIDEO_MB } from "@/lib/videoCompress";
import MonthYearPicker from "@/components/MonthYearPicker";

interface Props {
  trigger: React.ReactNode;
  initial?: Experience;
}

const empty = (): Omit<Experience, "id"> => ({
  title: "",
  company: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  videoUrl: "",
  category: "Engineering",
});

const ExperienceDialog = ({ trigger, initial }: Props) => {
  const addExperience = useProfileStore((s) => s.addExperience);
  const updateExperience = useProfileStore((s) => s.updateExperience);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Experience, "id">>(
    initial ? { ...initial, endDate: initial.endDate ?? "" } : empty()
  );
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const recordRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const onVideo = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) return toast.error("Please choose a video file");
    if (f.size > MAX_VIDEO_BYTES) return toast.error(`Video must be under ${MAX_VIDEO_MB}MB`);
    setVideoFile(f);
    const preview = URL.createObjectURL(f);
    setLocalPreview(preview);
    // Mark videoUrl non-empty so the preview UI shows; real URL is set on save
    setForm((p) => ({ ...p, videoUrl: preview }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.company.trim() || !form.startDate.trim()) {
      return toast.error("Title, company and start date are required");
    }
    if (!form.isCurrent && !form.endDate.trim()) {
      return toast.error("Add an end date or mark as current");
    }
    if (
      !form.isCurrent &&
      form.startDate &&
      form.endDate &&
      form.endDate < form.startDate
    ) {
      return toast.error("End date must be after start date");
    }
    setSaving(true);
    try {
      let videoUrl = form.videoUrl;
      // If a new file was picked, upload it to storage
      if (videoFile) {
        const userId = await awaitCurrentUserId();
        const user = userId ? { id: userId } : null;
        if (!user) {
          setSaving(false);
          return toast.error("Please sign in to add experiences");
        }
        const upload = await uploadExperienceVideo(videoFile, user.id);
        if (upload.error || !upload.url) {
          setSaving(false);
          return toast.error(upload.error || "Video upload failed");
        }
        videoUrl = upload.url;
      } else if (videoUrl.startsWith("blob:") || videoUrl.startsWith("data:")) {
        // Avoid persisting non-URL values that won't be playable for others
        videoUrl = "";
      }

      const payload: Omit<Experience, "id"> = {
        ...form,
        endDate: form.isCurrent ? null : form.endDate,
        videoUrl,
      };

      if (initial) {
        const { error } = await updateExperience(initial.id, payload);
        if (error) return toast.error(error);
        toast.success("Experience updated");
      } else {
        const { error } = await addExperience(payload);
        if (error) return toast.error(error);
        toast.success("Experience added");
        setForm(empty());
        setVideoFile(null);
        if (localPreview) URL.revokeObjectURL(localPreview);
        setLocalPreview("");
      }
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit experience" : "Add experience"}</DialogTitle>
          <DialogDescription>Showcase a role with a short video.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Job title</Label>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Senior Frontend Developer" />
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <Input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} placeholder="e.g. TechCorp" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MonthYearPicker
              id="experience-start-date"
              label="Start date"
              value={form.startDate}
              onChange={(startDate) => setForm((p) => ({ ...p, startDate }))}
            />
            <MonthYearPicker
              id="experience-end-date"
              label="End date"
              value={form.endDate ?? ""}
              onChange={(endDate) => setForm((p) => ({ ...p, endDate }))}
              disabled={form.isCurrent}
              min={form.startDate || undefined}
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-border"
              checked={form.isCurrent}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  isCurrent: e.target.checked,
                  endDate: e.target.checked ? "" : p.endDate,
                }))
              }
            />
            I currently work here
          </label>
          <div className="space-y-2">
            <Label>Category</Label>
            <SearchableCombobox
              value={form.category}
              onChange={(v) => setForm((p) => ({ ...p, category: v }))}
              options={jobCategories}
              placeholder="Select category"
              searchPlaceholder="Search categories…"
              emptyText="No category found."
            />
          </div>
          <div className="space-y-2">
            <Label>Video</Label>
            {form.videoUrl ? (
              <div className="space-y-2">
                <video src={form.videoUrl} controls className="w-full rounded-lg aspect-video bg-muted" />
                <div className="flex gap-2">
                  <label className="cursor-pointer flex-1">
                    <input type="file" accept="video/*" className="hidden" onChange={(e) => onVideo(e.target.files?.[0] || null)} />
                    <span className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-muted hover:bg-muted/70 text-sm font-medium">
                      <Video className="w-4 h-4" /> Replace
                    </span>
                  </label>
                  <Button type="button" variant="outline" onClick={() => {
                    setForm((p) => ({ ...p, videoUrl: "" }));
                    setVideoFile(null);
                    if (localPreview) URL.revokeObjectURL(localPreview);
                    setLocalPreview("");
                  }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => recordRef.current?.click()}
                    className="flex items-start gap-3 p-4 bg-primary text-primary-foreground rounded-2xl text-left hover:opacity-95 transition-opacity"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Record Experience Video</p>
                      <p className="text-xs opacity-90 mt-0.5">Explain your role, responsibilities, and achievements</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.click()}
                    className="flex items-start gap-3 p-4 bg-card border-2 border-border/60 rounded-2xl text-left hover:border-foreground/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <ImagePlus className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-card-foreground">Upload from Gallery</p>
                      <p className="text-xs text-muted-foreground mt-0.5">MP4, MOV, WebM (max {MAX_VIDEO_MB}MB)</p>
                    </div>
                  </button>
                </div>
                <input
                  ref={recordRef}
                  type="file"
                  accept="video/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onVideo(e.target.files?.[0] || null)}
                />
                <input
                  ref={galleryRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/*"
                  className="hidden"
                  onChange={(e) => onVideo(e.target.files?.[0] || null)}
                />
                <div className="bg-muted/40 border border-border/60 rounded-xl p-4">
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-primary" /> What to include
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {[
                      "Your role and company",
                      "What you did day to day",
                      "Key achievements",
                      "Tools or skills used",
                    ].map((g) => (
                      <li key={g} className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    No need to be perfect. Just be clear and honest.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} className="w-full" disabled={saving}>
            <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : initial ? "Save changes" : "Add experience"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExperienceDialog;

export const AddExperienceButton = () => (
  <ExperienceDialog
    trigger={
      <Button size="sm" variant="outline">
        <Plus className="w-4 h-4 mr-1" /> Add experience
      </Button>
    }
  />
);
