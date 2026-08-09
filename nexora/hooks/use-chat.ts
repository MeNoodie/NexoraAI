"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createMessage,
  initialMessages,
  type ChatMessage,
  type GenerationSettings,
  type InferenceMode,
  type LocalModel,
  type EvaluationEntry,
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
  const [settings] = useState<GenerationSettings>({ temperature: 0.1, maxTokens: 512, topP: 0.85 });
  const [inferenceMode, setInferenceMode] = useState<InferenceMode>("online");
  const [localModel, setLocalModel] = useState<LocalModel>("dpo");
  const [evaluationResults, setEvaluationResults] = useState<EvaluationEntry[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const sessionIdRef = useRef<string | null>(null);

  const ensureSession = useCallback(async () => {
    if (sessionIdRef.current) return sessionIdRef.current;
    const response = await fetch(`${API_URL}/api/v1/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Could not open a chat session. ${response.status} ${errorText}`);
    }
    const data = await response.json();
    sessionIdRef.current = data.id;
    return data.id as string;
  }, []);

  useEffect(() => {
    void ensureSession();
    return () => {
      const sessionId = sessionIdRef.current;
      if (sessionId) void fetch(`${API_URL}/api/v1/session/${sessionId}`, { method: "DELETE", keepalive: true });
    };
  }, [ensureSession]);

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
        const sessionId = await ensureSession();

        // ─── Determine backend inference_mode and models ────────────────────
        // • online: RAG retrieval + local DPO model (the product flow)
        // • local:  compare mode — queries BOTH SFT and DPO simultaneously
        //           so the playground can show both answers side-by-side
        const backendInferenceMode = inferenceMode === "online" ? "online" : "compare";
        const backendModels =
          inferenceMode === "online"
            ? ["dpo"]          // Product flow: RAG context fed to local DPO model
            : ["sft", "dpo"]; // Playground: both fine-tuned models answer simultaneously

        const response = await fetch(`${API_URL}/api/v1/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: nextContent,
            session_id: sessionId,
            inference_mode: backendInferenceMode,
            models: backendModels,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();

        // Build a single assistant message. In local/compare mode there are
        // two responses (SFT + DPO); format them clearly so the user can
        // read both answers in the same bubble.
        const modelResponses: Array<{ model_name: string; response_text: string }> =
          data.responses ?? [];

        let responseText: string;
        if (modelResponses.length === 0) {
          responseText = "No response from model.";
        } else if (modelResponses.length === 1) {
          // Online mode: single DPO answer
          responseText = modelResponses[0].response_text;
        } else {
          // Compare mode: both SFT and DPO answers
          responseText = modelResponses
            .map((r) => {
              const label = r.model_name.toLowerCase() === "rag" ? "DPO" : r.model_name.toUpperCase();
              return `**[${label} model]**\n\n${r.response_text}`;
            })
            .join("\n\n---\n\n");
        }

        const assistantMessage = createMessage("assistant", responseText);
        setMessages((current) => [...current, assistantMessage]);
        historyRef.current.push({ role: "assistant", content: responseText });
        opts.onComplete?.(responseText);
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
    [ensureSession, inferenceMode, input, isResponding, settings.maxTokens, settings.temperature],
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
    setEvaluationResults([]);
    abortControllerRef.current?.abort();
    const oldSessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    if (oldSessionId) void fetch(`${API_URL}/api/v1/session/${oldSessionId}`, { method: "DELETE" });
    void ensureSession();
  }, [ensureSession]);

  const evaluateAnswers = useCallback(async () => {
    try {
      setIsEvaluating(true);
      const sessionId = await ensureSession();
      const response = await fetch(`${API_URL}/api/v1/session/${sessionId}/evaluate`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(await response.text());

      // The backend returns an array of EvaluationEntry objects directly —
      // NOT an object with an `evaluations` key. Bug 5 fix.
      const data: EvaluationEntry[] = await response.json();
      setEvaluationResults(data);
    } catch (err) {
      console.error("Evaluation failed:", err);
    } finally {
      setIsEvaluating(false);
    }
  }, [ensureSession]);

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
    inferenceMode,
    setInferenceMode,
    localModel,
    setLocalModel,
    historyItems,
    evaluationResults,
    isEvaluating,
    evaluateAnswers,
  };
}
