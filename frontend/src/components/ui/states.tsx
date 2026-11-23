import type { ReactNode } from "react";
import { AlertTriangle, RotateCcw, WifiOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {Icon ? (
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-line bg-raised text-fg-3">
          <Icon className="size-5" strokeWidth={1.5} aria-hidden />
        </div>
      ) : null}
      <p className="text-[15px] font-medium text-fg">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-fg-2">{description}</p> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Couldn't load this",
  error,
  onRetry,
  retrying,
  className,
  compact,
}: {
  title?: ReactNode;
  error?: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : null;
  const kind = (error as { kind?: string } | null)?.kind;
  const offline = kind === "network" || kind === "timeout";
  const Icon = offline ? WifiOff : AlertTriangle;
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center text-center",
        compact ? "px-4 py-8" : "px-6 py-12",
        className,
      )}
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-negative-soft text-negative">
        <Icon className="size-5" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="text-[15px] font-medium text-fg">{title}</p>
      {message ? <p className="mt-1.5 max-w-md text-sm text-fg-2">{message}</p> : null}
      {offline ? (
        <p className="mt-1 max-w-md text-[13px] text-fg-3">Check that the backend is running and NEXT_PUBLIC_API_URL points at it.</p>
      ) : null}
      {onRetry ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-5"
          onClick={onRetry}
          loading={retrying}
          icon={<RotateCcw className="size-3.5" aria-hidden />}
        >
          Try again
        </Button>
      ) : null}
    </div>
  );
}
