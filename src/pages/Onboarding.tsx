import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ResumeUploadBlock from "@/components/ResumeUploadBlock";
import { supabase } from "@/integrations/supabase/client";
import { awaitCurrentUserId } from "@/lib/authCache";
import { useProfileStore } from "@/lib/profileStore";
import { toast } from "sonner";
import { CheckCircle2, FileText, User, Video } from "lucide-react";

type AccountRole = "job_seeker" | "employer";

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<AccountRole | null>(null);
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [cvUploaded, setCvUploaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const profile = useProfileStore((s) => s.profile);
  const loadProfileFromDb = useProfileStore((s) => s.loadProfileFromDb);
  const loadMyExperiencesFromDb = useProfileStore((s) => s.loadMyExperiencesFromDb);

  const isJobSeeker = role !== "employer";
  const totalSteps = isJobSeeker ? 4 : 3;
  const aboutStep = isJobSeeker ? 3 : 2;
  const videoStep = isJobSeeker ? 4 : 3;

  useEffect(() => {
    (async () => {
      const userId = await awaitCurrentUserId();
      if (!userId) return;

      await Promise.all([loadProfileFromDb(), loadMyExperiencesFromDb()]);

      const { data: authData } = await supabase.auth.getUser();
      const metaRole = authData.user?.user_metadata?.role as AccountRole | undefined;

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      const resolved =
        profileRow?.role === "employer" || profileRow?.role === "hiring"
          ? "employer"
          : metaRole === "employer"
            ? "employer"
            : "job_seeker";

      setRole(resolved);
    })();
  }, [loadProfileFromDb, loadMyExperiencesFromDb]);

  useEffect(() => {
    if (step !== aboutStep) return;
    if (!bio.trim() && profile.bio.trim()) setBio(profile.bio);
    if (!location.trim()) {
      const fromProfile = [profile.city, profile.country].filter(Boolean).join(", ");
      if (fromProfile) setLocation(fromProfile);
    }
  }, [step, aboutStep, profile.bio, profile.city, profile.country, bio, location]);

  const finish = async (skipVideo = false) => {
    setLoading(true);
    try {
      const userId = await awaitCurrentUserId();
      if (userId && (bio.trim() || location.trim())) {
        const { error } = await supabase
          .from("profiles")
          .update({ bio: bio.trim() || null, location: location.trim() || null })
          .eq("user_id", userId);
        if (error) throw error;
      }
      // Hard navigation — same pattern as sign-in. Client-side navigate after
      // onboarding can leave a blank screen until refresh (lazy route + state).
      window.location.replace(skipVideo ? "/feed" : "/upload");
    } catch {
      toast.error("Could not save your profile. Please try again.");
      setLoading(false);
    }
  };

  if (!role) {
    return (
      <Layout>
        <div className="container max-w-lg py-16 text-center text-muted-foreground">Loading…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-lg py-10 lg:py-16">
        <div className="mb-8">
          <p className="text-sm font-medium text-muted-foreground">
            Step {step} of {totalSteps}
          </p>
          <h1 className="text-3xl font-heading font-bold mt-1">Welcome to ReelCruiter</h1>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <p className="text-muted-foreground leading-relaxed">
              You're joining a video first hiring platform. A strong profile helps employers and
              candidates find the right match faster.
            </p>
            <ul className="space-y-3">
              {(isJobSeeker
                ? [
                    "Upload your CV to fill in your profile",
                    "Complete a short profile",
                    "Record or upload your first video",
                    "Explore jobs on your feed",
                  ]
                : [
                    "Complete a short profile",
                    "Record or upload your first video",
                    "Explore talent on your feed",
                  ]
              ).map((t) => (
                <li key={t} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <Button className="w-full h-12 rounded-full" onClick={() => setStep(2)}>
              Get started
            </Button>
          </div>
        )}

        {isJobSeeker && step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 text-primary mb-1">
              <FileText className="w-5 h-5" />
              <span className="font-semibold">Upload your CV</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Add your PDF CV and we will fill in your name, location, and about section
              automatically.
            </p>

            <ResumeUploadBlock
              compact
              showToasts
              onUploaded={(outcome) => {
                if (!outcome.error) {
                  setCvUploaded(true);
                  if (outcome.filled.location || outcome.filled.bio || outcome.filled.experiences) {
                    toast.success("CV uploaded. Your profile details were filled in.");
                  } else {
                    toast.success("CV uploaded.");
                  }
                }
              }}
            />

            {cvUploaded && (
              <p className="text-sm text-primary flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                CV saved to your profile
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button className="flex-1 rounded-full" onClick={() => setStep(aboutStep)}>
                {cvUploaded ? "Continue" : "Skip for now"}
              </Button>
            </div>
          </div>
        )}

        {step === aboutStep && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary mb-2">
              <User className="w-5 h-5" />
              <span className="font-semibold">About you</span>
            </div>
            {cvUploaded && (
              <p className="text-xs text-muted-foreground">
                Pre-filled from your CV. You can edit anything below.
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="bio">Professional bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Brief summary of your experience and what you're looking for…"
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                className="h-12"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setStep(step - 1)}>
                Back
              </Button>
              <Button className="flex-1 rounded-full" onClick={() => setStep(videoStep)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === videoStep && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Video className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-xl">Record your first video</h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Open to work, hiring, or workplace videos get the most visibility. You can skip and
                do this later.
              </p>
            </div>
            <Button
              className="w-full h-12 rounded-full"
              disabled={loading}
              onClick={() => finish(false)}
            >
              {loading ? "Saving…" : "Create my first video"}
            </Button>
            <Button variant="ghost" className="w-full" disabled={loading} onClick={() => finish(true)}>
              Skip for now
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
