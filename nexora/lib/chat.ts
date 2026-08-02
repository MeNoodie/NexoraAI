export type ChatRole = "assistant" | "user";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type GenerationSettings = {
  temperature: number;
  maxTokens: number;
  topP: number;
};

export type InferenceMode = "local" | "online";

export type LocalModel = "domain" | "sft" | "dpo";

export const inferenceModeDetails = {
  local: {
    label: "Local lab",
    description: "Direct inference with a selected fine-tuned model",
  },
  online: {
    label: "Online RAG",
    description: "Retrieval-backed inference for deployment",
  },
} as const;

export const suggestedPrompts = [
  "What is leave policy?",
  "What are office timings?",
  "Explain reimbursement policy",
  "What are core values?",
  "Work from home policy",
] as const;

export const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Hi, I am Nexora AI. Ask me about HR policies, leave, reimbursements, office timings, or work-from-home guidelines.",
    createdAt: new Date().toISOString(),
  },
];

export function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${role}-${Date.now()}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}
