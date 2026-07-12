"use client";

import {
  Brain,
  Building2,
  Clock3,
  LockKeyhole,
  MessageSquareText,
  Rocket,
} from "lucide-react";
import { FeatureCard } from "@/components/landing/feature-card";
import { SectionHeading } from "@/components/landing/section-heading";

const features = [
  {
    icon: Clock3,
    title: "Fast responses",
    description:
      "Answers routine HR policy questions immediately, while preserving enough context for follow-up questions.",
  },
  {
    icon: Brain,
    title: "Context aware",
    description:
      "Designed around employee intent, policy language, and conversation history for more useful answers.",
  },
  {
    icon: LockKeyhole,
    title: "Secure by default",
    description:
      "The interface is ready for private deployments, access control, and audit-friendly enterprise flows.",
  },
  {
    icon: Rocket,
    title: "Fine tuned",
    description:
      "Optimized around Nexora HR policies using a Qwen2.5 3B fine-tuning workflow.",
  },
  {
    icon: MessageSquareText,
    title: "Natural conversations",
    description:
      "A chat surface that feels familiar to modern AI users without sacrificing business clarity.",
  },
  {
    icon: Building2,
    title: "Enterprise ready",
    description:
      "Structured for future RAG, files, history, multiple models, and employee authentication.",
  },
];

export function Features() {
  return (
    <section id="features" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Capabilities"
          title="Built for HR teams that need answers, not another queue."
          description="Nexora AI pairs a polished employee experience with an architecture prepared for real enterprise workflows."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
