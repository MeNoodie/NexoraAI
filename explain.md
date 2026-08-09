# Nexora fine-tuning notebook explained

This document explains [`nexa.ipynb`](nexa.ipynb): what every meaningful part does, why it is used, how its values affect tuning, and how to measure the model after each stage.

## What the notebook is building

The notebook adapts `unsloth/Qwen2.5-3B-Instruct-bnb-4bit` to the Nexora employee handbook in three sequential stages:

```text
Qwen 2.5 3B Instruct (4-bit)
        │
        ├─ Stage 1: continued pre-training on handbook PDF paragraphs
        │          Result: learns Nexora vocabulary, policy wording, and facts
        │
        ├─ Stage 2: supervised fine-tuning (SFT) on 236 question/answer rows
        │          Result: learns to answer in the requested instruction format
        │
        └─ Stage 3: direct preference optimization (DPO) on 196 chosen/rejected pairs
                   Result: should prefer the approved answer style and content
```

Each stage saves two artifacts:

* **LoRA adapter**: small, reusable trainable weights only.
* **Merged 16-bit model**: base model plus the adapter; it is used as the next stage's base and can be exported to GGUF.

## Unsloth, QLoRA, and LoRA

**Unsloth** speeds up fine-tuning and integrates with Hugging Face, TRL, LoRA, and quantized loading. It enables the 3B model to train with much less VRAM.

**4-bit loading / QLoRA** stores the frozen base model in 4-bit precision. This drastically lowers memory use while LoRA layers learn in higher precision. It makes the workflow accessible on a T4-class GPU; the recorded run used an H100 80 GB.

**LoRA** does not update all 3.12 billion base parameters. It adds low-rank trainable matrices to selected linear layers. This run trains 29,933,568 parameters, only **0.9607%** of the model. That reduces GPU memory, training time, and risk of damaging general model knowledge.

The target modules are attention projections (`q_proj`, `k_proj`, `v_proj`, `o_proj`) and MLP projections (`gate_proj`, `up_proj`, `down_proj`). Attention targets help the model decide what context matters; MLP targets give it capacity to learn domain content and response behavior.

## Cell-by-cell explanation

### Cells 0-2: installation, imports, and GPU check

Cell 0 is only a notebook smoke test. Cell 1 installs Unsloth, Transformers, TRL, PyMuPDF, and Datasets. Cell 2 imports them and asserts that CUDA is present.

Why check CUDA? Quantized LLM fine-tuning needs a GPU in this configuration. `is_bfloat16_supported()` selects BF16 on modern GPUs such as A100/H100; otherwise it uses FP16. BF16 has a wider numeric range and is usually more stable.

Important: the recorded output shows `datasets==5.0.0`, which conflicts with the installed Unsloth version requirement (`>=3.4.1, <4.4.0`, excluding two versions). Pin a compatible version instead of `pip install -U datasets`:

```python
!pip -q install unsloth transformers==4.56.2 --no-deps trl==0.22.2 \
    "datasets>=3.4.1,<4.4.0,!=4.0.*,!=4.1.0" pymupdf
```

### Cells 3-5: paths, hyperparameters, and resource measurement

Cell 3 contains old, commented paths. Cell 4 defines live paths and all training choices. It also fails early when an input file is missing and creates output directories. Cell 5 clears unused tensors and measures runtime and GPU peak memory around `trainer.train()`.

`torch.cuda.synchronize()` is required before timing GPU work; CUDA is asynchronous, so without it the reported time can end too early.

The effective batch size is:

```text
per-device batch size × gradient accumulation × GPU count = 4 × 8 × 1 = 32
```

`gradient_accumulation_steps=8` accumulates gradients across eight small batches before one optimizer update. It behaves approximately like batch size 32 without needing memory for 32 sequences at once.

### Cells 6-7: prompt and generation helpers

`build_instruction_prompt` creates the fixed template used by Stage 2:

```text
### Instruction:
<question>

### Input:
<optional context>

### Response:
```

Consistent training and inference formatting matters: the model learns token patterns, not an abstract API. If inference uses a different template, answer quality can fall.

`generate_answer` switches the model to inference mode, tokenizes the prompt, generates tokens, then removes the input tokens so only the answer is returned.

