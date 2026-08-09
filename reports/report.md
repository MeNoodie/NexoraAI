# Nexora --- Complete Fine-Tuning & RAG Learning Report

## 1. Executive Summary

Nexora began as a domain fine-tuning experiment using a constrained
**Qwen2.5-1.5B-Instruct** model.

The initial hypothesis was:

``` text
Handbook knowledge
      ↓
Instruction dataset
      ↓
SFT
      ↓
Domain-specialized model
```

Evaluation showed that this was not reliable enough as a knowledge
architecture. The model could learn task behavior but could still
produce plausible, incorrect policy facts.

The project therefore evolved through:

``` text
Stage 1: SFT
    ↓
Stage 2: DPO
    ↓
DPO + RAG architecture
```

The final architectural principle is:

> **Fine-tuning teaches behavior. RAG supplies knowledge. Deterministic
> tools handle exact calculations. Guardrails validate the system.**

------------------------------------------------------------------------

# 2. Problem Definition

The target system was a Nexora HR assistant capable of answering
employee handbook questions such as:

-   Sick Leave entitlement;
-   probation duration;
-   probation scenarios;
-   Maternity Leave eligibility;
-   Annual Leave accrual;
-   benefits for contract employees;
-   unsupported-benefit questions.

The assistant needed more than generic language generation. It needed
exact policy behavior, abstention, scenario handling, and resistance to
hallucination.

------------------------------------------------------------------------

# 3. Deployment Constraint

The project was intentionally constrained to approximately a **1.5B
model** because of deployment limitations.

This created an important engineering question:

> How far can a small model be improved through fine-tuning, and where
> should system architecture compensate for its limitations?

The model was later converted to GGUF for lightweight inference.

------------------------------------------------------------------------

# 4. Stage 1 --- SFT

## Initial approach

The first SFT dataset focused heavily on direct policy QA.

Example:

``` json
{
  "instruction": "How many days of Annual Leave do full-time employees receive per year?",
  "input": "",
  "output": "Full-time employees are entitled to eighteen (18) days of Annual Leave per calendar year, accrued at the rate of 1.5 days per month."
}
```

The assumption was that enough examples would make the model reliably
remember Nexora facts.

------------------------------------------------------------------------

# 5. Early SFT Failures

Observed examples included:

``` text
Expected: 12 Sick Leave days
Model:    10 days
```

and:

``` text
Expected: 90-day probation
Model:    3–6 months
```

and:

``` text
Expected:
45 days < 90 days → still probationary

Model:
No
```

These failures showed that the model was generating plausible HR
knowledge instead of reliably following the specific Nexora policy.

------------------------------------------------------------------------

# 6. Dataset Evolution

The dataset expanded through multiple iterations, including:

``` text
621 examples
~703 examples
~1,298 examples
```

The major improvement was not merely the number of examples.

The task definition changed.

Instead of teaching:

``` text
"Memorize Nexora facts."
```

the training objective became:

``` text
"Answer questions using supplied evidence and exhibit desired behavior."
```

------------------------------------------------------------------------

# 7. Final SFT Categories

## 7.1 Factual QA

Direct policy lookup.

## 7.2 Paraphrase QA

Different ways of asking the same policy question.

## 7.3 Scenario QA

Apply a policy to a concrete employee situation.

## 7.4 Boundary / Negative QA

Distinguish similar policies and thresholds.

## 7.5 Abstention QA

Teach the model not to invent unsupported information.

## 7.6 Context-Grounded QA

Teach the model to prioritize supplied context.

This final category was particularly important for the later RAG
architecture.

------------------------------------------------------------------------

# 8. Context-Grounded Learning

A counterfactual context test was introduced.

Example:

``` text
Policy Context:
Employees receive exactly 17 Sick Leave days.

Question:
How many Sick Leave days do employees receive?
```

The expected result was:

``` text
17 days
```

rather than a previously learned Nexora value.

Another test changed the workweek to:

``` text
32 hours
```

and the model was expected to return:

``` text
32 hours
```

This showed that context-following could be learned and tested
independently of factual memorization.

