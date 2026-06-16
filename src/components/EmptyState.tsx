import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  /** Custom action control (e.g. dialog trigger). Overrides actionLabel/actionTo/onAction. */
  action?: React.ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-dashed border-border bg-muted/30">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <h3 className="font-heading font-bold text-lg text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">{description}</p>
      {action}
      {!action && actionLabel && actionTo && (
        <Button asChild className="mt-6 rounded-full px-8">
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      )}
      {!action && actionLabel && onAction && !actionTo && (
        <Button className="mt-6 rounded-full px-8" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
