"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { subscribeToasts, type ToastItem } from "@/lib/toast";
import { cn } from "@/lib/utils";

const ICONS = { success: CheckCircle2, error: XCircle, info: Info } as const;
const ICON_TONE = { success: "text-positive", error: "text-negative", info: "text-fg-3" } as const;

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const map = timers.current;
    const unsub = subscribeToasts((t) => {
      setItems((prev) => [...prev.slice(-3), t]);
      map.set(
        t.id,
        setTimeout(() => dismiss(t.id), t.duration),
      );
    });
    return () => {
      unsub();
      map.forEach((tm) => clearTimeout(tm));
      map.clear();
    };
  }, []);

  function dismiss(id: number) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    const tm = timers.current.get(id);
    if (tm) clearTimeout(tm);
    timers.current.delete(id);
  }

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
    >
      {items.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-xl border border-line-strong bg-surface p-4 shadow-float",
            )}
          >
            <Icon className={cn("mt-0.5 size-[18px] shrink-0", ICON_TONE[t.kind])} strokeWidth={1.75} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg">{t.title}</p>
              {t.description ? <p className="mt-0.5 break-words text-[13px] text-fg-2">{t.description}</p> : null}
              {t.action ? (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick();
                    dismiss(t.id);
                  }}
                  className="mt-2 text-[13px] font-medium text-accent-ink hover:underline"
                >
                  {t.action.label}
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="-m-1.5 flex size-8 shrink-0 items-center justify-center rounded-md text-fg-3 transition-colors hover:bg-raised hover:text-fg"
              aria-label="Dismiss notification"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