------------------------------------------------------------------------

# 9. SFT Configuration

``` text
Base model:               Qwen2.5-1.5B-Instruct
Quantization:             4-bit

LoRA rank:                16
LoRA alpha:               32
LoRA dropout:             0.05

Sequence length:          1024
Batch size:               4
Gradient accumulation:    8
Effective batch size:     32

Learning rate:            5e-5
Epochs:                   5
Warmup ratio:             0.05
Optimizer:                AdamW 8-bit
```

Trainable parameters:

``` text
18,464,768
```

Total:

``` text
1,562,179,072
```

Trainable:

``` text
1.182%
```

------------------------------------------------------------------------

# 10. SFT Results

A major run produced:

``` text
Train time/sec:          884.77
Peak allocated VRAM/GB:  2.741
Peak reserved VRAM/GB:   2.85

global_step:              205
training_loss:            1.1964303156224694
epoch:                    5.0
```

Earlier runs showed training losses around:

``` text
1.89387
1.52361
```

The lower loss indicated improved training fit, but evaluation showed
that loss alone was not enough.

------------------------------------------------------------------------

# 11. SFT Evaluation Findings

### Successful behaviors

-   direct policy extraction;
-   context-grounded answering;
-   false-assumption correction in many cases;
-   unsupported-question abstention;
-   some scenario reasoning.

### Failures

#### Boundary reasoning

``` text
Probation = 90 days
Employee = 95 days

Expected:
No

Observed failure:
Yes
```

#### Arithmetic

``` text
1.5 × 4 = 6

Observed failure:
27
```

#### Insurance

``` text
INR 10,00,000 × 5
= INR 50,00,000

Observed:
incorrect larger amount
```

These failures were important because the relevant information was
already present. They were generation/reasoning problems rather than
retrieval problems.

------------------------------------------------------------------------

# 12. Stage 1 Conclusion

SFT demonstrated:

``` text
Small model
+
good instruction data
→
better domain behavior
```

But it did not demonstrate:

``` text
Small model
→
perfect policy database
```

This distinction changed the architecture.

------------------------------------------------------------------------

# 13. Stage 2 --- DPO

DPO was introduced after SFT.

SFT teaches:

``` text
What should a good answer look like?
```

DPO adds:

``` text
Which of these two answers should be preferred?
```

This allowed realistic failure modes to be explicitly contrasted with
desirable responses.

------------------------------------------------------------------------

# 14. DPO Dataset

Observed size:

``` text
243 preference pairs
```

Each example contained:

``` text
prompt
chosen
rejected
```

The rejected answer was intentionally plausible.

Examples included:

-   wrong policy values;
-   generic HR answers;
-   hallucinated benefits;
-   incorrect eligibility;
-   wrong arithmetic;
-   unsupported continuation;
-   failure to abstain.

------------------------------------------------------------------------

# 15. DPO Configuration

``` text
Preference pairs:    243
Epochs:              2
Learning rate:       1e-5
Beta:                0.1
```

Result:

``` text
Train time/sec:          225.17
Peak allocated VRAM/GB:  8.889
Peak reserved VRAM/GB:  11.527

global_step:              16
training_loss:            0.5524674281477928
epoch:                    2.0
```

The smaller DPO dataset motivated a conservative two-epoch starting
point.

------------------------------------------------------------------------

# 16. DPO Formatting Debugging

The DPO pipeline required careful inspection of chat-template
boundaries.

The desired structure was:

``` text
System
↓
User
↓
Assistant generation boundary
↓
chosen/rejected completion
↓
<|im_end|>
```

The Qwen tokenizer used:

``` text
EOS:
<|im_end|>

EOS ID:
151645
```

Chosen and rejected completions were checked to ensure their final token
was:

``` text
151645
```

This demonstrated an important practical lesson:

> Tokenization and chat formatting are part of the training pipeline,
> not merely presentation details.

------------------------------------------------------------------------

# 17. DPO Improvements

Observed improvements included:

### Eligibility

Better handling of:

``` text
85 days >= 80-day minimum
```

