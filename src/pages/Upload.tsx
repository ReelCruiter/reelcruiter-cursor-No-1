import Layout from "@/components/Layout";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MapPin,
  Camera,
  ImagePlus,
  Loader2,
  CheckCircle2,
  Hash,
  Send,
  Briefcase,
  Users,
  Sparkles,
  DollarSign,
  Building2,
  RotateCcw,
} from "lucide-react";
import { jobTypes, jobTypeLabels } from "@/lib/models";
import type { VideoPost } from "@/lib/models";
import { countries, getCitiesForCountry } from "@/lib/locations";
import { jobCategories } from "@/lib/categories";
import SearchableCombobox from "@/components/SearchableCombobox";
import OptionalDatePicker from "@/components/OptionalDatePicker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createPost, createFeedPost, createWorkplaceVideo, fetchPostById, updatePost, parseJobTypesFromDb } from "@/lib/posts";
import { communityPostVisibilityCopy } from "@/lib/communityPostCopy";
import { isUploadTabForMode } from "@/lib/uploadTabLinks";
import CommunityPostInfoBanner from "@/components/CommunityPostInfoBanner";
import { toast } from "sonner";
import { useUserMode } from "@/lib/userMode";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UploadStepIndicator from "@/components/UploadStepIndicator";
import VideoRecorderDialog from "@/components/VideoRecorderDialog";
import { usePostDraft } from "@/lib/postDrafts";
import { MAX_VIDEO_BYTES, MAX_VIDEO_MB } from "@/lib/videoCompress";

// ----------------------------- Shared video picker -----------------------------

interface VideoPickerProps {
  file: File | null;
  onChange: (file: File | null) => void;
  existingVideoUrl?: string | null;
}

const VideoPicker = ({ file, onChange, existingVideoUrl }: VideoPickerProps) => {
  const mobileCaptureRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [recorderOpen, setRecorderOpen] = useState(false);

  // Mobile/tablet → native camera capture; desktop → in-browser webcam recorder.
  const isMobile =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(pointer: coarse)")?.matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || ""));

  const pick = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_VIDEO_BYTES) {
      toast.error(`Video is too large. Max ${MAX_VIDEO_MB}MB.`);
      return;
    }
    // Use the selected file as-is — uploads are capped at 50MB.
    onChange(f);
  };

  const handleRecordClick = () => {
    try {
      if (isMobile) {
        const input = mobileCaptureRef.current;
        if (!input) {
          toast.error("Camera input is not ready. Please try again.");
          return;
        }
        input.click();
      } else {
        setRecorderOpen(true);
      }
    } catch (err) {
      console.error("[VideoPicker] record click failed", err);
      toast.error("Could not open the camera. Try Upload Video instead.");
    }
  };

  const handleUploadClick = () => {
    try {
      const input = galleryRef.current;
      if (!input) {
        toast.error("File picker is not ready. Please try again.");
        return;
      }
      input.click();
    } catch (err) {
      console.error("[VideoPicker] upload click failed", err);
      toast.error("Could not open the file picker.");
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="font-heading font-bold text-base text-foreground">Add a video</h2>
      {file ? (
        <div className="bg-card border border-border/60 rounded-2xl p-4 card-shadow flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-card-foreground truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / (1024 * 1024)).toFixed(1)} MB · saved to draft
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Replace
          </button>
        </div>
      ) : existingVideoUrl ? (
        <div className="bg-card border border-border/60 rounded-2xl p-4 card-shadow flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-card-foreground truncate">Existing video</p>
            <p className="text-xs text-muted-foreground">Will be kept unless you replace it</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Replace
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleRecordClick}
            className="flex items-start gap-3 p-4 bg-primary text-primary-foreground rounded-2xl text-left hover:opacity-95 transition-opacity"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">Record Video</p>
              <p className="text-xs opacity-90 mt-0.5">
                {isMobile ? "Open your camera (15 to 90s)" : "Use your webcam (15 to 90s)"}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={handleUploadClick}
            className="flex items-start gap-3 p-4 bg-card border-2 border-border/60 rounded-2xl text-left hover:border-foreground/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
              <ImagePlus className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm text-card-foreground">Upload Video</p>
              <p className="text-xs text-muted-foreground mt-0.5">MP4, MOV, WebM (max {MAX_VIDEO_MB}MB)</p>
            </div>
          </button>
        </div>
      )}
      <input
        ref={mobileCaptureRef}
        type="file"
        accept="video/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          if (!f) {
            console.info("[VideoPicker] camera capture cancelled");
          }
          pick(f);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          if (!f) {
            console.info("[VideoPicker] file selection cancelled");
          }
          pick(f);
          e.target.value = "";
        }}
      />
      <VideoRecorderDialog
        open={recorderOpen}
        onOpenChange={setRecorderOpen}
        onRecorded={(f) => pick(f)}
      />
    </section>
  );
};

