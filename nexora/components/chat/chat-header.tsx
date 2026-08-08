"use client";

import { Cloud, Laptop, Menu, Moon, Sun, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { InferenceMode, LocalModel } from "@/lib/chat";

type ChatHeaderProps = {
  onMenuClick: () => void;
  inferenceMode: InferenceMode;
  onInferenceModeChange: (mode: InferenceMode) => void;
  localModel: LocalModel;
  onLocalModelChange: (model: LocalModel) => void;
};

export function ChatHeader({
  onMenuClick,
  inferenceMode,
  onInferenceModeChange,
}: ChatHeaderProps) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("nexora-theme");
    setIsDark(saved !== "light");
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("light", !next);
    localStorage.setItem("nexora-theme", next ? "dark" : "light");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/82 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        {/* ── Left: menu + title ── */}
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
            {/* Clicking "Nexora AI" navigates back to the landing page */}
            <Link
              href="/"
              className="font-display text-base font-semibold text-foreground hover:text-primary transition-colors"
            >
              Nexora AI
            </Link>
            <p className="text-xs text-muted">
              {inferenceMode === "local"
                ? "Local playground — SFT vs DPO comparison"
                : "Online product — RAG + DPO model"}
            </p>
          </div>
        </div>

        {/* ── Right: mode toggle + badges ── */}
        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex items-center rounded-xl border border-border bg-card p-1">
            {(
              [
                { mode: "local" as const, label: "Local", icon: Laptop },
                { mode: "online" as const, label: "Online", icon: Cloud },
              ] as const
            ).map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => onInferenceModeChange(mode)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                  inferenceMode === mode
                    ? "bg-primary text-white"
                    : "text-muted hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Model indicator */}
          {inferenceMode === "local" ? (
            <span className="hidden rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs text-foreground sm:inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-violet-400 inline-block" />
              SFT + DPO
            </span>
          ) : (
            <StatusBadge
              label="RAG + DPO"
              detail="Online"
              className="hidden sm:inline-flex"
            />
          )}

          {/* Dark / Light toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="hidden sm:grid"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          {/* User avatar */}
          <div className="grid size-9 place-items-center rounded-full border border-border bg-card">
            <UserRound className="size-4 text-muted" aria-hidden="true" />
          </div>
        </div>
      </div>
    </header>
  );
}