### Leave calculation

Improved behavior for:

``` text
1.5 × 4 = 6
```

### Context override

The model continued to follow supplied values such as:

``` text
17 Sick Leave days
32-hour workweek
```

### Abstention

The model generally avoided inventing unsupported benefits when the
context was insufficient.

------------------------------------------------------------------------

# 18. Remaining DPO Problems

The DPO model was still not perfect.

Remaining issues included:

-   some threshold/boundary reasoning;
-   some arithmetic;
-   occasional unnecessary continuation;
-   possible hallucination without external evidence.

This was the point where more training was not automatically the best
solution.

------------------------------------------------------------------------

# 19. The Architecture Shift

The project changed from:

``` text
Question
  ↓
Model remembers policy
  ↓
Answer
```

to:

``` text
Question
  ↓
Retrieve policy evidence
  ↓
DPO model uses evidence
  ↓
Answer
```

This was the most important architectural decision in the project.

------------------------------------------------------------------------

# 20. SFT vs DPO vs DPO + RAG

The final evaluation setup is:

### SFT

``` text
SFT GGUF
+
SFT prompt
+
Question
```

### DPO

``` text
DPO GGUF
+
DPO prompt
+
Question
```

### DPO + RAG

``` text
Question
 ↓
Retriever
 ↓
Handbook context
 ↓
DPO GGUF
+
RAG prompt
+
Context
+
Question
```

There is no separate RAG model.

RAG is a system architecture around the DPO generator.

------------------------------------------------------------------------

# 21. Why RAG?

The handbook is the source of truth.

Fine-tuning stores behavior in weights, but policy knowledge should
remain external because:

-   policies change;
-   retrieval provides evidence;
-   sources can be cited;
-   updates do not require retraining;
-   access control can be applied at retrieval;
-   debugging is easier.

------------------------------------------------------------------------

# 22. Retrieval Design

The planned pipeline:

``` text
PDF
 ↓
Parser
 ↓
Section-aware chunking
 ↓
Metadata
 ↓
Embedding model
 ↓
Vector database
 ↓
Top-K retrieval
 ↓
Hybrid search / reranking
 ↓
DPO model
```

Important metadata:

``` text
page
section
subsection
policy type
document version
effective date
source
```

------------------------------------------------------------------------

# 23. Chunking Lesson

Naive chunking:

``` text
Every N characters
```

can split policy rules incorrectly.

A better strategy is:

``` text
Policy section
 ↓
Semantically complete rule
```

For eligibility policies, related facts should remain together where
possible.

Example:

``` text
Minimum continuous employment = 80 days
Entitlement = 26 weeks
```

------------------------------------------------------------------------

# 24. Retrieval vs Generation Diagnosis

When the final answer is wrong:

``` text
Was the correct evidence retrieved?
```

If:

``` text
NO
```

the problem is likely:

``` text
chunking
embedding
query
retrieval
reranking
```

If:

``` text
YES
```

but the answer is wrong:

``` text
prompt
generation
model
guardrail
```

This diagnostic separation is one of the most important lessons from the
project.

------------------------------------------------------------------------

# 25. Deterministic Tools

The experiments showed that some operations are better handled outside
the LLM.

Examples:

``` python
probationary = days_since_joining < 90
annual_leave = 1.5 * months_completed
insurance = annual_ctc * 5
```

The model can then explain the deterministic result.

This creates a clean separation:

``` text
RAG
→ policy evidence

Tools
→ exact computation

LLM
→ language + behavior
```

------------------------------------------------------------------------

# 26. Guardrails

The final system should include:

### Input guardrails

-   prompt injection checks;
-   scope validation;
-   query normalization.

### Output guardrails

-   evidence validation;
-   unsupported-number checks;
-   hallucination detection;
-   concise-answer constraints;
-   citation validation.

------------------------------------------------------------------------

# 27. Evaluation Framework

A serious evaluation should not report only one accuracy number.

Measure:

### Retrieval

-   Recall@K;
-   MRR;
-   hit rate;
-   reranker quality.

### Generation

