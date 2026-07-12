"use client";

import { motion } from "framer-motion";

export function TypingAnimation() {
  return (
    <div
      className="flex items-center gap-1 rounded-3xl rounded-tl-md border border-border bg-card px-4 py-3"
      aria-label="Nexora AI is typing"
    >
      {[0, 1, 2].map((item) => (
        <motion.span
          key={item}
          className="size-1.5 rounded-full bg-muted"
          animate={{ opacity: [0.35, 1, 0.35], y: [0, -3, 0] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: item * 0.12,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
