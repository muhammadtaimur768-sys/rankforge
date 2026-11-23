import Link from "next/link";
import { createElement } from "react";
import { ArrowUpRight, Globe } from "lucide-react";
import { monogram, siteTheme } from "@/lib/site-brand";
import { nicheIcon } from "./niche-icon";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type { PublicSiteSummary } from "@/lib/types";
import { Skeleton } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

export function SiteCard({ site }: { site: PublicSiteSummary }) {
  const theme = siteTheme(site.user_id, site.accent);
  const Icon = nicheIcon(site.niche, site.site_name);
  return (
    <Link
      href={`/site/${encodeURIComponent(site.user_id)}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong"
    >
      <div className="h-1.5" style={{ background: theme.accentStrong }} aria-hidden />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span
            className="flex size-12 items-center justify-center rounded-xl font-serif text-[18px] font-semibold"
            style={{ background: theme.accentStrong, color: theme.onAccent }}
            aria-hidden
          >
            {monogram(site.site_name)}
          </span>
          <span className="flex items-center gap-2 text-fg-3">
            {createElement(Icon, { className: "size-4", strokeWidth: 1.5, "aria-hidden": true })}
            <ArrowUpRight className="size-4 transition-colors duration-150 group-hover:text-fg" aria-hidden />
          </span>
        </div>
        <p className="mt-4 truncate font-serif text-[20px] font-semibold text-fg">{site.site_name}</p>
        <p className="mt-1 line-clamp-2 min-h-10 text-[14px] leading-5 text-fg-2">
          {site.tagline ?? (site.niche ? `Guides to ${site.niche}` : "Independent buying guides")}
        </p>
        {site.niche ? (
          <span className="mt-3 inline-flex h-6 max-w-full items-center self-start truncate rounded-full bg-raised px-2.5 text-[12px] font-medium text-fg-2">
            {site.niche}
          </span>
        ) : null}
        <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-[13px]" style={{ marginTop: "1.25rem" }}>
          <span className="text-fg-2">
            <span className="font-mono tabular text-fg">{site.published}</span> {site.published === 1 ? "guide" : "guides"}
          </span>
          <span className="text-fg-3">
            {site.last_published ? `Latest ${fmtDate(site.last_published, { month: "short", day: "numeric" })}` : "No posts yet"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function SiteGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading sites">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-line bg-surface p-5">
          <Skeleton className="size-10 rounded-xl" />
          <Skeleton className="mt-4 h-5 w-2/3" />
          <Skeleton className="mt-2 h-3.5 w-1/3" />
          <Skeleton className="mt-5 h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Server component. Never throws: the landing page must render even when the API is down. */
export async function SiteGrid({ limit, emptyCta = true }: { limit?: number; emptyCta?: boolean }) {
  let sites: PublicSiteSummary[] | null = null;
  try {
    sites = await api.public.sites();
  } catch {
    sites = null;
  }

  if (sites === null) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-line-strong px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Globe className="mt-0.5 size-5 shrink-0 text-fg-3" strokeWidth={1.5} aria-hidden />
          <div>
            <p className="text-[15px] font-medium text-fg">The site directory is offline right now</p>
            <p className="mt-1 text-sm text-fg-2">Published sites will show here again once the API responds.</p>
          </div>
        </div>
        <ButtonLink href="/blog" variant="secondary" size="sm">
          Open the directory
        </ButtonLink>
      </div>
    );
  }

  const list = [...sites].filter((s) => s.published > 0).sort((a, b) => (b.last_published ?? "").localeCompare(a.last_published ?? ""));
  const shown = limit ? list.slice(0, limit) : list;

  if (!shown.length) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-line-strong px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Globe className="mt-0.5 size-5 shrink-0 text-fg-3" strokeWidth={1.5} aria-hidden />
          <div>
            <p className="text-[15px] font-medium text-fg">No sites have published yet</p>
            <p className="mt-1 text-sm text-fg-2">The first published article puts your site in this list.</p>
          </div>
        </div>
        {emptyCta ? (
          <ButtonLink href="/signup" size="sm">
            Start your site
          </ButtonLink>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((s) => (
        <SiteCard key={s.user_id} site={s} />
      ))}
    </div>
  );
}