-   factual correctness;
-   groundedness;
-   hallucination rate;
-   abstention accuracy;
-   reasoning;
-   arithmetic;
-   conciseness.

### End-to-end

``` text
Question
→ retrieval
→ context
→ generation
→ final answer
```

The same held-out questions should be evaluated across:

``` text
SFT
DPO
DPO + RAG
```

------------------------------------------------------------------------

# 28. Key Experimental Test Types

## Direct fact

``` text
How many Sick Leave days?
```

## False assumption

``` text
I heard it is 10 days. Is that correct?
```

## Boundary

``` text
90-day probation.
I joined 95 days ago.
```

## Abstention

``` text
Does the handbook mention free Netflix?
```

## Counterfactual context

``` text
Context says 17 days.
What is the entitlement?
```

## Calculation

``` text
1.5 days/month × 4 months
```

These tests expose different failure modes.

------------------------------------------------------------------------

# 29. Main Lessons

## Dataset design \> raw dataset size

Adding examples helped, but changing the learning objective was more
important.

## Fine-tuning ≠ knowledge database

A small model should not be trusted as the authoritative policy store.

## DPO ≠ magic

DPO improves preference behavior but does not eliminate all reasoning
errors.

## RAG ≠ automatic grounding

The generator still needs to use the retrieved evidence correctly.

## Training loss ≠ product quality

Behavioral evaluation is mandatory.

## Tools beat LLM arithmetic

Use deterministic computation when exactness matters.

## Diagnose before retraining

Identify whether the failure belongs to:

``` text
Data
Prompt
Retrieval
Generation
Calculation
Guardrails
```

## Know when to stop

Additional training is not always the highest-value next step.

------------------------------------------------------------------------

# 30. Interview-Level Explanation

### Why fine-tune?

> I used SFT to teach the small model domain-specific task behavior such
> as concise HR responses, context following, abstention, paraphrase
> handling, and policy scenarios.

### Why DPO?

> I used DPO to explicitly prefer grounded and concise answers over
> realistic hallucinated or incorrect alternatives.

### Why RAG?

> The handbook is the authoritative and changing source of truth, so I
> moved knowledge retrieval outside the model weights.

### Why a 1.5B model?

> Deployment constraints required a lightweight model, so I compensated
> with fine-tuning, retrieval, deterministic tools, and guardrails.

### What failed?

> The model still showed weaknesses in boundary reasoning, arithmetic,
> and occasional unsupported continuation.

### What did you do?

> Instead of endlessly increasing training, I moved knowledge into RAG
> and exact operations into deterministic tools.

------------------------------------------------------------------------

# 31. What This Project Taught

The project changed the mental model from:

``` text
"How do I make the LLM know everything?"
```

to:

``` text
"Which subsystem should solve each problem?"
```

The final mapping is:

``` text
Policy knowledge
→ RAG

Response behavior
→ SFT / DPO

Exact calculations
→ deterministic tools

Safety / evidence validation
→ guardrails

System reliability
→ evaluation + monitoring
```

------------------------------------------------------------------------

# 32. Final Architecture

``` text
                         ┌─────────────────────┐
                         │  Nexora Handbook    │
                         │   SOURCE OF TRUTH   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                              RAG Retrieval
                                    │
                                    ▼
                            Policy Evidence
                                    │
                                    ▼
Employee Question ───────────► DPO Model
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                    Rule / Tool          Language
                    Computation          Generation
                         │                     │
                         └──────────┬──────────┘
                                    ▼
                               Guardrails
                                    │
                                    ▼
                              Final Answer
```

------------------------------------------------------------------------

# 33. Final Reflection

The most valuable result was not a particular loss value.

It was the engineering progression:

``` text
Assumption
   ↓
Experiment
   ↓
Failure
   ↓
Evaluation
   ↓
Diagnosis
   ↓
Architecture change
```

The project started by trying to teach a small model the handbook.

It ended with a better architecture:

> **Keep knowledge external, fine-tune behavior, use deterministic tools
> for exact operations, and evaluate every subsystem independently.**

That is the central learning outcome of Nexora.
