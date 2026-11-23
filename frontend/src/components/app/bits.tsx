import { CheckCircle2, CircleDashed, CircleHelp, XCircle } from "lucide-react";
import type { ArticleStatus } from "@/lib/types";
import { Badge, type Tone } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: ArticleStatus }) {
  return status === "published" ? (
    <Badge tone="positive" dot>
      Published
    </Badge>
  ) : (
    <Badge tone="neutral" dot>
      Draft
    </Badge>
  );
}

const INTENT_TONE: Record<string, Tone> = {
  informational: "info",
  commercial: "accent",
  transactional: "positive",
  navigational: "neutral",
};

export function IntentBadge({ intent }: { intent: string }) {
  const key = intent.toLowerCase();
  const tone = INTENT_TONE[key] ?? "neutral";
  return <Badge tone={tone}>{key.charAt(0).toUpperCase() + key.slice(1)}</Badge>;
}

/** Normalise 0–1 or 0–100 scores to 0–100. */
export function toPercentScale(v: number, max: number) {
  if (max <= 1.0001) return Math.round(v * 100);
  return Math.round(v);
}

export function ScoreBar({
  value,
  label,
  tone = "neutral",
  className,
}: {
  value: number;
  label?: string;
  tone?: "neutral" | "accent" | "difficulty";
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const fill =
    tone === "accent"
      ? "bg-accent"
      : tone === "difficulty"
        ? v >= 70
          ? "bg-negative"
          : v >= 40
            ? "bg-warning"
            : "bg-positive"
        : "bg-fg-3";
  const word = tone === "difficulty" ? (v >= 70 ? "Hard" : v >= 40 ? "Medium" : "Easy") : null;
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className="relative h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-raised"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-label={label}
      >
        <span className={cn("absolute inset-y-0 left-0 rounded-full", fill)} style={{ width: `${v}%` }} />
      </span>
      <span className="w-7 text-right font-mono text-[12px] tabular text-fg">{v}</span>
      {word ? <span className="hidden text-[12px] text-fg-3 xl:inline">{word}</span> : null}
    </div>
  );
}

export function FactStatus({ status }: { status: string }) {
  const s = status.toLowerCase();
  const ok = ["verified", "supported", "true", "pass", "passed", "ok", "confirmed", "accurate"].includes(s);
  const bad = ["false", "refuted", "disputed", "fail", "failed", "incorrect", "contradicted", "inaccurate"].includes(s);
  const Icon = ok ? CheckCircle2 : bad ? XCircle : s === "pending" ? CircleDashed : CircleHelp;
  const tone: Tone = ok ? "positive" : bad ? "negative" : "warning";
  const label = s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unverified";
  return (
    <Badge tone={tone} className="gap-1">
      <Icon className="size-3.5" aria-hidden />
      {label}
    </Badge>
  );
}

export function RankBadge({ position }: { position: number | null }) {
  if (position === null || position <= 0)
    return (
      <Badge tone="neutral" title="Not found in the checked results">
        Not ranked
      </Badge>
    );
  const tone: Tone = position <= 3 ? "positive" : position <= 10 ? "info" : "neutral";
  return (
    <Badge tone={tone} className="font-mono">
      #{position}
    </Badge>
  );
}
