"use client";

import { Cloud, Laptop, Menu, UserRound } from "lucide-react";
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

export function ChatHeader({ onMenuClick, inferenceMode, onInferenceModeChange, localModel, onLocalModelChange }: ChatHeaderProps) {
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
            <p className="text-xs text-muted">{inferenceMode === "local" ? "Fine-tuned model comparison" : "Retrieval-backed HR assistant"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-border bg-card p-1">
            {([
              { mode: "local" as const, label: "Local", icon: Laptop },
              { mode: "online" as const, label: "Online", icon: Cloud },
            ]).map(({ mode, label, icon: Icon }) => (
              <button key={mode} type="button" onClick={() => onInferenceModeChange(mode)} className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition", inferenceMode === mode ? "bg-primary text-white" : "text-muted hover:text-foreground")}>
                <Icon className="size-3.5" />{label}
              </button>
            ))}
          </div>
          {inferenceMode === "local" ? (
            <select aria-label="Local model" value={localModel} onChange={(event) => onLocalModelChange(event.target.value as LocalModel)} className="hidden rounded-xl border border-border bg-card px-2 py-1.5 text-xs text-foreground outline-none sm:block">
              <option value="domain">Domain model</option>
              <option value="sft">SFT model</option>
              <option value="dpo">DPO model</option>
            </select>
          ) : null}
          <StatusBadge
            label={inferenceMode === "local" ? "Local model" : "RAG online"}
            detail={inferenceMode === "local" ? "Direct" : "Ready"}
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
