"use client";

import { Paperclip, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type MessageInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onClear: () => void;
  canSend: boolean;
};

export function MessageInput({
  value,
  onChange,
  onSend,
  onClear,
  canSend,
}: MessageInputProps) {
  return (
    <div className="rounded-[1.75rem] border border-border bg-card/86 p-2 shadow-[0_20px_70px_rgba(0,0,0,0.32)]">
      <label htmlFor="policy-message" className="sr-only">
        Ask anything about company policies
      </label>
      <textarea
        id="policy-message"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
        rows={1}
        placeholder="Ask anything about company policies..."
        className="focus-ring max-h-36 min-h-14 w-full resize-none rounded-[1.25rem] bg-transparent px-4 py-4 text-sm leading-6 text-foreground placeholder:text-muted"
      />
      <div className="flex items-center justify-between gap-3 px-2 pb-1">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled
            aria-label="Attach file coming soon"
            title="Attach file coming soon"
          >
            <Paperclip className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClear}
            aria-label="Clear chat"
          >
            <Trash2 className="size-4" />
          </Button>
          <span className="hidden text-xs text-muted sm:inline">
            Enter to send · Shift+Enter for line break
          </span>
        </div>
        <Button type="button" size="icon" onClick={onSend} disabled={!canSend} aria-label="Send message">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
