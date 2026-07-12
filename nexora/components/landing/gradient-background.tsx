"use client";

import { motion } from "framer-motion";

export function GradientBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden premium-gradient">
      <motion.div
        className="absolute left-[8%] top-8 h-72 w-72 rounded-full bg-primary/18 blur-3xl"
        animate={{ x: [0, 28, 0], y: [0, 16, 0], opacity: [0.55, 0.8, 0.55] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[10%] top-20 h-64 w-64 rounded-full bg-accent/14 blur-3xl"
        animate={{ x: [0, -22, 0], y: [0, 24, 0], opacity: [0.4, 0.72, 0.4] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </div>
  );
}