Generation settings are deliberately stochastic:

* `temperature=0.7`: moderate variation. Use `0.0–0.2` for factual policy questions.
* `top_p=0.9`: samples only from a high-probability token set, reducing unusual words.
* `repetition_penalty=1.1`: mildly discourages repeated phrases.
* `max_new_tokens=150`: limits answer length and cost. Raise it only for questions needing longer answers.

### Cells 8-9: model creation and saving

`FastLanguageModel.from_pretrained(... load_in_4bit=True)` loads either the original model or the preceding merged stage. `max_seq_length=1024` limits the longest train/inference sequence. The tokenizer’s pad token is set to EOS because Qwen may not define one; right padding is appropriate for SFT.

`get_peft_model` attaches a **new** LoRA adapter at every stage. Merging then makes the stage's behavior part of the next stage's base. This preserves the sequential curriculum, but it also means every merged stage consumes substantial disk storage.

`use_gradient_checkpointing="unsloth"` recomputes some activations during backpropagation rather than storing all of them. It lowers memory use at a small compute cost.

`save_pretrained_merged(..., save_method="merged_16bit")` is used because a merged model is portable and required for the next stage/GGUF export. Keep the adapter too: it is much smaller and supports adapter-only deployment.

### Cells 10-14: Stage 1 — handbook adaptation

The PDF pipeline extracts text per page with PyMuPDF, normalizes Unicode, removes zero-width characters, joins hyphenated line breaks, removes page-number-only lines, and splits text into clean paragraphs. Paragraphs below 80 characters are discarded because very short fragments carry little language-learning signal and can contain headings or page debris.

The recorded run extracted **31 pages** and **32 usable paragraphs**. Stage 1 then treats each paragraph as plain next-token-prediction text. This is continued pre-training/domain adaptation, not instruction tuning. It teaches terminology and policy language, but it does not inherently teach concise question answering.

`packing=True` combines short paragraphs into full 1024-token blocks. This increases token utilization and is a good choice for raw text. It is not used in Stage 2 because each Q/A record should remain a separate instruction-response example.

The Stage 1 test in Cells 13-14 is only a qualitative smoke test. The output repeats and invents a follow-up question, demonstrating why raw-text adaptation alone is not enough for a clean assistant.

### Cells 15-17: Stage 2 — supervised instruction fine-tuning

The JSONL file must contain `instruction` and `output`, with optional `input`. Every row is transformed into one training string containing both prompt and ideal answer. During causal-language-model training, the model predicts the next tokens in that string, learning both the format and the desired answer content.

The recorded dataset has **236 rows**. Stage 2 starts from the Stage 1 merged model, so it retains handbook adaptation and learns to turn a query into an answer. This is the principal stage for reliable prompt-following.

`packing=False` preserves each example boundary, which makes supervised examples cleaner and avoids accidental prompt/answer blending between records.

### Cells 18-19: Stage 2 GGUF and Hub upload

GGUF is a llama.cpp-compatible deployment format. `q4_k_m` is a common quality/size compromise for local inference. Export happens after merging because GGUF is an inference artifact, not a trainable LoRA adapter.

Cell 19 should not contain a Hugging Face access token in source code. The token visible in the notebook should be revoked immediately and replaced with an environment variable or notebook secret:

```python
from getpass import getpass
from huggingface_hub import login

login(token=getpass("Hugging Face write token: "))
```

This cell also referenced an incorrect/nonexistent GGUF folder name and its recorded run failed because `STAGE2_MERGED_DIR` was not defined in that kernel state.

### Cells 20-22: Stage 3 — DPO preference tuning

DPO data has a `prompt`, a preferred `chosen` response, and an inferior `rejected` response. Unlike SFT, it does not simply imitate one answer; it increases the relative likelihood of the chosen answer over the rejected one. Here it should help the model favor precise Nexora-policy answers over vague answers.

`beta=0.1` controls how strongly DPO pushes preferences away from the reference behavior. A lower beta is usually gentler/more conservative; a higher beta applies stronger preference pressure and can over-specialize if pairs are noisy.

The trainer uses `ref_model=None`. In PEFT DPO, the reference is commonly derived by disabling adapters against the same base; confirm the exact behavior for the installed TRL/Unsloth versions before relying on it in production. Left padding is common for decoder-only DPO batching because completions align at the sequence end.

