import Link from "next/link";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import type { Pick } from "@/lib/article-md";
import { fmtDate, readMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Cover } from "./cover";
import { categoryFor } from "./niche-icon";
import { siteHref } from "./site-chrome";

export function CategoryChip({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full bg-accent-soft px-2.5 text-[12px] font-semibold text-accent-ink",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function Meta({ words, date, className }: { words?: number; date?: string | null; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 text-[13px] text-fg-3", className)}>
      {words ? <span>{readMinutes(words)} min read</span> : null}
      {words && date ? <span aria-hidden>·</span> : null}
      {date ? <time dateTime={date}>{fmtDate(date)}</time> : null}
    </p>
  );
}

export interface CardArticle {
  title: string;
  slug: string;
  meta_description: string;
  keyword?: string;
  word_count?: number;
  published_at: string | null;
}

export function ArticleCard({
  a,
  userId,
  hue,
  niche,
  headingLevel = "h3",
}: {
  a: CardArticle;
  userId: string;
  hue: number;
  niche: string | null;
  headingLevel?: "h2" | "h3";
}) {
  const H = headingLevel;
  const href = siteHref(userId, `/${encodeURIComponent(a.slug)}`);
  return (
    <article className="group relative flex flex-col">
      <Cover
        seed={a.slug}
        hue={hue}
        keyword={a.keyword}
        title={a.title}
        niche={niche}
        className="aspect-[16/9] rounded-xl ring-1 ring-line"
      />
      <div className="mt-4 flex flex-1 flex-col">
        <CategoryChip label={categoryFor(a.keyword, a.title, niche)} className="self-start" />
        <H className="mt-3 font-display text-[21px] font-medium leading-snug text-fg">
          <Link href={href} className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
            {a.title}
          </Link>
        </H>
        {a.meta_description ? <p className="mt-2 line-clamp-3 text-[15px] leading-6 text-fg-2">{a.meta_description}</p> : null}
        <Meta words={a.word_count} date={a.published_at} className="mt-auto pt-4" />
      </div>
    </article>
  );
}

export function FeaturedCard({ a, userId, hue, niche }: { a: CardArticle; userId: string; hue: number; niche: string | null }) {
  const href = siteHref(userId, `/${encodeURIComponent(a.slug)}`);
  return (
    <article className="group relative grid overflow-hidden rounded-2xl border border-line bg-surface md:grid-cols-[1.25fr_1fr]">
      <Cover seed={a.slug} hue={hue} keyword={a.keyword} title={a.title} niche={niche} size="hero" className="aspect-[16/10] md:aspect-auto md:min-h-[360px]" />
      <div className="flex flex-col justify-center p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-fg-3">Latest guide</span>
          <CategoryChip label={categoryFor(a.keyword, a.title, niche)} />
        </div>
        <h2 className="mt-4 font-display text-[28px] font-medium leading-[1.15] tracking-[-0.01em] text-fg sm:text-[34px]">
          <Link href={href} className="after:absolute after:inset-0 group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
            {a.title}
          </Link>
        </h2>
        {a.meta_description ? <p className="mt-4 text-[16px] leading-7 text-fg-2">{a.meta_description}</p> : null}
        <div className="mt-6 flex items-center justify-between gap-4">
          <Meta words={a.word_count} date={a.published_at} />
          <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-accent-ink">
            Read guide <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </div>
      </div>
    </article>
  );
}

/** "Top picks" product box built from the article's tracked affiliate links. */
export function TopPicks({ picks, variant = "top", title }: { picks: Pick[]; variant?: "top" | "bottom"; title?: string }) {
  if (!picks.length) return null;
  const heading = title ?? (variant === "top" ? "Our top picks" : "Where to buy");
  return (
    <aside
      aria-label={heading}
      className={cn(
        "not-prose my-10 overflow-hidden rounded-2xl border bg-surface",
        variant === "top" ? "border-line-strong" : "border-line",
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line bg-accent-soft px-5 py-3.5">
        <p className="flex items-center gap-2 font-display text-[18px] font-medium text-fg">
          <ShoppingBag className="size-4 text-accent-ink" strokeWidth={1.75} aria-hidden />
          {heading}
        </p>
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-fg-3">Affiliate links</span>
      </div>
      <ol className="divide-y divide-line">
        {picks.map((p, i) => (
          <li key={p.href + i} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-5">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line-strong font-display text-[17px] font-medium text-fg"
              aria-hidden
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold leading-6 text-fg">{p.name}</p>
              {p.blurb && variant === "top" ? <p className="mt-0.5 text-[14px] leading-6 text-fg-2">{p.blurb}</p> : null}
            </div>
            <a
              href={p.href}
              target="_blank"
              rel="sponsored nofollow noopener"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-accent px-5 text-[14px] font-semibold text-on-accent shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] sm:h-10"
            >
              Check price
              <ArrowUpRight className="size-4" aria-hidden />
              <span className="sr-only">for {p.name} (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}
