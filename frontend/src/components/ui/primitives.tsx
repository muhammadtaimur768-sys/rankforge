import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ---------- form controls ---------- */

const fieldBase =
  "w-full rounded-[10px] border border-line-strong bg-surface px-3 text-[15px] text-fg placeholder:text-fg-3 " +
  "transition-[border-color,box-shadow] duration-150 ease-out-rf " +
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 focus-visible:outline-none " +
  "disabled:opacity-50 aria-[invalid=true]:border-negative aria-[invalid=true]:focus:ring-negative/20";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(fieldBase, "h-11", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(fieldBase, "py-2.5 leading-6", className)} {...props} />;
});

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-[13px] font-medium text-fg", className)} {...props} />;
}

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-[13px] text-negative">
      {children}
    </p>
  );
}

/* ---------- surfaces ---------- */

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-line bg-surface shadow-sm", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
  as: As = "h2",
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  as?: "h2" | "h3";
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="min-w-0">
        <As className="text-[15px] font-medium text-fg">{title}</As>
        {description ? <p className="mt-1 text-[13px] text-fg-3">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/* ---------- badges ---------- */

export type Tone = "neutral" | "accent" | "positive" | "negative" | "warning" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-raised text-fg-2",
  accent: "bg-accent-soft text-accent-ink",
  positive: "bg-positive-soft text-positive",
  negative: "bg-negative-soft text-negative",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
};

export function Badge({
  tone = "neutral",
  dot,
  className,
  children,
  ...props
}: ComponentProps<"span"> & { tone?: Tone; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-[12px] font-medium leading-none",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line-strong bg-surface px-1 font-mono text-[11px] text-fg-2 shadow-[inset_0_-1px_0_var(--line-strong)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/* ---------- loading ---------- */

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden className={cn("animate-shimmer rounded-md bg-raised", className)} {...props} />;
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

/* ---------- tables ---------- */

export function TableWrap({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("scrollbar-thin w-full overflow-x-auto", className)} {...props} />;
}

export function Table({ className, ...props }: ComponentProps<"table">) {
  return <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />;
}

export function Th({ className, align, ...props }: ComponentProps<"th"> & { align?: "left" | "right" | "center" }) {
  return (
    <th
      scope="col"
      className={cn(
        "h-10 whitespace-nowrap border-b border-line px-4 text-[12px] font-medium text-fg-3 first:pl-5 last:pr-5",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, align, ...props }: ComponentProps<"td"> & { align?: "left" | "right" | "center" }) {
  return (
    <td
      className={cn(
        "h-12 border-b border-line px-4 align-middle text-fg-2 first:pl-5 last:pr-5",
        align === "right" && "text-right tabular",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("transition-colors duration-150 hover:bg-raised/50 [&:last-child>td]:border-b-0", className)} {...props} />;
}

/* ---------- page header ---------- */

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-[26px] font-medium leading-tight text-fg sm:text-[28px]">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-fg-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ---------- KPI tile ---------- */

export function StatTile({
  label,
  value,
  hint,
  emphasis,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-5 shadow-sm", className)}>
      <p className="text-[13px] text-fg-3">{label}</p>
      <p
        className={cn(
          "mt-3 font-mono text-[26px] font-medium leading-none tabular sm:text-[28px]",
          emphasis ? "text-accent-ink" : "text-fg",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-[12px] text-fg-3">{hint}</p> : null}
    </div>
  );
}

export function StatTileSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-7 w-24" />
    </div>
  );
}
