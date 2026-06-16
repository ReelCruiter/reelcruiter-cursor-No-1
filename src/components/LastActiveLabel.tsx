import { formatLastActive, isActiveNow } from "@/lib/presence";
import { cn } from "@/lib/utils";

interface LastActiveLabelProps {
  at: string | null | undefined;
  className?: string;
}

const LastActiveLabel = ({ at, className }: LastActiveLabelProps) => {
  const label = formatLastActive(at);
  if (!label) return null;

  return (
    <p className={cn("text-[11px] text-muted-foreground flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-block w-1.5 h-1.5 rounded-full shrink-0",
          isActiveNow(at) ? "bg-green-500" : "bg-muted-foreground/50"
        )}
      />
      {label}
    </p>
  );
};

export default LastActiveLabel;
