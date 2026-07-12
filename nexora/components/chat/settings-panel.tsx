import type { GenerationSettings } from "@/lib/chat";

type SettingsPanelProps = {
  settings: GenerationSettings;
};

export function SettingsPanel({ settings }: SettingsPanelProps) {
  const rows = [
    { label: "Temperature", value: settings.temperature, display: settings.temperature.toFixed(1) },
    { label: "Max Tokens", value: settings.maxTokens / 512, display: String(settings.maxTokens) },
    { label: "Top P", value: settings.topP, display: settings.topP.toFixed(1) },
  ];

  return (
    <aside className="hidden w-72 shrink-0 border-l border-border bg-background/72 p-5 xl:block">
      <div className="sticky top-20">
        <p className="font-display text-sm font-semibold text-foreground">
          Generation Settings
        </p>
        <p className="mt-2 text-xs leading-5 text-muted">
          Visual controls are ready for backend wiring.
        </p>
        <div className="mt-6 space-y-6">
          {rows.map((row) => (
            <div key={row.label}>
              <div className="mb-2 flex items-center justify-between text-xs text-muted">
                <span>{row.label}</span>
                <span>{row.display}</span>
              </div>
              <div className="h-2 rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(row.value * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
