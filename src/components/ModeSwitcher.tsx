import { Briefcase, Check, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MODE_INFO, useUserMode, type UserMode } from "@/lib/userMode";
import { toast } from "sonner";
import { useProfileStore } from "@/lib/profileStore";
import { cn } from "@/lib/utils";

const MODES: UserMode[] = ["job_seeker", "hiring"];

const ModeSwitcher = ({ className = "" }: { className?: string }) => {
  const navigate = useNavigate();
  const { mode, switchMode } = useUserMode();
  const loadPostsFromDb = useProfileStore((s) => s.loadPostsFromDb);
  const loadProfileFromDb = useProfileStore((s) => s.loadProfileFromDb);

  const handle = async (next: UserMode) => {
    if (next === mode) return;
    const { error } = await switchMode(next);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(`Now using ${MODE_INFO[next].label.toLowerCase()}`);
    await Promise.all([loadProfileFromDb(), loadPostsFromDb()]);
    navigate("/profile", { replace: true });
  };

  return (
    <div className={cn("space-y-2", className)}>
      {MODES.map((key) => {
        const info = MODE_INFO[key];
        const selected = mode === key;
        const Icon = info.icon === "briefcase" ? Briefcase : Search;

        return (
          <button
            key={key}
            type="button"
            onClick={() => handle(key)}
            className={cn(
              "w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all",
              selected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-muted-foreground/25 hover:bg-muted/40"
            )}
          >
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold">{info.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{info.description}</p>
            </div>
            {selected && (
              <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3" strokeWidth={3} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ModeSwitcher;
