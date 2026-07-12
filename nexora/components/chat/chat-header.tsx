"use client";

import { Menu, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

type ChatHeaderProps = {
  onMenuClick: () => void;
};

export function ChatHeader({ onMenuClick }: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/82 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
            aria-label="Open sidebar"
          >
            <Menu className="size-4" />
          </Button>
          <div>
            <h1 className="font-display text-base font-semibold text-foreground">
              Nexora AI
            </h1>
            <p className="text-xs text-muted">Qwen2.5 3B HR assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge
            label="Model online"
            detail="42ms"
            className="hidden sm:inline-flex"
          />
          <div className="grid size-9 place-items-center rounded-full border border-border bg-card">
            <UserRound className="size-4 text-muted" aria-hidden="true" />
          </div>
        </div>
      </div>
    </header>
  );
}
