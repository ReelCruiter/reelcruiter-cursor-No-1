import { Link, useLocation } from "react-router-dom";
import { Rss, Bell, PlusSquare, MessageSquare, Settings } from "lucide-react";
import Logo from "@/components/Logo";
import ProfileNavItem from "@/components/ProfileNavItem";
import { useUnreadMessageCount } from "@/lib/messaging";
import { useUnreadNotificationCount } from "@/lib/notificationsCount";
import { useUserMode } from "@/lib/userMode";
import { ThemeToggle } from "@/components/ThemeToggle";

const navLinks = [
  { to: "/feed", label: "Feed", icon: Rss, key: "feed" },
  { to: "/messages", label: "Messages", icon: MessageSquare, key: "messages" },
  { to: "/notifications", label: "Notifications", icon: Bell, key: "notifications" },
  { to: "/upload", label: "Upload", icon: PlusSquare, key: "upload" },
];

const AppSidebar = () => {
  const location = useLocation();
  const { mode } = useUserMode();
  const { count: unreadMessages } = useUnreadMessageCount(mode);
  const { count: unreadNotifications } = useUnreadNotificationCount();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 border-r border-border bg-card h-screen sticky top-0 shrink-0">
      <div className="p-5 border-b border-border">
        <Logo size="md" href="/feed" className="px-1" />
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <ProfileNavItem variant="sidebar" />

        <div className="my-2 border-t border-border/60" aria-hidden />

        {navLinks.map((link) => {
          const isActive = location.pathname === link.to || location.pathname.startsWith(link.to + "/");
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="flex-1">{link.label}</span>
              {badge > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="flex items-center justify-between px-2 py-1">
          <Link
            to="/settings"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground rounded-lg px-2 py-2 hover:bg-muted transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
