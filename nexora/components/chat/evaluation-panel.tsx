"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  FlaskConical,
  LoaderCircle,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { useState } from "react";
import type { EvaluationEntry, InferenceMode, ModelEvaluation } from "@/lib/chat";
import { Button } from "@/components/ui/button";

type EvaluationPanelProps = {
  onEvaluate: () => void;
  isEvaluating: boolean;
  results: EvaluationEntry[];
  inferenceMode?: InferenceMode;
};

const SCORE_LABELS: Record<string, string> = {
  factual_correctness: "Factual",
  groundedness: "Grounded",
  completeness: "Complete",
  policy_compliance: "Policy",
  clarity: "Clarity",
};

function formatModelName(name: string, isLocal: boolean): string {
  if (!name) return name;
  const lower = name.toLowerCase();
  if (isLocal) {
    if (lower === "rag") return "DPO";
    return name.toUpperCase();
  } else {
    if (lower === "dpo") return "RAG";
    return name.toUpperCase();
  }
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round((value / 5) * 100);
  const color =
    value >= 4 ? "bg-emerald-500" : value >= 3 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 shrink-0 text-muted">{label}</span>
      <div className="flex-1 rounded-full bg-muted/15 h-1.5 overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-4 text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function ModelCard({
  modelEval,
  isBest,
  isLocal,
}: {
  modelEval: ModelEvaluation;
  isBest: boolean;
  isLocal: boolean;
}) {
  const { model, scores, overall_score, reasoning } = modelEval;
  const displayName = formatModelName(model, isLocal);

  return (
    <div
      className={`rounded-xl border p-3 text-xs ${
        isBest ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-card/60"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-semibold uppercase tracking-wide text-foreground">{displayName}</span>
        <div className="flex items-center gap-1">
          {isBest && <Trophy className="size-3 text-emerald-500" />}
          <span
            className={`font-bold text-sm ${
              overall_score >= 4 ? "text-emerald-400" : overall_score >= 3 ? "text-amber-400" : "text-red-400"
            }`}
          >
            {overall_score.toFixed(1)}
            <span className="text-muted font-normal text-xs">/5</span>
          </span>
        </div>
      </div>
      <div className="space-y-1.5 mb-2">
        {Object.entries(scores).map(([key, val]) => (
          <ScoreBar key={key} label={SCORE_LABELS[key] ?? key} value={val as number} />
        ))}
      </div>
      {reasoning && (
        <p className="leading-5 text-muted border-t border-border pt-2 mt-2">{reasoning}</p>
      )}
    </div>
  );
}

export function EvaluationPanel({
  onEvaluate,
  isEvaluating,
  results,
  inferenceMode = "local",
}: EvaluationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isLocal = inferenceMode === "local";

  return (
    // Fixed to bottom-right corner
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* ── Expanded panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="eval-panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-80 rounded-2xl border border-border bg-background/96 shadow-2xl backdrop-blur-xl overflow-hidden"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
              <div className="flex items-center gap-2">
                <FlaskConical className="size-4 text-accent" />
                <p className="text-sm font-semibold text-foreground">Answer Evaluation</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-muted hover:text-foreground hover:bg-card transition"
                aria-label="Close evaluation panel"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Panel body */}
            <div className="p-4">
              <Button
                className="w-full"
                onClick={onEvaluate}
                disabled={isEvaluating}
                size="sm"
              >
                {isEvaluating ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <FlaskConical className="size-4" />
                )}
                {isEvaluating ? "Evaluating…" : "Evaluate answers"}
              </Button>

              {/* Results */}
              <div
                className="mt-4 space-y-5 overflow-y-auto subtle-scrollbar pr-0.5"
                style={{ maxHeight: "55vh" }}
              >
                {results.length === 0 && !isEvaluating && (
                  <p className="text-center text-xs text-muted py-4">
                    Ask a question then click &ldquo;Evaluate answers&rdquo;.
                  </p>
                )}

                {results.map((entry, idx) => {
                  const evals = entry.evaluation?.evaluations ?? [];
                  const bestModel = entry.evaluation?.best_model;
                  const summary = entry.evaluation?.summary;
                  const rawOutput = entry.evaluation?.raw_output;

                  const displayBestModel = bestModel
                    ? formatModelName(bestModel, isLocal)
                    : null;

                  const displaySummary = summary
                    ? isLocal
                      ? summary.replace(/rag/gi, "DPO")
                      : summary.replace(/dpo/gi, "RAG")
                    : null;

                  return (
                    <article key={`${entry.conversation_id}-${idx}`} className="space-y-2">
                      <p className="text-xs font-medium text-foreground truncate" title={entry.question}>
                        <Star className="size-3 inline mr-1 text-accent" />
                        {entry.question}
                      </p>

                      {evals.length > 0 ? (
                        evals.map((modelEval) => (
                          <ModelCard
                            key={modelEval.model}
                            modelEval={modelEval}
                            isBest={modelEval.model === bestModel}
                            isLocal={isLocal}
                          />
                        ))
                      ) : rawOutput ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
                          <p className="font-medium text-amber-400 mb-1">Parse error — raw output:</p>
                          <p className="text-muted leading-5 whitespace-pre-wrap">{rawOutput}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted">No evaluation data.</p>
                      )}

                      {displaySummary && (
                        <div className="rounded-xl border border-border bg-muted/5 p-3 text-xs">
                          <p className="text-muted font-medium mb-1">
                            Summary
                            {displayBestModel && (
                              <span className="ml-2 text-emerald-400">
                                · Best: {displayBestModel}
                              </span>
                            )}
                          </p>
                          <p className="leading-5 text-foreground">{displaySummary}</p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating trigger button ── */}
      <motion.button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl border transition-colors ${
          isOpen
            ? "bg-primary text-white border-primary"
            : "bg-card border-border text-foreground hover:bg-primary hover:text-white hover:border-primary"
        }`}
        aria-label="Toggle evaluation panel"
      >
        {isEvaluating ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <FlaskConical className="size-4" />
        )}
        <span>Evaluate</span>
        {results.length > 0 && (
          <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-accent text-white text-xs font-bold">
            {results.length}
          </span>
        )}
        <ChevronDown
          className={`size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </motion.button>
    </div>
  );
}
