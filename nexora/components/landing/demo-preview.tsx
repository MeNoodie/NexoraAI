"use client";

import { motion } from "framer-motion";
import {
  Bot,
  Cloud,
  FlaskConical,
  Home,
  Laptop,
  MessageSquarePlus,
  Moon,
  UserRound,
} from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";

const messages = [
  { by: "user", text: "What is the work-from-home policy?" },
  {
    by: "ai",
    label: "DPO model",
    text: "Employees may work remotely up to two days per week with manager approval. Attendance at mandatory collaboration sessions is required per policy section 4.1.",
  },
  { by: "user", text: "Can I carry forward unused leave?" },
  {
    by: "ai",
    label: "DPO model",
    text: "Yes. Up to 6 earned leave days may be carried forward into the next quarter, subject to manager approval. See policy section 3.2.",
  },
];

export function DemoPreview() {
  return (
    <section id="demo" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Demo"
          title="The interface employees already understand."
          description="Online mode uses RAG retrieval + the fine-tuned DPO model. Local mode compares SFT and DPO side by side. Groq evaluates both answers in a floating panel."
        />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="glass-panel mt-12 overflow-hidden rounded-[2rem]"
        >
          {/* ── Browser chrome ── */}
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <span className="size-3 rounded-full bg-muted/60" />
            <span className="size-3 rounded-full bg-primary/80" />
            <span className="size-3 rounded-full bg-accent" />
            <span className="ml-4 rounded-full border border-border px-3 py-1 text-xs text-muted">
              nexora.ai/chat
            </span>
          </div>

          <div className="grid min-h-[480px] gap-0 lg:grid-cols-[200px_1fr]">
            {/* ── Sidebar (matches updated real sidebar) ── */}
            <aside className="hidden border-r border-border bg-background/58 p-4 lg:flex lg:flex-col">
              {/* Logo */}
              <div className="flex items-center gap-2 mb-5">
                <span className="grid size-8 place-items-center rounded-xl border border-border bg-card">
                  <Bot className="size-3.5 text-accent" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground">Nexora AI</p>
                  <p className="text-[10px] text-muted">Policy assistant</p>
                </div>
              </div>

              {/* New Chat button */}
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-medium text-primary flex items-center gap-2">
                <MessageSquarePlus className="size-3" />
                New Chat
              </div>

              <div className="flex-1" />

              {/* Bottom actions — no history */}
              <div className="space-y-1 border-t border-border pt-3">
                <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs text-muted">
                  <Home className="size-3" /> Home
                </div>
              </div>
            </aside>

            {/* ── Chat area ── */}
            <div className="relative p-5 sm:p-8">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Nexora AI</p>
                  <p className="text-xs text-muted">Online product — RAG + DPO model</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Mode toggle preview */}
                  <div className="flex items-center rounded-lg border border-border bg-card p-0.5 text-xs">
                    <span className="flex items-center gap-1 rounded-md px-2 py-1 text-muted">
                      <Laptop className="size-3" /> Local
                    </span>
                    <span className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-white">
                      <Cloud className="size-3" /> Online
                    </span>
                  </div>
                  {/* Theme toggle */}
                  <span className="grid size-7 place-items-center rounded-lg border border-border bg-card text-muted">
                    <Moon className="size-3.5" />
                  </span>
                  {/* Avatar */}
                  <span className="grid size-7 place-items-center rounded-full border border-border bg-card">
                    <UserRound className="size-3 text-muted" />
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="mx-auto max-w-2xl space-y-4">
                {messages.map((message, index) => {
                  const isUser = message.by === "user";
                  return (
                    <motion.div
                      key={`${message.by}-${index}`}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.09, duration: 0.35 }}
                      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser ? (
                        <div className="grid size-8 shrink-0 place-items-center rounded-2xl bg-accent/15">
                          <Bot className="size-3.5 text-accent" />
                        </div>
                      ) : null}
                      <div className={isUser
                        ? "max-w-[84%] rounded-3xl rounded-tr-md bg-primary px-4 py-3 text-sm leading-6 text-white"
                        : "max-w-[84%] rounded-3xl rounded-tl-md border border-border bg-card px-4 py-3 text-sm leading-6"
                      }>
                        {"label" in message && message.label && (
                          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-accent">
                            {message.label}
                          </span>
                        )}
                        <span className="text-muted">{message.text}</span>
                      </div>
                      {isUser ? (
                        <div className="grid size-8 shrink-0 place-items-center rounded-2xl bg-primary/15">
                          <UserRound className="size-3.5 text-primary" />
                        </div>
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>

              {/* ── Floating evaluate button (bottom-right of demo) ── */}
              <div className="absolute bottom-6 right-6">
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-lg">
                  <FlaskConical className="size-3.5 text-accent" />
                  Evaluate
                  <span className="flex size-4 items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold">
                    2
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
