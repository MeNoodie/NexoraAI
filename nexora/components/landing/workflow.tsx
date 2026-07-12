"use client";

import { FileUp, MessageCircleQuestion, Workflow as WorkflowIcon } from "lucide-react";
import { motion } from "framer-motion";
import { SectionHeading } from "@/components/landing/section-heading";

const steps = [
  {
    icon: FileUp,
    title: "Upload policies",
    description: "HR teams bring handbooks, policy PDFs, and operational guidance into one knowledge flow.",
  },
  {
    icon: WorkflowIcon,
    title: "AI understands policies",
    description: "Fine-tuning and retrieval-ready structure help the assistant reason over company-specific rules.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Employees ask questions",
    description: "Employees receive concise, helpful answers with a policy-first tone and clear next steps.",
  },
];

export function Workflow() {
  return (
    <section id="workflow" className="border-y border-border bg-card/35 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Workflow"
          title="From static documents to instant policy intelligence."
          description="The product flow stays simple for employees while keeping room for deeper HR operations behind the scenes."
        />
        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.article
                key={step.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.45 }}
                className="relative rounded-3xl border border-border bg-background/72 p-6"
              >
                <div className="mb-7 flex items-center justify-between">
                  <div className="grid size-12 place-items-center rounded-2xl bg-primary/14">
                    <Icon className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <span className="font-display text-4xl font-semibold text-border">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">{step.description}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
