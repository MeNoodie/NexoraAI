type MarkdownContentProps = {
  content: string;
};

export function MarkdownContent({ content }: MarkdownContentProps) {
  const blocks = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.startsWith("```") && block.endsWith("```")) {
          const code = block.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "");
          return (
            <pre
              key={`${block}-${index}`}
              className="overflow-x-auto rounded-2xl border border-border bg-background p-4 text-xs leading-6 text-muted"
            >
              <code>{code}</code>
            </pre>
          );
        }

        return block
          .split("\n")
          .filter(Boolean)
          .map((line, lineIndex) => (
            <p key={`${line}-${lineIndex}`} className="leading-7">
              {line}
            </p>
          ));
      })}
    </div>
  );
}
