"use client";

import {
  ArrowDown,
  ArrowRight,
  BrainCircuit,
  Database,
  FileText,
  Github,
  SearchCheck,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { SectionHeading } from "@/components/landing/section-heading";

type FlowStep = {
  title: string;
  tool: string;
  icon: typeof FileText;
  tone: "primary" | "accent" | "neutral";
};

const localFlow: FlowStep[] = [
  { title: "Training data", tool: "Domain examples", icon: FileText, tone: "neutral" },
  { title: "Fine-tune", tool: "Hugging Face + Unsloth", icon: Github, tone: "primary" },
  { title: "Test models", tool: "Domain · SFT · DPO", icon: BrainCircuit, tone: "primary" },
  { title: "Evaluate", tool: "Groq LLM", icon: Sparkles, tone: "accent" },
];

const onlineFlow: FlowStep[] = [
  { title: "Documents", tool: "Domain knowledge", icon: FileText, tone: "neutral" },
  { title: "Prepare data", tool: "Parser + chunking + embeddings", icon: SearchCheck, tone: "accent" },
  { title: "Store & search", tool: "Vector database", icon: Database, tone: "accent" },
  { title: "Answer query", tool: "LLM + retrieved context", icon: BrainCircuit, tone: "primary" },
];

function FlowNode({ step, index }: { step: FlowStep; index: number }) {
  const Icon = step.icon;
  const tones = {
    primary: "border-primary/35 bg-primary/10 text-primary",
    accent: "border-accent/35 bg-accent/10 text-accent",
    neutral: "border-border bg-card text-muted",
  }[step.tone];

  return (
    <div className={`min-w-0 flex-1 rounded-2xl border p-4 text-center ${tones}`}>
      <span className="text-[11px] font-semibold tracking-[0.14em]">0{index + 1}</span>
      <Icon className="mx-auto mt-2 size-5" aria-hidden="true" />
      <p className="mt-2 text-sm font-semibold text-foreground">{step.title}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{step.tool}</p>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex h-7 shrink-0 items-center justify-center text-muted lg:h-auto lg:w-9" aria-hidden="true">
      <ArrowDown className="size-4 lg:hidden" />
      <ArrowRight className="hidden size-5 lg:block" />
    </div>
  );
}

function WorkflowPath({ title, description, flow, online = false }: { title: string; description: string; flow: FlowStep[]; online?: boolean }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl border border-border bg-background/70 p-5 sm:p-7"
    >
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${online ? "bg-accent/15" : "bg-primary/15"}`}>
          {online ? <Database className="size-5 text-accent" /> : <BrainCircuit className="size-5 text-primary" />}
        </span>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${online ? "text-accent" : "text-primary"}`}>{online ? "Production" : "Experiment"}</p>
          <h3 className="mt-1 font-display text-xl font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-col lg:flex-row lg:items-stretch">
        {flow.map((step, index) => (
          <div key={step.title} className="contents">
            <FlowNode step={step} index={index} />
            {index < flow.length - 1 ? <FlowArrow /> : null}
          </div>
        ))}
      </div>
    </motion.article>
  );
}

export function Workflow() {
  return (
    <section id="workflow" className="border-y border-border bg-card/35 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Workflow"
          title="Build locally. Answer online."
          description="Two simple paths explain how Nexora is trained, tested, and deployed."
        />
        <div className="mt-12 space-y-5">
          <WorkflowPath title="Local model testing" description="Compare fine-tuned models on your machine before choosing the best approach." flow={localFlow} />
          <WorkflowPath title="Online RAG inference" description="Retrieve relevant company knowledge so deployed answers stay grounded." flow={onlineFlow} online />
        </div>
      </div>
    </section>
  );
}