**Critical correctness issue:** Cell 21 trains `stage3_model`, but Cell 22 overwrites it with a fresh model loaded from `STAGE2_MERGED_DIR`, creates a new trainer, and immediately saves it. Consequently, the saved `stage3_dpo_final_merged_model` is likely Stage 2 plus an untrained new LoRA adapter—not the model trained in Cell 21. The answer printed in Cell 22 is not a valid DPO evaluation either.

Replace Cell 22 with this, immediately after Cell 21 and before deleting `stage3_model`:

```python
# The model already trained by stage3_trainer in Cell 21 is still in memory.
tokenizer.padding_side = "right"  # only for this generation helper
print(generate_answer(
    stage3_model, tokenizer,
    "How many sick leaves do I get at Nexora per year?",
    max_new_tokens=150,
))

save_adapter_and_merge(
    model=stage3_model,
    tokenizer=tokenizer,
    adapter_dir=STAGE3_ADAPTER_DIR,
    merged_dir=FINAL_MERGED_DIR,
    stage_name="Stage 3 DPO Final",
)

del stage3_trainer, stage3_model
clear_gpu_memory()
```

### Cells 23-25: final artifact and upload

Cell 23 prints output locations. Cell 24 converts the final merged model to Q4_K_M GGUF. Cell 25 creates/uses a Hugging Face repository and uploads model files. It repeats the hard-coded-token problem and should use a secret. Its GGUF directory construction is correct only if it matches the actual export directory (`stage3_dpo_final_merged_model_gguf`).

## Why these current values, and what changes when they change

| Setting | Current value | Why it is used | If lower | If higher |
|---|---:|---|---|---|
| `MAX_SEQ_LENGTH` | 1024 | Covers reasonably long policy passages while controlling memory | Truncates long questions/answers/context | More context but substantially more VRAM/time (attention cost rises quickly) |
| `LORA_R` | 16 | Moderate adapter capacity | Less capacity; may underfit policy style | More capacity/memory; may overfit small data |
| `LORA_ALPHA` | 32 | LoRA scale; gives alpha/r = 2 | Weaker adaptation | Stronger updates; can destabilize/overfit |
| `LORA_DROPOUT` | 0.05 | Small regularization for small datasets | Faster fit, higher overfit risk | Better regularization, but too high can underfit |
| per-device batch | 4 | Fits modest GPUs | Noisier gradients/slower throughput | Faster/steadier until VRAM is exhausted |
| accumulation | 8 | Effective batch 32 without batch-32 memory | More frequent/noisier updates | Larger effective batch but fewer updates per data pass |
| learning rate | 5e-5 | Conservative LoRA fine-tuning start | Safer but may learn too slowly in 30 steps | Faster learning but can forget/generalize poorly |
| warmup steps | 5 | Ramps LR through first 17% of 30 updates | Abrupt initial updates | May spend too much of a short run at low LR |
| max steps | 30 | Fast smoke-test budget | Likely underfits | More learning but needs validation/early stopping |
| DPO beta | 0.1 | Moderate preference pressure | More conservative, weaker preference change | Stronger chosen-vs-rejected separation; greater reward-hacking/overfit risk |

`SFT_EPOCHS` and `DPO_EPOCHS` are declared but not used: `max_steps=30` takes priority. The recorded logs show approximately 30 epochs in Stage 1 (tiny packed dataset), 4 in Stage 2, and 4.33 in Stage 3. Choose **either** `num_train_epochs` or `max_steps` intentionally. For small datasets, validation-based early stopping is safer than a fixed high step count.

## Recorded tuning outcomes

These are observations from the notebook output, not a statistically valid benchmark.

| Stage | Data | Actual run result | Interpretation |
|---|---:|---|---|
| Stage 1 | 32 handbook paragraphs | 30 steps; 101.31 sec; 3.986 GB allocated / 4.057 GB reserved | Low-memory domain adaptation; qualitative output still rambling and not reliably structured |
| Stage 2 | 236 instruction rows | 30 steps; 100.91 sec; 3.387 GB allocated / 3.469 GB reserved | Expected to improve instruction following; no held-out scores were logged |
| Stage 3 | 196 preference pairs | 30 steps; 114.72 sec; 7.279 GB allocated / 8.270 GB reserved; train loss `0.2810` | DPO consumes more memory because it processes prompt/chosen/rejected sequences; saved final model is invalid due to the Cell 22 reload bug |

