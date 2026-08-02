import { Bot, Github } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

const navItems = [
  { href: "#features", label: "Features" },
  { href: "#workflow", label: "Workflow" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/78 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#" className="focus-ring flex items-center gap-3 rounded-full">
          <span className="grid size-9 place-items-center rounded-xl border border-border bg-card">
            <Bot className="size-4 text-accent" aria-hidden="true" />
          </span>
          <span className="font-display text-base font-semibold tracking-normal">
            Nexora AI
          </span>
        </a>
        <div className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="focus-ring rounded-full text-sm text-muted transition hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink
            href="https://github.com"
            variant="ghost"
            size="icon"
            aria-label="Open GitHub"
            className="hidden sm:inline-flex"
          >
            <Github className="size-4" />
          </ButtonLink>
          <ButtonLink href="/chat" size="sm">
            Open app
          </ButtonLink>
        </div>
      </nav>
    </header>
  );
}
