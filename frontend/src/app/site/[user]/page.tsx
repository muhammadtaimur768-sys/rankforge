import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight, BadgeCheck, ShieldCheck, Users, WifiOff } from "lucide-react";
import { Cover } from "@/components/public/cover";
import { NewsletterForm } from "@/components/public/site-client";
import { ArticleCard, FeaturedCard } from "@/components/public/site-parts";
import { identityOf, SiteShell, SiteShellBare, siteHref } from "@/components/public/site-chrome";
import { Skeleton } from "@/components/ui/primitives";
import { SITE_URL } from "@/lib/config";
import { fmtDate, fmtNum } from "@/lib/format";
import { getPublicSite } from "@/lib/public-data";
import { siteTheme } from "@/lib/site-brand";

export async function generateMetadata({ params }: PageProps<"/site/[user]">): Promise<Metadata> {
  const { user } = await params;
  const userId = decodeURIComponent(user);
  const res = await getPublicSite(userId);
  if (!res.ok) return { title: res.notFound ? "Site not found" : userId };
  const site = res.data;
  const description =
    site.tagline ?? (site.niche ? `Fact-checked guides to ${site.niche} from ${site.site_name}.` : `Guides from ${site.site_name}.`);
  return {
    title: { absolute: site.tagline ? `${site.site_name} — ${site.tagline}` : site.site_name },
    description,
    alternates: { canonical: siteHref(userId) },
    openGraph: { type: "website", title: site.site_name, description, siteName: site.site_name, url: siteHref(userId) },
  };
}

function HomeSkeleton() {
  return (
    <SiteShellBare>
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6" role="status" aria-label="Loading site">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="mt-4 h-5 w-1/2" />
        <Skeleton className="mt-12 h-[360px] w-full rounded-2xl" />
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[16/9] rounded-xl" />
              <Skeleton className="mt-4 h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </SiteShellBare>
  );
}

