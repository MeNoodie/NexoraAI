import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  label: string;
  detail?: string;
  className?: string;
};

export function StatusBadge({ label, detail, className }: StatusBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-muted",
        className,
      )}
      aria-label={detail ? `${label}: ${detail}` : label}
    >
      <span className="relative flex size-2" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-40" />
        <span className="relative inline-flex size-2 rounded-full bg-accent" />
      </span>
      <span className="text-foreground">{label}</span>
      {detail ? <span>{detail}</span> : null}
    </div>
  );
}
