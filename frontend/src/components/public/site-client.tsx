"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Link2, Mail } from "lucide-react";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

/* ---------- newsletter (UI only) ---------- */

export function NewsletterForm({
  siteName,
  niche,
  variant = "card",
}: {
  siteName: string;
  niche?: string | null;
  variant?: "card" | "band";
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const id = `nl-${variant}`;

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    setError(null);
    setDone(true);
    setEmail("");
    toast.success("Thanks — you're on the list", `We'll send new ${siteName} guides to your inbox.`);
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-line",
        variant === "band" ? "bg-surface p-6 sm:p-8" : "bg-surface p-6",
      )}
    >
      <div>
        <div className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
          <Mail className="size-5" strokeWidth={1.75} aria-hidden />
        </div>
        <p className="mt-4 font-display text-[22px] font-medium leading-tight text-fg">Get the next guide first</p>
        <p className="mt-2 text-[14px] leading-6 text-fg-2">
          One email when we publish something new{niche ? ` about ${niche}` : ""}. No spam, unsubscribe anytime.
        </p>
      </div>
      <form onSubmit={submit} noValidate className="mt-5">
        <label htmlFor={id} className="sr-only">
          Email address
        </label>
        <div className={cn("flex gap-2", variant === "card" ? "flex-col" : "flex-col sm:flex-row")}>
          <input
            id={id}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className="h-11 min-w-0 flex-1 rounded-[10px] border border-line-strong bg-bg px-3 text-[15px] text-fg placeholder:text-fg-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-accent px-5 text-[14px] font-semibold text-on-accent transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
          >
            {done ? <Check className="size-4" aria-hidden /> : null}
            {done ? "Subscribed" : "Subscribe"}
          </button>
        </div>
        {error ? (
          <p id={`${id}-error`} role="alert" className="mt-2 text-[13px] text-negative">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}

/* ---------- share ---------- */

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="currentColor">
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07" />
    </svg>
  );
}

export function ShareButtons({ url, title, className }: { url: string; title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const btn =
    "inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface text-fg-2 transition-colors hover:border-line-strong hover:text-fg";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="sr-only">Share this article</span>
      <button
        type="button"
        className={btn}
        aria-label={copied ? "Link copied" : "Copy link"}
        title="Copy link"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(window.location.href || url);
            setCopied(true);
            toast.success("Link copied");
            setTimeout(() => setCopied(false), 1600);
          } catch {
            toast.error("Couldn't copy the link", url);
          }
        }}
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
      </button>
      <a
        className={btn}
        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        title="Share on X"
      >
        <XIcon />
      </a>
      <a
        className={btn}
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        title="Share on Facebook"
      >
        <FacebookIcon />
      </a>
    </div>
  );
}

/* ---------- table of contents with scroll-spy ---------- */

export function TableOfContents({ items, className }: { items: { id: string; title: string }[]; className?: string }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((x): x is HTMLElement => !!x);
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);

  if (!items.length) return null;
  return (
    <nav aria-label="On this page" className={className}>
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-fg-3">On this page</p>
      <ol className="mt-3 space-y-0.5 border-l border-line">
        {items.map((i) => {
          const on = active === i.id;
          return (
            <li key={i.id}>
              <a
                href={`#${i.id}`}
                aria-current={on ? "location" : undefined}
                className={cn(
                  "-ml-px block border-l-2 py-1.5 pl-3 text-[13px] leading-5 transition-colors",
                  on ? "border-accent-ink font-medium text-fg" : "border-transparent text-fg-2 hover:text-fg",
                )}
              >
                {i.title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