// ----------------------------- Draft restored banner -----------------------------

const DraftRestoredBanner = ({ onClear }: { onClear: () => void }) => (
  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
    <span className="text-foreground">
      <span className="font-semibold">Draft restored.</span> We saved your last entries.
    </span>
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium"
    >
      <RotateCcw className="w-3 h-3" /> Start over
    </button>
  </div>
);

// ----------------------------- Open To Work form -----------------------------

interface OpenToWorkFields {
  caption: string;
  hashtags: string;
  desiredRole: string;
  country: string;
  city: string;
  jobTypes: VideoPost["jobType"][];
  immediate: boolean;
  salaryCurrency: string;
  salaryMin: string;
  salaryMax: string;
  salaryPeriod: "year" | "month" | "hour";
}
const OPEN_TO_WORK_INITIAL: OpenToWorkFields = {
  caption: "", hashtags: "", desiredRole: "", country: "", city: "",
  jobTypes: [], immediate: false,
  salaryCurrency: "$", salaryMin: "", salaryMax: "", salaryPeriod: "year",
};

const SALARY_CURRENCIES = ["$", "€", "£", "₹", "¥", "A$", "C$"];

const formatSalaryRange = (f: OpenToWorkFields): string => {
  const min = f.salaryMin.trim();
  const max = f.salaryMax.trim();
  if (!min && !max) return "";
  const cur = f.salaryCurrency;
  const periodSuffix =
    f.salaryPeriod === "year" ? "/yr" : f.salaryPeriod === "month" ? "/mo" : "/hr";
  const part = (v: string) => (v ? `${cur}${v}` : "");
  const range = min && max ? `${part(min)} to ${part(max)}` : part(min || max);
  return `${range}${periodSuffix}`;
};

