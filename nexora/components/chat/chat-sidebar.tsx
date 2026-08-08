"use client";

import { Bot, Home, MessageSquarePlus, PanelLeftClose } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
};

export function ChatSidebar({ isOpen, onClose, onNewChat }: ChatSidebarProps) {
  return (
    <>
      {/* Overlay for mobile */}
      <button
        type="button"
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-label="Close sidebar overlay"
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-background/95 p-4 backdrop-blur-xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl border border-border bg-card">
              <Bot className="size-4 text-accent" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display font-semibold text-foreground">Nexora AI</p>
              <p className="text-xs text-muted">Policy assistant</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        </div>

        {/* ── New Chat ── */}
        <Button className="mt-6 w-full justify-start rounded-2xl" onClick={onNewChat}>
          <MessageSquarePlus className="size-4" aria-hidden="true" />
          New Chat
        </Button>

        {/* ── Spacer ── */}
        <div className="flex-1" />

        {/* ── Bottom actions ── */}
        <div className="space-y-1 border-t border-border pt-4">
          {/* Home link */}
          <Link
            href="/"
            className="focus-ring flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm text-muted transition hover:bg-card hover:text-foreground"
            onClick={onClose}
          >
            <Home className="size-4" aria-hidden="true" />
            Home
          </Link>
        </div>
      </aside>
    </>
  );
}
