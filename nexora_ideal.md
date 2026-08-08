# ✦ Nexora HR Assistant

> **Domain Fine-Tuning → Preference Optimization → Retrieval-Augmented
> HR Assistant**

Nexora is a domain-specific HR policy assistant built around a
constrained **Qwen2.5-1.5B-Instruct** model.

The project evolved from a pure fine-tuning experiment into a grounded
AI architecture:

``` text
Employee Question
       ↓
Retrieval
       ↓
Relevant Handbook Context
       ↓
DPO Fine-Tuned Qwen 1.5B
       ↓
Guardrails / Validation
       ↓
Grounded HR Answer
```

## 🎯 Goals

Nexora is designed to answer employee-policy questions while:

-   following company policy;
-   correcting false assumptions;
-   avoiding invented benefits or numbers;
-   abstaining when evidence is unavailable;
-   keeping answers concise;
-   using the handbook as the source of truth.

## 🏗️ Architecture

``` mermaid
flowchart TD
    A[Employee Question] --> B[Input Guardrails]
    B --> C[Query Processing]
    C --> D[Embedding]
    D --> E[Vector DB / Hybrid Retrieval]
    E --> F[Top-K Policy Chunks]
    F --> G[Optional Reranker]
    G --> H[Policy Context]
    H --> I[DPO Fine-Tuned Qwen 1.5B]
    I --> J[Output Validation]
    J --> K[Final HR Answer]
```

### Responsibility split

  Component     Responsibility
  ------------- -------------------------------------------------------
  SFT           Learn task and response behavior
  DPO           Prefer grounded, concise, non-hallucinatory responses
  RAG           Retrieve authoritative policy knowledge
  Vector DB     Store/search handbook embeddings
  Tools/rules   Exact calculations and deterministic logic
  Guardrails    Input/output validation

------------------------------------------------------------------------

# 🧪 Stage 1 --- Supervised Fine-Tuning

The base model was **Qwen2.5-1.5B-Instruct**, loaded in 4-bit and
adapted with LoRA.

### LoRA

``` python
[
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj"
]
```

Observed parameters:

``` text
Trainable: 18,464,768
Total:     1,562,179,072
Trainable: 1.182%
```

### Main configuration

``` text
Sequence length:       1024
Batch size:            4
Gradient accumulation: 8
Effective batch:       32
Learning rate:         5e-5
Epochs:                5
Optimizer:             AdamW 8-bit
Warmup ratio:          0.05
```

## Dataset evolution

The dataset grew through multiple iterations, reaching approximately
**1,298 examples**.

The important improvement was not only more rows; the objective changed
from fact memorization to behavioral/context-grounded learning.

Categories included:

1.  Factual QA
2.  Paraphrase QA
3.  Scenario QA
4.  Boundary / Negative QA
5.  Abstention QA
6.  Context-grounded QA

### Why the redesign?

Early evaluation showed failures such as:

``` text
Expected: 12 Sick Leave days
Model:    10 days
```

and:

``` text
Expected: 90-day probation
Model:    3–6 months
```

This showed that a small model should not be treated as a reliable
policy database.

The dataset was therefore changed to teach:

> **Use supplied policy context as evidence instead of blindly relying
> on learned facts.**

### Counterfactual context testing

Example:

``` text
Policy Context:
Employees receive exactly seventeen (17) Sick Leave days.

Question:
How many Sick Leave days do employees receive?
```

The desired answer was **17 days**, even if another Nexora value had
appeared during training.

This became an important grounding evaluation.

## SFT result

A major final SFT run:

``` text
Train time:          884.77 sec
Global steps:        205
Training loss:       1.1964303156224694
Epoch:               5.0
Peak allocated VRAM: 2.741 GB
Peak reserved VRAM:  2.85 GB
```

The loss improved, but evaluation still exposed boundary and arithmetic
failures.

------------------------------------------------------------------------

# 🏆 Stage 2 --- Direct Preference Optimization

DPO was applied after SFT.

The objective changed from:

``` text
"Here is a good answer."
```

to:

``` text
"Between these two plausible answers, prefer this one."
```

The DPO dataset contained approximately **243 preference pairs**.

Each pair had:

``` text
prompt
chosen
rejected
```

Rejected answers were realistic failures such as:

-   wrong policy numbers;
-   generic HR answers;
-   hallucinated benefits;
-   incorrect eligibility;
-   wrong arithmetic;
-   unsupported continuation;
-   failure to abstain.

### DPO configuration

``` text
Preference pairs: 243
Epochs:           2
Learning rate:    1e-5
Beta:             0.1
```

Observed result:

``` text
Train time:          ~225 sec
Global steps:        16
Training loss:       ~0.55247
Epoch:               2
Peak allocated VRAM: ~8.889 GB
Peak reserved VRAM:  ~11.527 GB
```

### EOS/debugging

The Qwen tokenizer used:

``` text
<|im_end|>
EOS ID = 151645
```

Chosen and rejected completions were verified to end with `151645`.

This exposed an important lesson:

> Chat-template boundaries and completion formatting are part of
> training correctness.

