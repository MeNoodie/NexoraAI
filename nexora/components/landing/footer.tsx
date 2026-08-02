import { Bot, Github, Linkedin, Mail } from "lucide-react";

const links = [
  { href: "https://github.com/MeNoodie/NexoraAI", label: "GitHub", icon: Github },
  { href: "https://linkedin.com", label: "LinkedIn", icon: Linkedin },
  { href: "mailto:hello@nexora.ai", label: "Email", icon: Mail },
];

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl border border-border bg-card">
            <Bot className="size-4 text-accent" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display font-semibold text-foreground">Nexora AI</p>
            <p className="text-sm text-muted">Enterprise HR policy intelligence.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.href}
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-muted transition hover:border-primary/50 hover:text-foreground"
              >
                <Icon className="size-4" aria-hidden="true" />
                {link.label}
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
