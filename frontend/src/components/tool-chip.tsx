"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { stageIndex, toolMeta } from "@/lib/tools";
import type { ToolCall } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Compact chip: icon + friendly label + mono stage index (the RankForge signature). */
export function ToolChipFace({ name, className }: { name: string; className?: string }) {
  const meta = toolMeta(name);
  const Icon = meta.icon;
  const idx = stageIndex(meta.stage);
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-[12px] text-fg-2",
        className,
      )}
    >
      <Icon className="size-3.5 text-fg-3" strokeWidth={1.75} aria-hidden />
      <span className="font-medium text-fg">{meta.label}</span>
      {idx ? (
        <span className="font-mono text-[11px] text-fg-3" aria-label={`stage ${meta.stage}`}>
          {idx}
        </span>
      ) : null}
    </span>
  );
}

function summarizeArgs(args: Record<string, unknown>): string | null {
  const preferred = ["keyword", "seed", "title", "query", "anchor", "article_id", "slug", "domain"];
  for (const k of preferred) {
    const v = args[k];
    if (typeof v === "string" && v) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}

/** Expandable list of tool calls shown under an assistant message. */
export function ToolCallList({ calls, className }: { calls: ToolCall[]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();
  if (!calls.length) return null;
  return (
    <div className={cn("space-y-2", className)}>
      <ul className="flex flex-wrap gap-1.5" aria-label="Tools the agent used">
        {calls.map((c, i) => {
          const meta = toolMeta(c.name);
          const Icon = meta.icon;
          const idx = stageIndex(meta.stage);
          const summary = summarizeArgs(c.args);
          const expanded = open === i;
          return (
            <li key={`${c.name}-${i}`}>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : i)}
                aria-expanded={expanded}
                aria-controls={`${baseId}-${i}`}
                title={c.name}
                className={cn(
                  "inline-flex h-7 max-w-[18rem] items-center gap-1.5 rounded-lg border px-2 text-[12px] transition-colors duration-150",
                  expanded
                    ? "border-line-strong bg-raised text-fg"
                    : "border-line bg-surface text-fg-2 hover:border-line-strong hover:text-fg",
                )}
              >
                <Icon className="size-3.5 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden />
                <span className="shrink-0 font-medium text-fg">{meta.label}</span>
                {summary ? <span className="truncate text-fg-3">{summary}</span> : null}
                {idx ? <span className="shrink-0 font-mono text-[11px] text-fg-3">{idx}</span> : null}
                <ChevronDown
                  className={cn("size-3 shrink-0 text-fg-3 transition-transform duration-150", expanded && "rotate-180")}
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ul>
      {calls.map((c, i) =>
        open === i ? (
          <div
            key={`panel-${i}`}
            id={`${baseId}-${i}`}
            className="animate-fade overflow-hidden rounded-xl border border-line bg-sunken"
          >
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <code className="font-mono text-[12px] text-fg-2">{c.name}</code>
              <span className="text-[11px] text-fg-3">arguments</span>
            </div>
            <pre className="scrollbar-thin max-h-72 overflow-auto p-3 font-mono text-[12px] leading-5 text-fg-2">
              {JSON.stringify(c.args, null, 2)}
            </pre>
          </div>
        ) : null,
      )}
    </div>
  );
}
