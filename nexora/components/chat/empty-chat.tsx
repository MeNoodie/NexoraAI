import { Bot, Sparkles } from "lucide-react";

export function EmptyChat() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-14 text-center">
      <div className="relative grid size-20 place-items-center rounded-[2rem] border border-border bg-card">
        <Bot className="size-8 text-accent" aria-hidden="true" />
        <span className="absolute -right-2 -top-2 grid size-8 place-items-center rounded-full bg-primary">
          <Sparkles className="size-4 text-white" aria-hidden="true" />
        </span>
      </div>
      <h2 className="mt-7 font-display text-3xl font-semibold text-foreground">
        How can I help you today?
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        Ask about leave, reimbursement, office timings, WFH rules, conduct, or
        performance review policy.
      </p>
    </div>
  );
}
