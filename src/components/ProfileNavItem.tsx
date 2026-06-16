import { Link, useLocation } from "react-router-dom";
import UserAvatar from "@/components/UserAvatar";
import { useAccountDisplay } from "@/lib/useAccountDisplay";
import { cn } from "@/lib/utils";

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

type ProfileNavItemProps = {
  variant: "sidebar" | "mobile-tab";
  badge?: number;
};

const ProfileNavItem = ({ variant, badge = 0 }: ProfileNavItemProps) => {
  const location = useLocation();
  const { displayName, displayAvatar, modeLoading, modeLabel } = useAccountDisplay();
  const isActive = location.pathname === "/profile";

  if (variant === "mobile-tab") {
    return (
      <Link
        to="/profile"
        className={cn(
          "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
        aria-label={`Profile, ${displayName}`}
      >
        <div className="relative flex items-center justify-center w-10 h-10">
          <UserAvatar
            src={displayAvatar}
            name={displayName}
            className={cn(
              "rounded-full !w-7 !h-7 ring-2 ring-background",
              isActive && "ring-primary ring-offset-2 ring-offset-card"
            )}
          />
          {badge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center border-2 border-card">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium leading-none truncate max-w-[4.5rem]">
          {firstName(displayName)}
        </span>
      </Link>
    );
  }

  return (
    <Link
      to="/profile"
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors min-w-0",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-muted"
      )}
      aria-label={`Profile, ${displayName}`}
    >
      <UserAvatar
        src={displayAvatar}
        name={displayName}
        className="rounded-full shrink-0 !w-9 !h-9"
      />
      <div className="min-w-0 flex-1 text-left">
        <span className="block truncate font-semibold leading-tight">{displayName}</span>
        {!modeLoading && (
          <span
            className={cn(
              "block truncate text-xs mt-0.5 font-normal",
              isActive ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
          >
            {modeLabel}
          </span>
        )}
      </div>
    </Link>
  );
};

export default ProfileNavItem;
