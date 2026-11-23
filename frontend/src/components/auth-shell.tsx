import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { STAGES } from "@/lib/tools";

export function AuthShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,0.9fr)]">
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <main id="main" className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm animate-rise">
            <h1 className="text-[28px] font-medium leading-tight tracking-[-0.02em] text-fg">{title}</h1>
            <p className="mt-2 text-[15px] text-fg-2">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
        </main>
      </div>
      <aside className="hidden border-l border-line bg-sunken lg:flex lg:flex-col lg:justify-center lg:px-14" aria-label="What happens next">
        <div className="max-w-md">
          <p className="font-mono text-[12px] text-accent-ink">What the agent does for you</p>
          <ol className="mt-6 space-y-0">
            {STAGES.map((s, i) => (
              <li key={s.name} className="relative flex gap-4 pb-6 last:pb-0">
                {i < STAGES.length - 1 ? (
                  <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-line-strong" aria-hidden />
                ) : null}
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface font-mono text-[12px] text-fg-2">
                  {s.index}
                </span>
                <div className="pt-1">
                  <p className="text-[15px] font-medium text-fg">{s.name}</p>
                  <p className="mt-0.5 text-[13px] text-fg-2">{STAGE_COPY[s.name]}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}

const STAGE_COPY: Record<string, string> = {
  Research: "Keywords with intent, difficulty and opportunity",
  Write: "A full draft with title, slug and meta description",
  "Fact-check": "Each claim checked against sources",
  Link: "Affiliate links with per-link click tracking",
  Publish: "Live on your free hosted site",
  Track: "Views, clicks and rank positions",
};
