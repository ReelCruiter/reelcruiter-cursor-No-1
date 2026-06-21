import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Trash2, Save, Camera, Video, Upload as UploadIcon, Loader2, Globe, Phone } from "lucide-react";
import {
  IconLinkedin,
  IconTwitter,
  IconInstagram,
  IconFacebook,
  IconTiktok,
  IconYoutube,
  IconWhatsapp,
} from "@/components/SocialIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfileStore } from "@/lib/profileStore";
import { countries, getCitiesForCountry } from "@/lib/locations";
import SearchableCombobox from "@/components/SearchableCombobox";
import { toast } from "sonner";
import { useUserMode } from "@/lib/userMode";
import { Building2 } from "lucide-react";
import VideoRecorderDialog from "@/components/VideoRecorderDialog";
import JobSeekerResumeSection from "@/components/JobSeekerResumeSection";
import { MAX_VIDEO_BYTES, MAX_VIDEO_MB } from "@/lib/videoCompress";
import { PROFILE_INTRO_VIDEO_GUIDANCE } from "@/lib/uploadVideoGuidance";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fileToDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

const EditProfileSheet = ({ open, onOpenChange }: Props) => {
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const saveProfileToDb = useProfileStore((s) => s.saveProfileToDb);
  const { mode } = useUserMode();
  const isHiring = mode === "hiring";
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [socialsOpen, setSocialsOpen] = useState(false);
  const [introRecorderOpen, setIntroRecorderOpen] = useState(false);
  const introRecordRef = useRef<HTMLInputElement>(null);
  const introGalleryRef = useRef<HTMLInputElement>(null);
  const availableCities = profile.country ? getCitiesForCountry(profile.country) : [];

  const isMobile =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(pointer: coarse)")?.matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || ""));

  const onAvatarChange = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image file");
    const url = await fileToDataUrl(f);
    updateProfile({ avatarUrl: url });
    toast.success("Profile photo updated");
  };

  const onCompanyLogoChange = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image file");
    const url = await fileToDataUrl(f);
    updateProfile({ companyLogoUrl: url });
    toast.success("Company logo updated");
  };

  const onIntroVideo = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("video/")) return toast.error("Please choose a video file");
    if (f.size > MAX_VIDEO_BYTES) return toast.error(`Video must be under ${MAX_VIDEO_MB}MB`);
    try {
      const url = await fileToDataUrl(f);
      updateProfile({ introVideoUrl: url });
      toast.success("Intro video added. Press Save to upload");
    } catch {
      toast.error("Could not process video. Try a shorter clip or different format.");
    }
  };

  const handleIntroRecord = () => {
    console.info("[EditProfileSheet] record intro click", { isMobile });
    try {
      if (isMobile) {
        const input = introRecordRef.current;
        if (!input) {
          toast.error("Camera input not ready. Try Upload instead.");
          return;
        }
        input.click();
      } else {
        setIntroRecorderOpen(true);
      }
    } catch (err) {
      console.error("[EditProfileSheet] record click failed", err);
      toast.error("Could not open the camera. Use Upload instead.");
    }
  };

  const handleIntroUpload = () => {
    console.info("[EditProfileSheet] upload intro click");
    try {
      const input = introGalleryRef.current;
      if (!input) {
        toast.error("File picker not ready. Please try again.");
        return;
      }
      input.click();
    } catch (err) {
      console.error("[EditProfileSheet] upload click failed", err);
      toast.error("Could not open the file picker.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Profile</SheetTitle>
          <SheetDescription>Update your profile details. Changes are saved instantly.</SheetDescription>
        </SheetHeader>

        <div className="space-y-8 py-6">
          {/* Avatar — personal photo is shown in Job Seeker mode only.
              In Hiring mode, the company logo (below) is the main avatar. */}
          {!isHiring && (
            <section className="space-y-3">
              <Label>Profile photo</Label>
              <div className="flex items-center gap-4">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="w-20 h-20 rounded-xl object-cover border-2 border-border" />
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-border bg-gradient-to-br from-primary/80 to-primary text-primary-foreground flex items-center justify-center font-heading font-bold text-xl">
                    {(profile.name?.trim()?.[0] || "?").toUpperCase()}
                  </div>
                )}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onAvatarChange(e.target.files?.[0] || null)} />
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/70 text-sm font-medium">
                    <Camera className="w-4 h-4" /> Change photo
                  </span>
                </label>
              </div>
            </section>
          )}

          {/* Company logo — Hiring mode only. Used as the main avatar across
              feed posts, job cards, messages, and the profile header. */}
          {isHiring && (
            <section className="space-y-3">
              <Label>Company logo</Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Shown as your profile image throughout the app while you're in Hiring mode.
              </p>
              <div className="flex items-center gap-4">
                {profile.companyLogoUrl ? (
                  <img src={profile.companyLogoUrl} alt="" className="w-20 h-20 rounded-xl object-cover border-2 border-border bg-muted" />
                ) : (
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground">
                    <Building2 className="w-7 h-7" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onCompanyLogoChange(e.target.files?.[0] || null)} />
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/70 text-sm font-medium">
                      <UploadIcon className="w-4 h-4" /> {profile.companyLogoUrl ? "Replace logo" : "Upload logo"}
                    </span>
                  </label>
                  {profile.companyLogoUrl && (
                    <button
                      type="button"
                      onClick={() => { updateProfile({ companyLogoUrl: "" }); toast.success("Company logo removed"); }}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Personal details — in Hiring mode these are clearly framed as
              the recruiter's own info to avoid confusion with the company
              details card below. */}
          {isHiring ? (
            <section className="space-y-3 rounded-xl border border-border p-4 bg-muted/20">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-hiring" />
                <Label className="text-sm font-semibold">About you (the recruiter)</Label>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                Candidates will see your name when you reach out. Tell them about your company in the section below.
              </p>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs text-muted-foreground">Your full name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Jane Doe"
                  value={profile.name}
                  onChange={(e) => updateProfile({ name: e.target.value })}
                />
              </div>
            </section>
          ) : (
            <>
              <section className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} />
              </section>
              <JobSeekerResumeSection variant="edit" />
              <section className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Filled automatically when you upload a PDF in Resume above. You can edit anytime.
                </p>
                <Textarea id="bio" rows={4} value={profile.bio} onChange={(e) => updateProfile({ bio: e.target.value })} />
              </section>
            </>
          )}

          {/* Company (Hiring mode only) */}
          {isHiring && (
            <section className="space-y-3 rounded-xl border border-border p-4 bg-muted/20">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-hiring" />
                <Label className="text-sm font-semibold">Company details</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_name" className="text-xs text-muted-foreground">Company name</Label>
                <Input
                  id="company_name"
                  placeholder="e.g. Acme Inc."
                  value={profile.companyName}
                  onChange={(e) => updateProfile({ companyName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_description" className="text-xs text-muted-foreground">About the company</Label>
                <Textarea
                  id="company_description"
                  rows={3}
                  placeholder="What you do, your mission, your culture…"
                  value={profile.companyDescription}
                  onChange={(e) => updateProfile({ companyDescription: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_website" className="text-xs text-muted-foreground">Company website</Label>
                <Input
                  id="company_website"
                  type="url"
                  placeholder="https://acme.com"
                  value={profile.companyWebsite}
                  onChange={(e) => updateProfile({ companyWebsite: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Industry</Label>
                  <Select
                    value={profile.companyIndustry || undefined}
                    onValueChange={(v) => updateProfile({ companyIndustry: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      {["Technology","Healthcare","Finance","Education","Retail","Manufacturing","Media","Other"].map((i) => (
                        <SelectItem key={i} value={i}>{i}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Company size</Label>
                  <Select
                    value={profile.companySize || undefined}
                    onValueChange={(v) => updateProfile({ companySize: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>
                      {[
                        { value: "1-10", label: "1 to 10" },
                        { value: "11-50", label: "11 to 50" },
                        { value: "51-200", label: "51 to 200" },
                        { value: "201-500", label: "201 to 500" },
                        { value: "500+", label: "500+" },
                      ].map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </section>
          )}

          {/* Location */}
          <section className="space-y-2">
            <Label>Location</Label>
            <div className="grid grid-cols-2 gap-3">
              <SearchableCombobox
                value={profile.country}
                onChange={(v) => updateProfile({ country: v, city: "" })}
                options={countries}
                placeholder="Country"
                searchPlaceholder="Search countries…"
                emptyText="No country found."
              />
              {availableCities.length > 0 ? (
                <SearchableCombobox
                  value={profile.city}
                  onChange={(v) => updateProfile({ city: v })}
                  options={availableCities}
                  placeholder={profile.country ? "City" : "Pick country first"}
                  searchPlaceholder="Search cities…"
                  emptyText="Not listed? Type below"
                  disabled={!profile.country}
                />
              ) : (
                <Input
                  placeholder={profile.country ? "Enter your city" : "Pick country first"}
                  value={profile.city}
                  onChange={(e) => updateProfile({ city: e.target.value })}
                  disabled={!profile.country}
                />
              )}
            </div>
            {profile.country && availableCities.length > 0 && (
              <Input
                placeholder="Can't find your city? Type it here"
                value={!availableCities.includes(profile.city) ? profile.city : ""}
                onChange={(e) => updateProfile({ city: e.target.value })}
              />
            )}
          </section>

          {/* Add your social media channels (Hiring mode only) */}
          {isHiring && (() => {
            const links = [
              { key: "linkedin", url: profile.companyLinkedin, Icon: IconLinkedin },
              { key: "instagram", url: profile.companyInstagram, Icon: IconInstagram },
              { key: "facebook", url: profile.companyFacebook, Icon: IconFacebook },
              { key: "tiktok", url: profile.companyTiktok, Icon: IconTiktok },
              { key: "youtube", url: profile.companyYoutube, Icon: IconYoutube },
              { key: "twitter", url: profile.companyTwitter, Icon: IconTwitter },
              { key: "whatsapp", url: profile.companyWhatsapp, Icon: IconWhatsapp },
            ].filter((l) => l.url && l.url.trim().length > 0);
            return (
              <section className="space-y-2">
                <Label>Add your Social Media channels <span className="text-xs font-normal text-muted-foreground">(Optional)</span></Label>
                <button
                  type="button"
                  onClick={() => setSocialsOpen(true)}
                  className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors p-4 text-left"
                >
                  <span className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                    <Plus className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-primary">
                      {links.length > 0 ? "Edit your social media channels" : "Add your social media channels"}
                    </span>
                    {links.length > 0 ? (
                      <span className="mt-1 flex items-center gap-2 text-muted-foreground flex-wrap">
                        {links.map(({ key, Icon }) => (
                          <Icon key={key} className="w-4 h-4" />
                        ))}
                      </span>
                    ) : (
                      <span className="block text-[11px] text-muted-foreground mt-0.5">
                        Let candidates explore your company across platforms
                      </span>
                    )}
                  </span>
                </button>
              </section>
            );
          })()}

          {/* Intro video (Job Seeker only) */}
          {!isHiring && (
          <section className="space-y-3">
            <Label>{PROFILE_INTRO_VIDEO_GUIDANCE.sectionTitle}</Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {PROFILE_INTRO_VIDEO_GUIDANCE.description}
            </p>
            {profile.introVideoUrl && (
              <video src={profile.introVideoUrl} controls className="w-full rounded-lg bg-muted aspect-video" />
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" onClick={handleIntroRecord} className="w-full">
                <Camera className="w-4 h-4 mr-2" />
                {profile.introVideoUrl ? "Record again" : "Record"}
              </Button>
              <Button type="button" variant="secondary" onClick={handleIntroUpload} className="w-full">
                <UploadIcon className="w-4 h-4 mr-2" />
                {profile.introVideoUrl ? "Replace" : "Upload"}
              </Button>
            </div>
            {profile.introVideoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { updateProfile({ introVideoUrl: "" }); toast.success("Intro video removed"); }}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Remove video
              </Button>
            )}
            <div className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2.5 space-y-2">
              <p className="text-xs font-semibold text-foreground">What to say</p>
              <ul className="space-y-1">
                {PROFILE_INTRO_VIDEO_GUIDANCE.tips.map((tip) => (
                  <li key={tip} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                    <span className="text-primary shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              {PROFILE_INTRO_VIDEO_GUIDANCE.fileHint(MAX_VIDEO_MB)}
            </p>

            {/* Hidden inputs that drive Record / Upload */}
            <input
              ref={introRecordRef}
              type="file"
              accept="video/*"
              capture="user"
              className="hidden"
              onChange={(e) => { onIntroVideo(e.target.files?.[0] || null); e.target.value = ""; }}
            />
            <input
              ref={introGalleryRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/*"
              className="hidden"
              onChange={(e) => { onIntroVideo(e.target.files?.[0] || null); e.target.value = ""; }}
            />
          </section>
          )}

        </div>

        <SheetFooter>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              const { error } = await saveProfileToDb();
              setSaving(false);
              if (error) {
                // Not signed in — preserve draft and redirect to sign-in
                if (/signed in/i.test(error)) {
                  try {
                    sessionStorage.setItem("hr_pending_profile", JSON.stringify(profile));
                  } catch {}
                  toast.message("Please sign in to save your profile", {
                    description: "We'll restore your edits after you sign in.",
                  });
                  onOpenChange(false);
                  navigate("/signin", { state: { from: "/profile" } });
                  return;
                }
                toast.error("Could not save profile", { description: error });
                return;
              }
              try { sessionStorage.removeItem("hr_pending_profile"); } catch {}
              toast.success("Profile saved");
              onOpenChange(false);
            }}
            className="w-full"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </SheetFooter>
      </SheetContent>

      <VideoRecorderDialog
        open={introRecorderOpen}
        onOpenChange={setIntroRecorderOpen}
        maxSeconds={60}
        onRecorded={(f) => onIntroVideo(f)}
      />

      {/* Social media channels sub-sheet */}
      <Dialog open={socialsOpen} onOpenChange={setSocialsOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-heading">Your social media channels</DialogTitle>
            <DialogDescription>
              Optional. Let candidates explore your company through your social media channels.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <IconLinkedin className="w-4 h-4 text-[#0A66C2]" /> LinkedIn
                <span className="text-xs font-normal text-muted-foreground">Optional</span>
              </Label>
              <Input
                type="url"
                placeholder="linkedin.com/company/yourcompany"
                value={profile.companyLinkedin}
                onChange={(e) => updateProfile({ companyLinkedin: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <IconInstagram className="w-4 h-4 text-[#E4405F]" /> Instagram
                <span className="text-xs font-normal text-muted-foreground">Optional</span>
              </Label>
              <Input
                type="url"
                placeholder="instagram.com/yourcompany"
                value={profile.companyInstagram}
                onChange={(e) => updateProfile({ companyInstagram: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <IconFacebook className="w-4 h-4 text-[#1877F2]" /> Facebook
                <span className="text-xs font-normal text-muted-foreground">Optional</span>
              </Label>
              <Input
                type="url"
                placeholder="facebook.com/yourcompany"
                value={profile.companyFacebook}
                onChange={(e) => updateProfile({ companyFacebook: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <IconTiktok className="w-4 h-4" /> TikTok
                <span className="text-xs font-normal text-muted-foreground">Optional</span>
              </Label>
              <Input
                type="url"
                placeholder="tiktok.com/@yourcompany"
                value={profile.companyTiktok}
                onChange={(e) => updateProfile({ companyTiktok: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <IconYoutube className="w-4 h-4 text-[#FF0000]" /> YouTube
                <span className="text-xs font-normal text-muted-foreground">Optional</span>
              </Label>
              <Input
                type="url"
                placeholder="youtube.com/@yourcompany"
                value={profile.companyYoutube}
                onChange={(e) => updateProfile({ companyYoutube: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <IconTwitter className="w-4 h-4" /> X (Twitter)
                <span className="text-xs font-normal text-muted-foreground">Optional</span>
              </Label>
              <Input
                type="url"
                placeholder="x.com/yourcompany"
                value={profile.companyTwitter}
                onChange={(e) => updateProfile({ companyTwitter: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <IconWhatsapp className="w-4 h-4 text-[#25D366]" /> WhatsApp Business
                <span className="text-xs font-normal text-muted-foreground">Optional</span>
              </Label>
              <Input
                type="tel"
                placeholder="+1 555 123 4567"
                value={profile.companyWhatsapp}
                onChange={(e) => updateProfile({ companyWhatsapp: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button className="w-full" onClick={() => setSocialsOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
};

export default EditProfileSheet;
