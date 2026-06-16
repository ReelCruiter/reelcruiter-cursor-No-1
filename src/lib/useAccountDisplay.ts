import { useEffect } from "react";
import { getCurrentUser } from "@/lib/authCache";
import { useProfileStore } from "@/lib/profileStore";
import { useUserMode } from "@/lib/userMode";

export function useAccountDisplay() {
  const { mode, loading: modeLoading } = useUserMode();
  const profile = useProfileStore((s) => s.profile);
  const loadProfileFromDb = useProfileStore((s) => s.loadProfileFromDb);

  useEffect(() => {
    void loadProfileFromDb();
  }, [loadProfileFromDb]);

  const isHiring = mode === "hiring";
  const user = getCurrentUser();
  const fallback =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    user?.email?.split("@")[0] ||
    "Your profile";

  const displayName = isHiring
    ? profile.companyName?.trim() || profile.name?.trim() || fallback
    : profile.name?.trim() || fallback;

  const displayAvatar = isHiring
    ? profile.companyLogoUrl || profile.avatarUrl
    : profile.avatarUrl;

  const modeLabel = isHiring ? "Employer" : "Job seeker";

  return {
    displayName,
    displayAvatar,
    isHiring,
    modeLoading,
    modeLabel,
  };
}
