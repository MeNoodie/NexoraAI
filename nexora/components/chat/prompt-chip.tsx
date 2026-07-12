import { cn } from "@/lib/utils";

type PromptChipProps = {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
};

export function PromptChip({ children, onClick, className }: PromptChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "focus-ring rounded-full border border-border bg-card/65 px-3 py-2 text-left text-xs font-medium text-muted transition hover:border-primary/50 hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
