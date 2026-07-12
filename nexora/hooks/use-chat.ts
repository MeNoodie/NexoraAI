"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  createMessage,
  initialMessages,
  type ChatMessage,
  type GenerationSettings,
} from "@/lib/chat";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface SendOptions {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (fullResponse: string) => void;
  onError?: (error: Error) => void;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isResponding, setIsResponding] = useState(false);
  const [settings] = useState<GenerationSettings>({
    temperature: 0.7,
    maxTokens: 512,
    topP: 0.9,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const canSend = input.trim().length > 0 && !isResponding;

  const sendMessage = useCallback(
    async (content?: string, opts: SendOptions = {}) => {
      const nextContent = (content ?? input).trim();
      if (!nextContent || isResponding) return;

      setInput("");
      setIsResponding(true);
      opts.onStart?.();

      const userMessage = createMessage("user", nextContent);
      setMessages((current) => [...current, userMessage]);

      historyRef.current.push({ role: "user", content: nextContent });
      if (historyRef.current.length > 20) {
        historyRef.current = historyRef.current.slice(-20);
      }

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: nextContent,
            history: historyRef.current.slice(0, -1),
            temperature: settings.temperature,
            max_tokens: settings.maxTokens,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const assistantMessage = createMessage("assistant", data.response);
        setMessages((current) => [...current, assistantMessage]);
        historyRef.current.push({ role: "assistant", content: data.response });
        opts.onComplete?.(data.response);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const error = err instanceof Error ? err : new Error(String(err));
        const errorMessage = createMessage(
          "assistant",
          `Error: ${error.message}. Please try again.`
        );
        setMessages((current) => [...current, errorMessage]);
        opts.onError?.(error);
      } finally {
        setIsResponding(false);
      }
    },
    [input, isResponding, settings.temperature, settings.maxTokens],
  );

  const stopGenerating = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsResponding(false);
  }, []);

  const clearChat = useCallback(() => {
    setMessages(initialMessages);
    setInput("");
    setIsResponding(false);
    historyRef.current = [];
    abortControllerRef.current?.abort();
  }, []);

  const historyItems = useMemo(
    () => [
      "Leave policy",
      "Reimbursement rules",
      "WFH guidelines",
      "Performance reviews",
    ],
    [],
  );

  return {
    messages,
    input,
    setInput,
    isResponding,
    canSend,
    sendMessage,
    stopGenerating,
    clearChat,
    settings,
    historyItems,
  };
}