async function SiteHome({ params }: { params: PageProps<"/site/[user]">["params"] }) {
  const { user } = await params;
  const userId = decodeURIComponent(user);
  const res = await getPublicSite(userId);

  if (!res.ok) {
    if (res.notFound) notFound();
    return (
      <SiteShellBare>
        <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
          <WifiOff className="mx-auto size-6 text-fg-3" strokeWidth={1.5} aria-hidden />
          <h1 className="mt-4 font-display text-[26px] text-fg">This site couldn&apos;t be loaded</h1>
          <p className="mt-2 text-[15px] text-fg-2">The content server didn&apos;t respond. Try again in a minute.</p>
        </div>
      </SiteShellBare>
    );
  }

  const site = res.data;
  const id = identityOf(site);
  const theme = siteTheme(site.user_id, site.accent);
  const articles = [...site.articles].sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
  const [lead, ...rest] = articles;
  const popular = (
    site.popular.length
      ? site.popular
      : [...articles]
          .filter((a) => a.views !== null)
          .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
          .map((a) => ({ title: a.title, slug: a.slug, views: a.views }))
  ).slice(0, 3);
  const popularList = popular.length ? popular : articles.slice(0, 3).map((a) => ({ title: a.title, slug: a.slug, views: null }));
  const bySlug = new Map(articles.map((a) => [a.slug, a]));
  const latestDate = articles[0]?.published_at ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.site_name,
    description: site.tagline ?? site.niche ?? undefined,
    url: `${SITE_URL}${siteHref(site.user_id)}`,
  };

  return (
    <SiteShell id={id}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-12 pt-12 sm:px-6 md:pt-16 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            {site.niche ? (
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-accent-ink">{site.niche}</p>
            ) : null}
            <h1 className="mt-4 font-display text-[38px] font-medium leading-[1.06] tracking-[-0.02em] text-fg sm:text-[52px] lg:text-[60px]">
              {site.tagline ?? site.site_name}
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-7 text-fg-2">
              {site.audience
                ? `Written for ${site.audience.replace(/^for\s+/i, "")}.`
                : `Independent buying guides${site.niche ? ` for ${site.niche}` : ""}, with every claim checked against sources.`}
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-4 border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
            <div>
              <dt className="text-[12px] text-fg-3">Guides</dt>
              <dd className="mt-1 font-display text-[28px] text-fg">{fmtNum(articles.length)}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-fg-3">Updated</dt>
              <dd className="mt-2 text-[15px] font-medium text-fg">{latestDate ? fmtDate(latestDate, { month: "short", day: "numeric" }) : "—"}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-fg-3">Claims</dt>
              <dd className="mt-2 flex items-center gap-1 text-[15px] font-medium text-fg">
                <BadgeCheck className="size-4 text-accent-ink" aria-hidden /> Checked
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {!articles.length ? (
          <div className="py-24 text-center">
            <p className="font-display text-[24px] text-fg">The first guide is on its way</p>
            <p className="mt-2 text-[15px] text-fg-2">Subscribe below and we&apos;ll email you when it&apos;s published.</p>
            <div className="mx-auto mt-8 max-w-md text-left">
              <NewsletterForm siteName={site.site_name} niche={site.niche} />
            </div>
          </div>
        ) : (
          <>
            {lead ? (
              <div className="pt-10">
                <FeaturedCard a={lead} userId={site.user_id} hue={theme.hue} niche={site.niche} />
              </div>
            ) : null}

            <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
              <section id="guides" aria-labelledby="guides-title" className="scroll-mt-24">
                <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
                  <h2 id="guides-title" className="font-display text-[26px] font-medium text-fg">
                    All guides
                  </h2>
                  <span className="text-[13px] text-fg-3">{articles.length} published</span>
                </div>
                {rest.length ? (
                  <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2">
                    {rest.map((a) => (
                      <ArticleCard key={a.slug} a={a} userId={site.user_id} hue={theme.hue} niche={site.niche} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-8 text-[15px] text-fg-2">More guides are on the way. The latest one is featured above.</p>
                )}
              </section>

              <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start" aria-label="Sidebar">
                <section aria-labelledby="popular-title">
                  <h2 id="popular-title" className="border-b border-line pb-3 font-display text-[22px] font-medium text-fg">
                    Most popular
                  </h2>
                  <ol className="mt-2 divide-y divide-line">
                    {popularList.map((p, i) => {
                      const full = bySlug.get(p.slug);
                      return (
                        <li key={p.slug}>
                          <Link href={siteHref(site.user_id, `/${encodeURIComponent(p.slug)}`)} className="group flex gap-4 py-4">
                            <span className="w-6 shrink-0 font-display text-[30px] leading-none text-accent-ink" aria-hidden>
                              {i + 1}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[15px] font-semibold leading-snug text-fg group-hover:underline group-hover:underline-offset-4">
                                {p.title}
                              </span>
                              <span className="mt-1 block text-[12px] text-fg-3">
                                {p.views !== null ? `${fmtNum(p.views)} reads` : full?.published_at ? fmtDate(full.published_at) : "Guide"}
                              </span>
                            </span>
                            <Cover
                              seed={p.slug}
                              hue={theme.hue}
                              keyword={full?.keyword}
                              title={p.title}
                              niche={site.niche}
                              size="thumb"
                              className="size-16 shrink-0 rounded-lg"
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </section>
                <NewsletterForm siteName={site.site_name} niche={site.niche} />
              </aside>
            </div>
          </>
        )}

        {/* About */}
        <section id="about" aria-labelledby="about-title" className="mt-24 scroll-mt-24 rounded-3xl border border-line bg-surface p-6 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-accent-ink">About {site.site_name}</p>
              <h2 id="about-title" className="mt-3 font-display text-[30px] font-medium leading-tight text-fg">
                Advice you can check
              </h2>
              <p className="mt-4 font-serif text-[18px] leading-8 text-fg-2">
                {site.about ??
                  `${site.site_name} publishes practical guides${site.niche ? ` to ${site.niche}` : ""}. We focus on what actually matters when you buy, explain the trade-offs plainly, and check every factual claim against sources before a guide goes live.`}
              </p>
              <Link
                href={siteHref(site.user_id, "/about")}
                className="mt-6 inline-flex h-10 items-center gap-1.5 text-[14px] font-semibold text-accent-ink hover:underline"
              >
                More about us <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <ul className="space-y-5">
              {site.audience ? (
                <li className="flex gap-3">
                  <Users className="mt-0.5 size-5 shrink-0 text-accent-ink" strokeWidth={1.75} aria-hidden />
                  <div>
                    <p className="text-[15px] font-semibold text-fg">Who it&apos;s for</p>
                    <p className="mt-1 text-[14px] leading-6 text-fg-2">{site.audience}</p>
                  </div>
                </li>
              ) : null}
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent-ink" strokeWidth={1.75} aria-hidden />
                <div>
                  <p className="text-[15px] font-semibold text-fg">Fact-checked</p>
                  <p className="mt-1 text-[14px] leading-6 text-fg-2">Specs, prices and claims are checked against sources before publishing.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <BadgeCheck className="mt-0.5 size-5 shrink-0 text-accent-ink" strokeWidth={1.75} aria-hidden />
                <div>
                  <p className="text-[15px] font-semibold text-fg">Reader-supported</p>
                  <p className="mt-1 text-[14px] leading-6 text-fg-2">
                    We may earn a commission when you buy through our links. It never changes what we recommend.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}

export default function SitePage({ params }: PageProps<"/site/[user]">) {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <SiteHome params={params} />
    </Suspense>
  );
}
