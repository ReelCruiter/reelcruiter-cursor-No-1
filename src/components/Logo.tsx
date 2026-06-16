import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg" | "xl";
type LogoVariant = "full" | "icon";

interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  /** White icon + text for dark backgrounds (e.g. auth hero panel) */
  inverted?: boolean;
  className?: string;
  href?: string;
}

const iconSizes: Record<LogoSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 56,
};

const textSizes: Record<LogoSize, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
};

function LogoMark({
  size,
  inverted,
  className,
}: {
  size: number;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect
        width="48"
        height="48"
        rx="12"
        className={inverted ? "fill-primary-foreground" : "fill-primary"}
      />
      <path
        d="M14 34V14h9.5c4.2 0 7 2.8 7 6.8 0 3.2-1.8 5.4-4.6 6.2L31 34h-4.2l-4.8-6.4H18.2V34H14zm4.2-10.2h5c2 0 3.2-1.1 3.2-2.8 0-1.8-1.2-2.8-3.2-2.8h-5v5.6z"
        className={inverted ? "fill-primary" : "fill-primary-foreground"}
      />
      <path
        d="M27.5 18.5l6 3.5-6 3.5v-7z"
        className={inverted ? "fill-accent" : "fill-accent"}
      />
    </svg>
  );
}

function LogoContent({
  variant,
  size,
  inverted,
  className,
}: Omit<LogoProps, "href">) {
  const px = iconSizes[size ?? "md"];

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark size={px} inverted={inverted} />
      {variant === "full" && (
        <span
          className={cn(
            "font-heading font-bold tracking-tight leading-none whitespace-nowrap",
            textSizes[size ?? "md"],
            inverted ? "text-primary-foreground" : "text-foreground",
          )}
        >
          Reel
          <span className={inverted ? "text-accent" : "text-primary"}>Cruiter</span>
        </span>
      )}
    </span>
  );
}

export default function Logo({
  variant = "full",
  size = "md",
  inverted = false,
  className,
  href = "/",
}: LogoProps) {
  const content = (
    <LogoContent variant={variant} size={size} inverted={inverted} className={className} />
  );

  if (href) {
    return (
      <Link to={href} className="inline-flex w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}

export { LogoMark };
