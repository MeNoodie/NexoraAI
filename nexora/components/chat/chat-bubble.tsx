"use client";

import { Bot, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { MarkdownContent } from "@/components/chat/markdown-content";
import type { ChatMessage } from "@/lib/chat";
import { cn } from "@/lib/utils";

type ChatBubbleProps = {
  message: ChatMessage;
};

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={cn("flex gap-3", isUser && "justify-end")}
    >
      {!isUser ? (
        <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-accent/15">
          <Bot className="size-4 text-accent" aria-hidden="true" />
        </div>
      ) : null}
      <div
        className={cn(
          "max-w-[min(760px,86%)] rounded-3xl px-4 py-3 text-sm shadow-sm sm:px-5 sm:py-4",
          isUser
            ? "rounded-tr-md bg-primary text-white"
            : "rounded-tl-md border border-border bg-card text-muted",
        )}
      >
        <MarkdownContent content={message.content} />
      </div>
      {isUser ? (
        <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/15">
          <UserRound className="size-4 text-primary" aria-hidden="true" />
        </div>
      ) : null}
    </motion.article>
  );
}
