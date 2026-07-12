import { SectionHeading } from "@/components/landing/section-heading";

const stack = [
  "Next.js",
  "FastAPI",
  "Qwen",
  "LoRA",
  "DPO",
  "Transformers",
  "Hugging Face",
  "Gradio",
  "Tailwind",
  "Framer Motion",
];

export function Technology() {
  return (
    <section id="technology" className="border-y border-border bg-card/30 px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Technology"
          title="Modern frontend polish over a model stack built for iteration."
          description="The interface is intentionally modular so the product can absorb RAG, file uploads, auth, and model switching without a redesign."
        />
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {stack.map((item) => (
            <span
              key={item}
              className="rounded-full border border-border bg-background/75 px-4 py-2 text-sm text-muted transition hover:border-primary/50 hover:text-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
