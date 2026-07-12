"use client";

import { motion } from "framer-motion";
import { Bot, UserRound } from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";

const messages = [
  { by: "user", text: "What are the work-from-home guidelines?" },
  {
    by: "ai",
    text: "Employees may work remotely up to two days per week with manager approval. Keep team availability visible and attend mandatory collaboration sessions.",
  },
  { by: "user", text: "Can HR make an exception?" },
  {
    by: "ai",
    text: "Yes. Exceptions can be reviewed for medical, relocation, or business-continuity cases through HR policy section 4.1.",
  },
];

export function DemoPreview() {
  return (
    <section id="demo" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Demo"
          title="A focused chat experience employees already understand."
          description="The interface borrows the calm, centered rhythm of modern AI tools while keeping HR controls close by."
        />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="glass-panel mt-12 overflow-hidden rounded-[2rem]"
        >
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <span className="size-3 rounded-full bg-muted/60" />
            <span className="size-3 rounded-full bg-primary/80" />
            <span className="size-3 rounded-full bg-accent" />
            <span className="ml-4 rounded-full border border-border px-3 py-1 text-xs text-muted">
              nexora.ai/chat
            </span>
          </div>
          <div className="grid min-h-[480px] gap-0 lg:grid-cols-[220px_1fr_240px]">
            <aside className="hidden border-r border-border bg-background/58 p-4 lg:block">
              <div className="rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground">
                New chat
              </div>
              <div className="mt-5 space-y-2 text-xs text-muted">
                {["Leave policy", "Reimbursement", "Office timings"].map((item) => (
                  <div key={item} className="rounded-xl px-3 py-2 hover:bg-card">
                    {item}
                  </div>
                ))}
              </div>
            </aside>
            <div className="p-5 sm:p-8">
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
                        <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-accent/15">
                          <Bot className="size-4 text-accent" />
                        </div>
                      ) : null}
                      <div
                        className={
                          isUser
                            ? "max-w-[84%] rounded-3xl rounded-tr-md bg-primary px-4 py-3 text-sm leading-6 text-white"
                            : "max-w-[84%] rounded-3xl rounded-tl-md border border-border bg-card px-4 py-3 text-sm leading-6 text-muted"
                        }
                      >
                        {message.text}
                      </div>
                      {isUser ? (
                        <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/15">
                          <UserRound className="size-4 text-primary" />
                        </div>
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>
            </div>
            <aside className="hidden border-l border-border bg-background/58 p-4 lg:block">
              <p className="text-sm font-medium text-foreground">Generation</p>
              {["Temperature", "Max tokens", "Top P"].map((item, index) => (
                <div key={item} className="mt-5">
                  <div className="mb-2 flex justify-between text-xs text-muted">
                    <span>{item}</span>
                    <span>{["0.7", "256", "0.9"][index]}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border">
                    <div className="h-full w-2/3 rounded-full bg-accent" />
                  </div>
                </div>
              ))}
            </aside>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
