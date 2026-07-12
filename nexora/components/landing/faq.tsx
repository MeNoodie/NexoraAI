import { SectionHeading } from "@/components/landing/section-heading";

const faqs = [
  {
    question: "Is Nexora AI only for HR policies?",
    answer:
      "The current product is optimized for HR policy intelligence, but the component architecture leaves room for onboarding, IT support, and internal knowledge workflows.",
  },
  {
    question: "Does the chat support future RAG workflows?",
    answer:
      "Yes. The frontend separates chat state, settings, history, and message rendering so retrieval-backed responses can be added without redesigning the UI.",
  },
  {
    question: "Can this connect to the Gradio backend?",
    answer:
      "The chat page is structured around a single send action and can be wired to the existing Nexora model endpoint when the API contract is ready.",
  },
  {
    question: "Why Qwen2.5 3B?",
    answer:
      "It is compact enough for practical deployment while still offering strong instruction-following behavior after fine-tuning.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <SectionHeading
          eyebrow="FAQ"
          title="Built with the next product milestones in mind."
          description="The first version looks complete, but the system has room for the features teams usually ask for next."
        />
        <div className="mt-12 space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-2xl border border-border bg-card/65 p-5 open:bg-card"
            >
              <summary className="focus-ring cursor-pointer list-none rounded-lg font-medium text-foreground">
                <span className="flex items-center justify-between gap-4">
                  {faq.question}
                  <span className="text-muted transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-4 text-sm leading-6 text-muted">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
