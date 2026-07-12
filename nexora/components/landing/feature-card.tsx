"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
};

export function FeatureCard({
  icon: Icon,
  title,
  description,
  index,
}: FeatureCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: index * 0.04, duration: 0.45, ease: "easeOut" }}
      className="group rounded-3xl border border-border bg-card/70 p-6 transition duration-200 hover:border-primary/50 hover:bg-card"
    >
      <div className="mb-5 grid size-11 place-items-center rounded-2xl border border-border bg-background transition group-hover:border-primary/50">
        <Icon className="size-5 text-accent" aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
    </motion.article>
  );
}
