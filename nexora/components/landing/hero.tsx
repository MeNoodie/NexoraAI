"use client";

import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

const previewMessages = [
  {
    role: "Employee",
    text: "Can I carry forward unused leave into next quarter?",
  },
  {
    role: "Nexora",
    text: "Yes. Up to 6 earned leaves can be carried forward, subject to manager approval and HR policy section 3.2.",
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <StatusBadge label="Qwen2.5 3B" detail="HR policy intelligence" />
          <h1 className="mt-7 font-display text-5xl font-semibold leading-[1.02] tracking-normal text-foreground sm:text-6xl lg:text-7xl">
            Nexora AI
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
            Enterprise AI assistant built for HR policy intelligence. Give
            employees instant, grounded answers without turning HR teams into a
            ticket queue.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/chat" size="lg">
              Get Started
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="#demo" variant="secondary" size="lg">
              View Demo
            </ButtonLink>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.12, ease: "easeOut" }}
          className="glass-panel relative rounded-[2rem] p-4"
        >
          <div className="rounded-[1.5rem] border border-border bg-background/70 p-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-primary/15">
                  <Sparkles className="size-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    HR Policy Console
                  </p>
                  <p className="text-xs text-muted">Live employee support</p>
                </div>
              </div>
              <ShieldCheck className="size-5 text-accent" aria-hidden="true" />
            </div>
            <div className="space-y-4 py-5">
              {previewMessages.map((message, index) => (
                <motion.div
                  key={message.role}
                  initial={{ opacity: 0, x: index === 0 ? 16 : -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.36 + index * 0.18, duration: 0.45 }}
                  className={
                    index === 0
                      ? "ml-auto max-w-[86%] rounded-3xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-6 text-white"
                      : "max-w-[90%] rounded-3xl rounded-tl-sm border border-border bg-card px-4 py-3 text-sm leading-6 text-muted"
                  }
                >
                  <span className="mb-1 block text-xs font-medium text-foreground">
                    {message.role}
                  </span>
                  {message.text}
                </motion.div>
              ))}
            </div>
            <div className="rounded-2xl border border-border bg-card/80 px-4 py-3 text-sm text-muted">
              Ask anything about company policies...
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
