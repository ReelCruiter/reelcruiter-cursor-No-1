import { Link, useLocation } from "react-router-dom";
import { Rss, Bell, PlusSquare, MessageSquare } from "lucide-react";
import ProfileNavItem from "@/components/ProfileNavItem";
import { useUnreadMessageCount } from "@/lib/messaging";
import { useUnreadNotificationCount } from "@/lib/notificationsCount";
import { useUserMode } from "@/lib/userMode";

const navLinks = [
  { to: "/feed", label: "Feed", icon: Rss, key: "feed" },
  { to: "/messages", label: "Messages", icon: MessageSquare, key: "messages" },
  { to: "/upload", label: "Upload", icon: PlusSquare, highlight: true, key: "upload" },
  { to: "/notifications", label: "Alerts", icon: Bell, key: "notifications" },
];

const Navbar = () => {
  const location = useLocation();
  const { mode } = useUserMode();
  const { count: unreadMessages } = useUnreadMessageCount(mode);
  const { count: unreadNotifications } = useUnreadNotificationCount();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-[0_-2px_10px_hsl(var(--foreground)/0.06)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.to;
          const Icon = link.icon;
          const badge =
            link.key === "messages" && unreadMessages > 0
              ? unreadMessages
              : link.key === "notifications" && unreadNotifications > 0
              ? unreadNotifications
              : 0;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors ${
                link.highlight && !isActive
                  ? "text-primary"
                  : isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <div
                className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                  link.highlight
                    ? isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary"
                    : isActive
                    ? "bg-primary/10"
                    : ""
                }`}
              >
                <Icon className={`${link.highlight ? "w-6 h-6" : "w-5 h-5"}`} />
                {badge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center border-2 border-card">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{link.label}</span>
            </Link>
          );
        })}
        <ProfileNavItem variant="mobile-tab" />
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
};

export default Navbar;
