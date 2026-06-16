import type { LucideIcon } from "lucide-react";
import { Briefcase, Building2, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import ExperienceDialog from "@/components/ExperienceDialog";
import { uploadTabPath, type UploadTab } from "@/lib/uploadTabLinks";

export type ProfileVideosEmptyKind =
  | "experience"
  | "open_to_work"
  | "hiring"
  | "workplace"
  | "community";

const CONFIG: Record<
  ProfileVideosEmptyKind,
  { icon: LucideIcon; title: string; description: string; actionLabel: string; tab?: UploadTab }
> = {
  experience: {
    icon: Briefcase,
    title: "No experience videos yet",
    description: "Show employers what you have done with a short video for each role.",
    actionLabel: "Add experience video",
  },
  open_to_work: {
    icon: Sparkles,
    title: "No Open to Work posts yet",
    description: "Tell employers you are open to new roles with a short video.",
    actionLabel: "Upload Open to Work video",
    tab: "open_to_work",
  },
  hiring: {
    icon: Briefcase,
    title: "No active job posts yet",
    description: "Post your first role so candidates can discover and apply.",
    actionLabel: "Post a job",
    tab: "hiring",
  },
  workplace: {
    icon: Building2,
    title: "No workplace videos yet",
    description: "Share your team and culture so candidates get a feel for your company.",
    actionLabel: "Upload workplace video",
    tab: "workplace",
  },
  community: {
    icon: Users,
    title: "No community posts yet",
    description: "Share updates and connect with others on your public profile.",
    actionLabel: "Upload community post",
    tab: "community",
  },
};

const ProfileVideosEmptyState = ({ kind }: { kind: ProfileVideosEmptyKind }) => {
  const cfg = CONFIG[kind];

  if (kind === "experience") {
    return (
      <EmptyState
        icon={cfg.icon}
        title={cfg.title}
        description={cfg.description}
        action={
          <ExperienceDialog
            trigger={
              <Button className="mt-6 rounded-full px-8">{cfg.actionLabel}</Button>
            }
          />
        }
      />
    );
  }

  return (
    <EmptyState
      icon={cfg.icon}
      title={cfg.title}
      description={cfg.description}
      actionLabel={cfg.actionLabel}
      actionTo={uploadTabPath(cfg.tab!)}
    />
  );
};

export default ProfileVideosEmptyState;
