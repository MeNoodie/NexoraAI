"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ChatBubble } from "@/components/chat/chat-bubble";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { EmptyChat } from "@/components/chat/empty-chat";
import { MessageInput } from "@/components/chat/message-input";
import { PromptChip } from "@/components/chat/prompt-chip";
import { EvaluationPanel } from "@/components/chat/evaluation-panel";
import { TypingAnimation } from "@/components/chat/typing-animation";
import { useChat } from "@/hooks/use-chat";
import { suggestedPrompts } from "@/lib/chat";

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const {
    messages,
    input,
    setInput,
    isResponding,
    canSend,
    sendMessage,
    clearChat,
    inferenceMode,
    setInferenceMode,
    localModel,
    setLocalModel,
    evaluationResults,
    isEvaluating,
    evaluateAnswers,
  } = useChat();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isResponding]);

  const visibleMessages = messages.filter((message) => message.id !== "welcome");

  return (
    <main className="flex h-screen overflow-hidden bg-background text-foreground">
      <ChatSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={clearChat}
      />
      <section className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          onMenuClick={() => setSidebarOpen(true)}
          inferenceMode={inferenceMode}
          onInferenceModeChange={setInferenceMode}
          localModel={localModel}
          onLocalModelChange={setLocalModel}
        />
        <div className="flex min-h-0 flex-1 flex-col">
          {/* ── Messages ── */}
          <div className="subtle-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-end">
              {visibleMessages.length === 0 ? <EmptyChat /> : null}
              <div className="space-y-5">
                <AnimatePresence initial={false}>
                  {visibleMessages.map((message) => (
                    <ChatBubble key={message.id} message={message} />
                  ))}
                </AnimatePresence>
                {isResponding ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3"
                  >
                    <div className="size-9 shrink-0 rounded-2xl bg-accent/15" />
                    <TypingAnimation />
                  </motion.div>
                ) : null}
                <div ref={endRef} />
              </div>
            </div>
          </div>

          {/* ── Input bar ── */}
          <div className="border-t border-border bg-background/92 px-4 py-4 backdrop-blur-xl sm:px-6">
            <div className="mx-auto max-w-4xl">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {suggestedPrompts.map((prompt) => (
                  <PromptChip key={prompt} onClick={() => setInput(prompt)}>
                    {prompt}
                  </PromptChip>
                ))}
              </div>
              <MessageInput
                value={input}
                onChange={setInput}
                onSend={() => sendMessage()}
                onClear={clearChat}
                canSend={canSend}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Floating evaluation panel (bottom-right) ── */}
      <EvaluationPanel
        onEvaluate={evaluateAnswers}
        isEvaluating={isEvaluating}
        results={evaluationResults}
        inferenceMode={inferenceMode}
      />
    </main>
  );
}