const OpenToWorkForm = () => {
  const navigate = useNavigate();
  const { fields, setField, video, setVideo, clear, restoredFromDraft } =
    usePostDraft<OpenToWorkFields>("open_to_work", OPEN_TO_WORK_INITIAL);
  const [submitting, setSubmitting] = useState(false);

  const cities = fields.country ? getCitiesForCountry(fields.country) : [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video) return toast.error("Please add a video.");
    if (!fields.caption.trim()) return toast.error("Add a short caption.");

    setSubmitting(true);
    const preferredLocation = [fields.city, fields.country].filter(Boolean).join(", ");
    const { id, error } = await createFeedPost({
      caption: fields.caption.trim(),
      hashtags: fields.hashtags.trim(),
      city: fields.city || undefined,
      country: fields.country || undefined,
      videoFile: video,
      tag: "job-seeker",
      postKind: "open_to_work",
      desiredRole: fields.desiredRole.trim() || undefined,
      preferredLocation: preferredLocation || undefined,
      jobType: fields.jobTypes.length ? fields.jobTypes : undefined,
      immediateStart: fields.immediate,
      salaryExpectation: formatSalaryRange(fields) || undefined,
    });
    setSubmitting(false);
    if (error || !id) return toast.error(error || "Could not publish post.");
    clear();
    toast.success("Posted. You're now Open to Work");
    navigate("/feed");
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 flex items-center gap-2">
        <span className="text-[10px] tracking-wide font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
          OPEN TO WORK
        </span>
        <p className="text-xs text-muted-foreground">Tell employers what you're looking for.</p>
      </div>

      {restoredFromDraft && <DraftRestoredBanner onClear={clear} />}

      <VideoPicker file={video} onChange={setVideo} />

      <section className="space-y-2">
        <label className="block text-sm font-medium text-foreground">Caption</label>
        <Textarea
          rows={3}
          value={fields.caption}
          onChange={(e) => setField("caption", e.target.value)}
          placeholder="e.g. Open to senior product designer roles in remote teams"
        />
      </section>

      <section className="space-y-2">
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Hash className="w-4 h-4" /> Hashtags <span className="text-xs text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          value={fields.hashtags}
          onChange={(e) => setField("hashtags", e.target.value)}
          placeholder="opentowork productdesign remote"
        />
      </section>

      <section className="space-y-4 bg-muted/30 border border-border/60 rounded-xl p-4">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Optional details (recommended)
        </p>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Desired role</label>
          <Input
            value={fields.desiredRole}
            onChange={(e) => setField("desiredRole", e.target.value)}
            placeholder="e.g. Senior Product Designer"
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
            <MapPin className="w-3 h-3" /> Preferred location
          </label>
          <div className="grid grid-cols-2 gap-2">
            <SearchableCombobox
              value={fields.country}
              onChange={(v) => { setField("country", v); setField("city", ""); }}
              options={countries}
              placeholder="Country"
              searchPlaceholder="Search countries…"
              emptyText="No country found."
            />
            <SearchableCombobox
              value={fields.city}
              onChange={(v) => setField("city", v)}
              options={cities}
              placeholder={fields.country ? (cities.length ? "City" : "Type city") : "Pick country"}
              searchPlaceholder="Search cities…"
              emptyText="No city found."
              disabled={!fields.country || cities.length === 0}
            />
          </div>
          {fields.country && cities.length === 0 && (
            <Input
              className="mt-2"
              placeholder="Enter your city"
              value={fields.city}
              onChange={(e) => setField("city", e.target.value)}
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            Availability <span className="font-normal text-muted-foreground/70">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {jobTypes.map((t) => {
              const active = fields.jobTypes.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setField(
                      "jobTypes",
                      active
                        ? fields.jobTypes.filter((x) => x !== t)
                        : [...fields.jobTypes, t]
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-input hover:bg-muted"
                  }`}
                >
                  {jobTypeLabels[t]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
            <DollarSign className="w-3 h-3" /> Salary expectation <span className="font-normal text-muted-foreground/70">(range)</span>
          </label>
          <div className="grid grid-cols-[80px_1fr_1fr_90px] gap-2">
            <select
              value={fields.salaryCurrency}
              onChange={(e) => setField("salaryCurrency", e.target.value)}
              className="bg-background border border-input rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring h-10"
              aria-label="Currency"
            >
              {SALARY_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Input
              inputMode="numeric"
              value={fields.salaryMin}
              onChange={(e) => setField("salaryMin", e.target.value)}
              placeholder="Min e.g. 60k"
            />
            <Input
              inputMode="numeric"
              value={fields.salaryMax}
              onChange={(e) => setField("salaryMax", e.target.value)}
              placeholder="Max e.g. 90k"
            />
            <select
              value={fields.salaryPeriod}
              onChange={(e) => setField("salaryPeriod", e.target.value as OpenToWorkFields["salaryPeriod"])}
              className="bg-background border border-input rounded-lg px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring h-10"
              aria-label="Period"
            >
              <option value="year">/ year</option>
              <option value="month">/ month</option>
              <option value="hour">/ hour</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={fields.immediate}
            onChange={(e) => setField("immediate", e.target.checked)}
            className="w-4 h-4 rounded border-input text-primary focus:ring-ring"
          />
          Available to start immediately
        </label>
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {submitting ? "Posting..." : "Post Open to Work"}
      </button>
    </form>
  );
};

// ----------------------------- Community form -----------------------------

interface CommunityFields {
  caption: string;
  hashtags: string;
}
const COMMUNITY_INITIAL: CommunityFields = { caption: "", hashtags: "" };

const CommunityForm = ({ tag }: { tag: "job-seeker" | "hiring" }) => {
  const navigate = useNavigate();
  const profileVisibilityNote = communityPostVisibilityCopy(tag === "hiring" ? "hiring" : "job_seeker");
  // Scope draft to tag so seeker/employer drafts don't collide on the same device.
  const { fields, setField, video, setVideo, clear, restoredFromDraft } =
    usePostDraft<CommunityFields>(`community::${tag}`, COMMUNITY_INITIAL);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video) return toast.error("Please add a video.");
    if (!fields.caption.trim()) return toast.error("Add a short caption.");

    setSubmitting(true);
    const { id, error } = await createFeedPost({
      caption: fields.caption.trim(),
      hashtags: fields.hashtags.trim(),
      videoFile: video,
      tag,
      postKind: "community",
    });
    setSubmitting(false);
    if (error || !id) return toast.error(error || "Could not publish post.");
    clear();
    toast.success("Posted to your feed");
    navigate("/feed");
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <CommunityPostInfoBanner text={profileVisibilityNote} />

      {restoredFromDraft && <DraftRestoredBanner onClear={clear} />}

      <VideoPicker file={video} onChange={setVideo} />

      <section className="space-y-2">
        <label className="block text-sm font-medium text-foreground">Caption</label>
        <Textarea
          rows={4}
          value={fields.caption}
          onChange={(e) => setField("caption", e.target.value)}
          placeholder="What's on your mind?"
        />
      </section>

      <section className="space-y-2">
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Hash className="w-4 h-4" /> Hashtags <span className="text-xs text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          value={fields.hashtags}
          onChange={(e) => setField("hashtags", e.target.value)}
          placeholder="career advice motivation"
        />
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {submitting ? "Posting..." : "Post to Community"}
      </button>
    </form>
  );
};

// ----------------------------- Hiring form -----------------------------

interface HiringFields {
  jobTitle: string;
  description: string;
  category: string;
  otherCategory: string;
  country: string;
  city: string;
  jobTypes: VideoPost["jobType"][];
  salary: string;
  workArrangement: "" | "remote" | "hybrid" | "onsite";
  openings: string;
  deadline: string;
  fullAddress: string;
}
const HIRING_INITIAL: HiringFields = {
  jobTitle: "", description: "", category: "", otherCategory: "",
  country: "", city: "", jobTypes: [], salary: "",
  workArrangement: "", openings: "",
  deadline: "", fullAddress: "",
};

const HiringForm = ({ editId }: { editId?: string }) => {
  const navigate = useNavigate();
  const isEditing = !!editId;
  const draftId = isEditing ? `hiring::edit::${editId}` : "hiring";
  const { fields, setField, setFields, video, setVideo, clear, restoredFromDraft } =
    usePostDraft<HiringFields>(draftId, HIRING_INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // Load existing post data when editing
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      setLoadingEdit(true);
      const post = await fetchPostById(editId);
      if (cancelled) return;
      setLoadingEdit(false);
      if (!post) {
        toast.error("Job post not found.");
        return;
      }
      setFields({
        jobTitle: post.job_title || "",
        description: post.description || "",
        category: post.category || "",
        otherCategory: "",
        country: post.country || "",
        city: post.city || "",
        jobTypes: parseJobTypesFromDb(post.job_type),
        salary: post.salary || "",
        workArrangement: (post.work_arrangement as HiringFields["workArrangement"]) || "",
        openings: post.openings ? String(post.openings) : "",
        deadline: post.deadline || "",
        fullAddress: post.full_address || "",
      });
      setExistingVideoUrl(post.video_url || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, setFields]);

  const cities = fields.country ? getCitiesForCountry(fields.country) : [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing && !video) return toast.error("Please add a video.");
    if (!fields.jobTitle.trim()) return toast.error("Please add a job title.");
    if (!fields.country || !fields.city) return toast.error("Please add a location.");
    if (!fields.category) return toast.error("Please pick a category.");
    if (!fields.jobTypes.length) return toast.error("Please pick at least one job type.");

    const finalCategory = fields.category === "Other"
      ? fields.otherCategory.trim() || "Other"
      : fields.category;

    const baseInput = {
      jobTitle: fields.jobTitle.trim(),
      description: fields.description.trim(),
      category: finalCategory,
      jobType: fields.jobTypes,
      salary: fields.salary.trim() || undefined,
      city: fields.city,
      country: fields.country,
      isPublic: true,
      hiddenFromFeed: false,
      workArrangement: fields.workArrangement || undefined,
      openings: fields.openings ? Math.max(1, parseInt(fields.openings, 10)) : undefined,
      deadline: fields.deadline || undefined,
      fullAddress: fields.fullAddress.trim() || undefined,
      addressVisibility: "full" as const,
    };

    setSubmitting(true);
    if (isEditing && editId) {
      const { error } = await updatePost(editId, {
        ...baseInput,
        videoFile: video,
      });
      setSubmitting(false);
      if (error) return toast.error(error);
      toast.success("Changes saved");
      navigate("/my-jobs");
    } else {
      const { id, error } = await createPost({
        tag: "hiring",
        ...baseInput,
        videoFile: video!,
      });
      setSubmitting(false);
      if (error || !id) return toast.error(error || "Could not publish post.");
      clear();
      toast.success("Job published");
      navigate("/my-jobs");
    }
  };

  if (loadingEdit) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-xl bg-hiring/10 border border-hiring/30 px-4 py-3 flex items-center gap-2">
        <span className="text-[10px] tracking-wide font-bold bg-hiring text-hiring-foreground px-2 py-0.5 rounded-full">
          Post a job
        </span>
        <p className="text-xs text-muted-foreground">Post a vacancy and reach the right candidates.</p>
      </div>

      {restoredFromDraft && <DraftRestoredBanner onClear={clear} />}

      <VideoPicker file={video} onChange={setVideo} existingVideoUrl={existingVideoUrl} />

      <section className="space-y-4">
        <h2 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
          <Briefcase className="w-4 h-4" /> Job details
        </h2>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Job title</label>
          <Input
            value={fields.jobTitle}
            onChange={(e) => setField("jobTitle", e.target.value)}
            placeholder="e.g. Senior Frontend Developer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description <span className="text-xs text-muted-foreground font-normal">(optional)</span>
          </label>
          <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
            Your job video already explains the role. Add text here only if you want extra details.
          </p>
          <Textarea
            value={fields.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={3}
            placeholder="Extra details, perks, or requirements not covered in your video…"
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2">
            <MapPin className="w-4 h-4" /> Location
          </label>
          <div className="grid grid-cols-2 gap-2">
            <SearchableCombobox
              value={fields.country}
              onChange={(v) => { setField("country", v); setField("city", ""); }}
              options={countries}
              placeholder="Country"
              searchPlaceholder="Search countries…"
              emptyText="No country found."
            />
            <SearchableCombobox
              value={fields.city}
              onChange={(v) => setField("city", v)}
              options={cities}
              placeholder={fields.country ? (cities.length ? "City" : "Type city") : "Pick country"}
              searchPlaceholder="Search cities…"
              emptyText="No city found."
              disabled={!fields.country || cities.length === 0}
            />
          </div>
          {fields.country && cities.length === 0 && (
            <Input
              className="mt-2"
              placeholder="Enter your city"
              value={fields.city}
              onChange={(e) => setField("city", e.target.value)}
            />
          )}
          <div className="mt-3 space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">
              Full address <span className="text-muted-foreground/70">(optional)</span>
            </label>
            <Input
              placeholder="e.g. Keizersgracht 241, 1016 EA"
              value={fields.fullAddress}
              maxLength={200}
              onChange={(e) => setField("fullAddress", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Work arrangement</label>
          <select
            value={fields.workArrangement}
            onChange={(e) => setField("workArrangement", e.target.value as HiringFields["workArrangement"])}
            className="w-full bg-card border border-input rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring h-10"
          >
            <option value="">Select</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On site</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Job type <span className="text-xs text-muted-foreground font-normal">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {jobTypes.map((t) => {
              const active = fields.jobTypes.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setField(
                      "jobTypes",
                      active
                        ? fields.jobTypes.filter((x) => x !== t)
                        : [...fields.jobTypes, t]
                    )
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-input hover:bg-muted"
                  }`}
                >
                  {jobTypeLabels[t]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Category</label>
          <SearchableCombobox
            value={fields.category}
            onChange={(v) => { setField("category", v); if (v !== "Other") setField("otherCategory", ""); }}
            options={jobCategories}
            placeholder="Select"
            searchPlaceholder="Search…"
            emptyText="No category found."
          />
          {fields.category === "Other" && (
            <Input
              className="mt-2"
              placeholder="Specify category"
              value={fields.otherCategory}
              onChange={(e) => setField("otherCategory", e.target.value)}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2">
              <DollarSign className="w-4 h-4" /> Salary / pay
            </label>
            <Input
              value={fields.salary}
              onChange={(e) => setField("salary", e.target.value)}
              placeholder="e.g. $80k to $120k"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Openings</label>
            <Input
              type="number"
              min={1}
              value={fields.openings}
              onChange={(e) => setField("openings", e.target.value)}
              placeholder="1"
            />
          </div>
        </div>

        <OptionalDatePicker
          id="job-deadline"
          label="Application deadline (optional)"
          value={fields.deadline}
          onChange={(deadline) => setField("deadline", deadline)}
          minToday
        />
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
        {submitting ? (isEditing ? "Saving..." : "Publishing...") : (isEditing ? "Save changes" : "Publish job")}
      </button>
    </form>
  );
};

// ----------------------------- Workplace Video form -----------------------------

interface WorkplaceFields { caption: string; hashtags: string; }
const WORKPLACE_INITIAL: WorkplaceFields = { caption: "", hashtags: "" };

const WorkplaceVideoForm = () => {
  const navigate = useNavigate();
  const { fields, setField, video, setVideo, clear, restoredFromDraft } =
    usePostDraft<WorkplaceFields>("workplace", WORKPLACE_INITIAL);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video) return toast.error("Please add a video.");
    if (!fields.caption.trim()) return toast.error("Add a short caption.");

    setSubmitting(true);
    const { id, error } = await createWorkplaceVideo({
      caption: fields.caption.trim(),
      hashtags: fields.hashtags.trim(),
      videoFile: video,
    });
    setSubmitting(false);
    if (error || !id) return toast.error(error || "Could not publish video.");
    clear();
    toast.success("Workplace video posted");
    navigate("/profile");
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="rounded-xl bg-primary/10 border border-primary/30 px-4 py-3 flex items-center gap-2">
        <span className="text-[10px] tracking-wide font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
          WORKPLACE
        </span>
        <p className="text-xs text-muted-foreground">Show your culture, office, and team to attract the right talent.</p>
      </div>

      {restoredFromDraft && <DraftRestoredBanner onClear={clear} />}

      <VideoPicker file={video} onChange={setVideo} />

      <section className="space-y-2">
        <label className="block text-sm font-medium text-foreground">Caption</label>
        <Textarea
          rows={3}
          value={fields.caption}
          onChange={(e) => setField("caption", e.target.value)}
          placeholder="e.g. A look inside our design studio in Berlin"
        />
      </section>

      <section className="space-y-2">
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Hash className="w-4 h-4" /> Hashtags <span className="text-xs text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          value={fields.hashtags}
          onChange={(e) => setField("hashtags", e.target.value)}
          placeholder="culture team office"
        />
      </section>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
        {submitting ? "Posting..." : "Post Workplace Video"}
      </button>
    </form>
  );
};

// ----------------------------- Page -----------------------------

const UploadPage = () => {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit") || undefined;
  const tabParam = searchParams.get("tab") || undefined;
  const { mode, loading: modeLoading } = useUserMode();
  // While mode is loading, default to seeker tabs but don't gate the whole
  // page on a spinner — that previously caused the form tree to mount AFTER
  // the user might have already started typing, throwing away their input.
  const isHiring = mode === "hiring" || !!editId;
  const [tab, setTab] = useState<string>(isHiring ? "hiring" : "open_to_work");
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(2);

  const handleTabChange = (value: string) => {
    setTab(value);
    setWizardStep(2);
  };

  useEffect(() => {
    if (modeLoading) return;
    if (editId) {
      setTab("hiring");
      return;
    }
    if (tabParam && isUploadTabForMode(tabParam, isHiring)) {
      setTab(tabParam);
      return;
    }
    setTab(isHiring ? "hiring" : "open_to_work");
  }, [modeLoading, isHiring, editId, tabParam]);

  return (
    <Layout>
      <div className="container py-8 max-w-2xl">
        <h1 className="text-3xl font-heading font-bold text-foreground">
          {editId ? "Edit job" : "Create a post"}
        </h1>
        <p className="text-muted-foreground mt-1 mb-6">
          {editId
            ? "Update your job post details."
            : isHiring
            ? "Post a job, share workplace videos, or connect with the community."
            : "Tell employers you're open to work, or share with the community."}
        </p>

        <UploadStepIndicator currentStep={wizardStep} />

        <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid ${isHiring ? "grid-cols-3" : "grid-cols-2"} w-full mb-6 bg-muted p-1 gap-1`}>
            {isHiring ? (
              <>
                <TabsTrigger value="hiring" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:font-semibold">
                  <Briefcase className="w-3.5 h-3.5" /> Post a job
                </TabsTrigger>
                <TabsTrigger value="workplace" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:font-semibold">
                  <Building2 className="w-3.5 h-3.5" /> Workplace
                </TabsTrigger>
                <TabsTrigger value="community" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:font-semibold">
                  <Users className="w-3.5 h-3.5" /> Community Posts
                </TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="open_to_work" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:font-semibold">
                  <Sparkles className="w-3.5 h-3.5" /> Open to Work
                </TabsTrigger>
                <TabsTrigger value="community" className="flex items-center gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:font-semibold">
                  <Users className="w-3.5 h-3.5" /> Community Posts
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/*
            forceMount keeps each form's React tree alive when the user switches
            tabs, so typing in Hiring -> peeking at Workplace -> coming back
            preserves state in-memory (the localStorage draft would also restore
            it, but mounting once is faster and avoids any transient flicker).
          */}
          {isHiring ? (
            <>
              <TabsContent value="hiring" forceMount className="mt-0 data-[state=inactive]:hidden">
                <HiringForm editId={editId} />
              </TabsContent>
              <TabsContent value="workplace" forceMount className="mt-0 data-[state=inactive]:hidden">
                <WorkplaceVideoForm />
              </TabsContent>
              <TabsContent value="community" forceMount className="mt-0 data-[state=inactive]:hidden">
                <CommunityForm tag="hiring" />
              </TabsContent>
            </>
          ) : (
            <>
              <TabsContent value="open_to_work" forceMount className="mt-0 data-[state=inactive]:hidden">
                <OpenToWorkForm />
              </TabsContent>
              <TabsContent value="community" forceMount className="mt-0 data-[state=inactive]:hidden">
                <CommunityForm tag="job-seeker" />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </Layout>
  );
};

export default UploadPage;
