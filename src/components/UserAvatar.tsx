import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
  alt?: string;
}

const getInitials = (name?: string | null) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Stable color palette index from name
const palette = [
  "from-primary/80 to-primary",
  "from-hiring/80 to-hiring",
  "from-accent/80 to-accent",
  "from-secondary to-muted-foreground/40",
];

const colorFor = (name?: string | null) => {
  if (!name) return palette[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

/**
 * Default-aware avatar. Falls back to initials on a clean gradient
 * when src is missing or fails to load. Used app-wide so users never
 * see broken images.
 */
const UserAvatar = ({ src, name, className, alt }: UserAvatarProps) => {
  const initials = getInitials(name);
  const gradient = colorFor(name);
  return (
    <Avatar className={cn("h-10 w-10 rounded-full", className)}>
      {src ? (
        <AvatarImage
          src={src}
          alt={alt ?? name ?? "User avatar"}
          className="object-cover"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
      ) : null}
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br text-primary-foreground font-heading font-bold",
          gradient
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