Training loss alone is not an outcome-quality score. A lower SFT loss means the training text is more predictable; a lower DPO loss means chosen answers are preferred relative to rejected answers. Neither proves factual correctness, lack of hallucination, or performance on unseen handbook questions.

## Add validation data before training

Keep questions out of training. Create `nexora_eval.jsonl` with at least 30–50 representative policy questions and reference answers. Example row:

```json
{"id":"leave-001","question":"How many sick leaves do I get at Nexora per year?","reference":"Full-time employees receive 12 days of Sick Leave per calendar year. ...","keywords":["12","calendar year","medical certificate"]}
```

Make the evaluation set cover leave, attendance, employment type, conduct, benefits, travel, escalation, and out-of-scope questions. Include a refusal/uncertainty expectation where the handbook does not state an answer.

## Code: retain logs and plot loss, learning rate, and gradient norm

The trainer already stores logs in `trainer.state.log_history`. Add this cell **after each `trainer.train()` and before `del trainer`**. It saves a CSV and a separate image for each metric. Gradient norm is only available when the trainer logs `grad_norm`.

```python
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt

def save_training_plots(trainer, stage_name, output_root=OUTPUT_ROOT):
    """Save loss/LR/gradient-norm plots from a TRL Trainer or DPOTrainer."""
    safe_name = stage_name.lower().replace(" ", "_").replace("-", "_")
    metrics_dir = Path(output_root) / "metrics"
    metrics_dir.mkdir(parents=True, exist_ok=True)

    history = pd.DataFrame(trainer.state.log_history)
    history.to_csv(metrics_dir / f"{safe_name}_log_history.csv", index=False)

    def plot_metric(column, title, ylabel, filename):
        if column not in history.columns:
            print(f"{stage_name}: '{column}' was not logged; no {filename} plot created.")
            return
        frame = history.dropna(subset=[column])
        if frame.empty:
            return
        x = frame["step"] if "step" in frame else range(len(frame))
        plt.figure(figsize=(8, 4))
        plt.plot(x, frame[column], marker="o", linewidth=1.5)
        plt.title(f"{stage_name} — {title}")
        plt.xlabel("Training step")
        plt.ylabel(ylabel)
        plt.grid(alpha=0.3)
        plt.tight_layout()
        plt.savefig(metrics_dir / filename, dpi=160)
        plt.show()
        plt.close()

    plot_metric("loss", "Training loss", "Loss", f"{safe_name}_loss.png")
    plot_metric("learning_rate", "Learning rate", "Learning rate", f"{safe_name}_learning_rate.png")
    plot_metric("grad_norm", "Gradient norm", "L2 norm", f"{safe_name}_gradient_norm.png")
    return history

# Example: execute once per stage before deleting its trainer.
stage1_history = save_training_plots(stage1_trainer, "Stage 1")
# stage2_history = save_training_plots(stage2_trainer, "Stage 2")
# stage3_history = save_training_plots(stage3_trainer, "Stage 3")
```

To make gradient norm much more likely to appear, use a current compatible Transformers/TRL combination and set `logging_steps=1`; the notebook already does the latter. It is normal for a short, warmup-based run to show learning rate climbing for 5 steps and then decaying according to the trainer scheduler.

## Code: evaluate the model at each stage

Run the following only after creating the evaluation JSONL. It loads each merged model, generates deterministic answers (`do_sample=False`), scores keyword coverage, stores all answers, and produces a stage comparison graph. Keyword coverage is transparent and useful for policy facts, but manually review answers too.