------------------------------------------------------------------------

# 📈 What DPO Improved

DPO improved several observed behaviors:

-   context following;
-   false-assumption correction;
-   some eligibility reasoning;
-   simple leave-accrual calculations;
-   abstention on unsupported benefits;
-   preference for concise grounded answers.

For example:

``` text
1.5 × 4 months
→ 6 days
```

became more reliable.

Artificial context overrides such as:

``` text
Sick Leave = 17 days
Workweek = 32 hours
```

also remained successful.

## Remaining limitations

The 1.5B model still showed:

-   some boundary-condition errors;
-   some arithmetic errors;
-   occasional unnecessary continuation;
-   possible hallucination when no external evidence was supplied.

Therefore the project stopped treating further fine-tuning as the
universal solution.

------------------------------------------------------------------------

# 📚 RAG --- DPO as the Generator

There is **no separate RAG model**.

The final comparison is:

``` text
SFT:
SFT GGUF + SFT prompt + question

DPO:
DPO GGUF + DPO prompt + question

DPO + RAG:
DPO GGUF + RAG prompt + retrieved handbook context + question
```

The handbook is the source of truth.

If policy changes:

``` text
Update PDF
   ↓
Re-index
   ↓
New answers
```

without necessarily retraining the model.

## Planned retrieval pipeline

``` text
PDF
 ↓
Parsing
 ↓
Section-aware chunking
 ↓
Metadata
 ↓
Embeddings
 ↓
Vector DB
 ↓
Top-K retrieval
 ↓
Optional hybrid search
 ↓
Optional reranking
 ↓
DPO model
```

Useful metadata includes:

``` text
source
page
section
subsection
policy type
document version
effective date
```

------------------------------------------------------------------------

# 🧮 Deterministic Rules

The experiments showed that some tasks should not depend entirely on an
LLM.

For example:

``` python
is_probationary = days_since_joining < 90
annual_leave = 1.5 * months
insurance_cover = annual_ctc * 5
```

The system can calculate these values deterministically and let the LLM
explain them naturally.

This gives:

``` text
RAG   → policy evidence
Tools → exact computation
LLM   → language + behavior
```

------------------------------------------------------------------------

# 🛡️ Guardrails

The production system should add:

### Input

-   prompt-injection protection;
-   scope validation;
-   query normalization.

### Output

-   unsupported-number checks;
-   evidence validation;
-   hallucination checks;
-   concise-answer constraints;
-   citation/source validation.

------------------------------------------------------------------------

# 🧪 Evaluation

The main comparison is:

  System      Model      Evidence
  ----------- ---------- --------------------
  SFT         SFT GGUF   Model only
  DPO         DPO GGUF   Model only
  DPO + RAG   DPO GGUF   Retrieved handbook

Evaluate:

-   factual correctness;
-   grounding;
-   hallucination;
-   abstention;
-   reasoning;
-   arithmetic;
-   boundary conditions;
-   conciseness.

For RAG, evaluate retrieval separately:

``` text
Wrong answer
   ↓
Was correct evidence retrieved?
   ├── No  → retrieval/indexing problem
   └── Yes → generation/prompt/model problem
```

------------------------------------------------------------------------

# 🧰 Stack

  Area                Technology
  ------------------- ------------------------------
  Base LLM            Qwen2.5-1.5B-Instruct
  Fine-tuning         LoRA / 4-bit
  SFT                 Unsloth / TRL
  Preference tuning   DPO
  Inference           llama.cpp / llama-cpp-python
  Model format        GGUF
  Retrieval           Vector store
  UI                  Gradio
  Deployment          Hugging Face Spaces

------------------------------------------------------------------------

# 📌 Status

### Completed

-   [x] Qwen2.5-1.5B selection
-   [x] 4-bit LoRA training
-   [x] SFT dataset
-   [x] Context-grounded SFT
-   [x] SFT evaluation
-   [x] DPO preference dataset
-   [x] DPO training
-   [x] DPO formatting/EOS validation
-   [x] GGUF conversion
-   [x] SFT vs DPO evaluation design
-   [x] Lightweight deployment

### Next

-   [ ] PDF ingestion
-   [ ] Semantic chunking
-   [ ] Metadata-aware indexing
-   [ ] Vector DB
-   [ ] Hybrid retrieval
-   [ ] Reranking
-   [ ] DPO + RAG integration
-   [ ] Deterministic policy tools
-   [ ] Guardrails
-   [ ] Citations
-   [ ] Retrieval metrics
-   [ ] End-to-end evaluation
-   [ ] Monitoring

------------------------------------------------------------------------

# 💡 Core Engineering Lesson

The project started with:

``` text
Wrong answer
→ train the model more
```

It evolved into:

``` text
Wrong answer
      ↓
Diagnose the subsystem
      ↓
Retrieval?
Generation?
Calculation?
Prompt?
Data?
Guardrail?
      ↓
Fix the correct layer
```

The final principle is:

> **Keep knowledge external, teach behavior through fine-tuning, use
> deterministic tools for exact work, and evaluate every subsystem
> independently.**