```python
import json
import re
from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt
from unsloth import FastLanguageModel

EVAL_PATH = "/teamspace/studios/this_studio/data/NexoraAI/Data/nexora_eval.jsonl"
EVAL_OUTPUT = Path(OUTPUT_ROOT) / "evaluation"
EVAL_OUTPUT.mkdir(parents=True, exist_ok=True)

def normalise(text):
    return re.sub(r"\s+", " ", text.lower()).strip()

def generate_deterministic(model, tokenizer, question, max_new_tokens=180):
    FastLanguageModel.for_inference(model)
    prompt = build_instruction_prompt(question)
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
    with torch.inference_mode():
        output = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            repetition_penalty=1.05,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )
    return tokenizer.decode(output[0][inputs["input_ids"].shape[-1]:], skip_special_tokens=True).strip()

def keyword_score(answer, keywords):
    # Score 0–1: fraction of required factual phrases found in the answer.
    answer = normalise(answer)
    return sum(normalise(k) in answer for k in keywords) / max(len(keywords), 1)

def evaluate_stage(stage_name, model_path, cases):
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_path, max_seq_length=MAX_SEQ_LENGTH,
        dtype=None, load_in_4bit=True,
    )
    rows = []
    for case in cases:
        answer = generate_deterministic(model, tokenizer, case["question"])
        rows.append({
            "id": case["id"], "question": case["question"],
            "reference": case["reference"], "answer": answer,
            "keyword_score": keyword_score(answer, case.get("keywords", [])),
        })
    del model
    clear_gpu_memory()
    results = pd.DataFrame(rows)
    results.to_csv(EVAL_OUTPUT / f"{stage_name}_answers.csv", index=False)
    return results

with open(EVAL_PATH, encoding="utf-8") as f:
    eval_cases = [json.loads(line) for line in f if line.strip()]

stages = {
    "Base": BASE_MODEL_NAME,
    "Stage 1 — handbook": STAGE1_MERGED_DIR,
    "Stage 2 — SFT": STAGE2_MERGED_DIR,
    "Stage 3 — DPO": FINAL_MERGED_DIR,  # rerun after fixing Cell 22
}

all_results = {name: evaluate_stage(name, path, eval_cases) for name, path in stages.items()}
summary = pd.DataFrame([
    {"stage": name, "mean_keyword_score": df.keyword_score.mean(),
     "questions": len(df)}
    for name, df in all_results.items()
])
summary.to_csv(EVAL_OUTPUT / "stage_summary.csv", index=False)
display(summary)

plt.figure(figsize=(8, 4))
plt.bar(summary["stage"], summary["mean_keyword_score"], color=["#9aa0a6", "#4e79a7", "#59a14f", "#e15759"])
plt.ylim(0, 1)
plt.ylabel("Mean required-keyword coverage")
plt.title("Held-out Nexora policy evaluation by training stage")
plt.xticks(rotation=15, ha="right")
plt.tight_layout()
plt.savefig(EVAL_OUTPUT / "stage_keyword_comparison.png", dpi=160)
plt.show()
```

## How to interpret the four requested graphs/results

| Signal | Healthy pattern | Warning pattern | What to do |
|---|---|---|---|
| Training loss | Falls then levels off | Explodes/NaN, or continually falls while validation worsens | Lower learning rate; inspect data; use validation/early stopping |
| Learning rate | Gradual warmup then planned decay | Abrupt jump or stays high until final step | Add/extend warmup; use a scheduler; lower peak LR |
| Gradient norm | Finite and broadly stable, with occasional small spikes | Repeated huge spikes, NaN, or near-zero throughout | Lower LR, clip gradients, check bad/truncated examples |
| Held-out stage score | Stage 2 improves answerability; Stage 3 improves chosen style/facts | Stage 3 worsens factual score or answers become canned | Lower beta/steps; improve preference pairs; retain a held-out DPO set |

For this project, the most meaningful outcome table is the held-out one, assessed together with human review. A good review rubric is: factual accuracy, completeness, directness, groundedness in the handbook, safe uncertainty for unknown policies, and absence of invented policy.

## Recommended next run

1. Revoke the exposed Hugging Face token and remove it from the notebook/history.
2. Install a Datasets version compatible with Unsloth.
3. Split SFT and preference data into train/validation sets, and create a separate policy evaluation set.
4. Add the logging/plot cell after each training stage.
5. Fix Cell 22 so it saves the already trained Stage 3 model.
6. Compare Base, Stage 1, Stage 2, and corrected Stage 3 using identical deterministic prompts.
7. Keep the stage with the best held-out factual/human score; do not select a model based solely on training loss.
