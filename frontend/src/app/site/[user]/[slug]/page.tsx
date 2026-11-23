import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronDown, ChevronRight, Info, WifiOff } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { Cover } from "@/components/public/cover";
import { categoryFor } from "@/components/public/niche-icon";
import { identityOf, Monogram, SiteShell, SiteShellBare, siteHref } from "@/components/public/site-chrome";
import { NewsletterForm, ShareButtons, TableOfContents } from "@/components/public/site-client";
import { ArticleCard, CategoryChip, TopPicks } from "@/components/public/site-parts";
import { Skeleton } from "@/components/ui/primitives";
import { buildPicks, parseArticle, plain } from "@/lib/article-md";
import { SITE_URL } from "@/lib/config";
import { fmtDate, readMinutes } from "@/lib/format";
import { getPublicArticle } from "@/lib/public-data";
import { siteTheme } from "@/lib/site-brand";

type Params = PageProps<"/site/[user]/[slug]">["params"];

async function resolve(params: Params) {
  const { user, slug } = await params;
  return { userId: decodeURIComponent(user), slug: decodeURIComponent(slug) };
}

export async function generateMetadata({ params }: PageProps<"/site/[user]/[slug]">): Promise<Metadata> {
  const { userId, slug } = await resolve(params);
  const res = await getPublicArticle(userId, slug);
  if (!res.ok) return { title: res.notFound ? "Article not found" : "Article" };
  const a = res.data;
  const path = siteHref(a.user_id, `/${encodeURIComponent(a.slug)}`);
  return {
    title: { absolute: `${a.title} · ${a.site_name}` },
    description: a.meta_description || undefined,
    keywords: a.keyword ? [a.keyword] : undefined,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: a.title,
      description: a.meta_description || undefined,
      siteName: a.site_name,
      url: path,
      publishedTime: a.published_at ?? undefined,
    },
    twitter: { card: "summary", title: a.title, description: a.meta_description || undefined },
  };
}

function ArticleSkeleton() {
  return (
    <SiteShellBare>
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6" role="status" aria-label="Loading article">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-6 h-6 w-24 rounded-full" />
        <Skeleton className="mt-5 h-12 w-full" />
        <Skeleton className="mt-3 h-12 w-3/4" />
        <Skeleton className="mt-6 h-5 w-2/3" />
        <Skeleton className="mt-10 aspect-[21/9] w-full rounded-2xl" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4" style={{ width: `${94 - (i % 3) * 8}%` }} />
          ))}
        </div>
      </div>
    </SiteShellBare>
  );
}

async function ArticleContent({ params }: { params: Params }) {
  const { userId, slug } = await resolve(params);
  const res = await getPublicArticle(userId, slug);

  if (!res.ok) {
    if (res.notFound) notFound();
    return (
      <SiteShellBare>
        <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
          <WifiOff className="mx-auto size-6 text-fg-3" strokeWidth={1.5} aria-hidden />
          <h1 className="mt-4 font-display text-[26px] text-fg">This article couldn&apos;t be loaded</h1>
          <p className="mt-2 text-[15px] text-fg-2">The content server didn&apos;t respond. Try again in a minute.</p>
        </div>
      </SiteShellBare>
    );
  }

  const a = res.data;
  const theme = siteTheme(a.user_id, a.accent);
  const home = siteHref(a.user_id);
  const path = siteHref(a.user_id, `/${encodeURIComponent(a.slug)}`);
  const url = `${SITE_URL}${path}`;
  const category = categoryFor(a.keyword, a.title, a.niche);
  const parsed = parseArticle(a.content_md, a.title);
  const picks = buildPicks(a.content_md, a.links);
  const toc = parsed.sections.map((s) => ({ id: s.id, title: s.title }));
  const updated = fmtDate(a.published_at, { month: "long", day: "numeric", year: "numeric" });

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: a.title,
      description: a.meta_description || undefined,
      datePublished: a.published_at ?? undefined,
      dateModified: a.published_at ?? undefined,
      wordCount: a.word_count || undefined,
      keywords: a.keyword || undefined,
      articleSection: category,
      mainEntityOfPage: url,
      author: { "@type": "Organization", name: a.site_name, url: `${SITE_URL}${home}` },
      publisher: { "@type": "Organization", name: a.site_name, url: `${SITE_URL}${home}` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: a.site_name, item: `${SITE_URL}${home}` },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}${home}#guides` },
        { "@type": "ListItem", position: 3, name: a.title, item: url },
      ],
    },
    ...(parsed.faq
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: parsed.faq.items.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: plain(f.a) },
            })),
          },
        ]
      : []),
  ];

  return (
    <SiteShell id={identityOf(a)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <article>
        <header className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 md:pt-10">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1 text-[13px] text-fg-3">
              <li>
                <Link href={home} className="hover:text-fg hover:underline">
                  {a.site_name}
                </Link>
              </li>
              <ChevronRight className="size-3.5" aria-hidden />
              <li>
                <Link href={`${home}#guides`} className="hover:text-fg hover:underline">
                  Guides
                </Link>
              </li>
              <ChevronRight className="size-3.5" aria-hidden />
              <li aria-current="page" className="max-w-[16rem] truncate text-fg-2 sm:max-w-md">
                {a.title}
              </li>
            </ol>
          </nav>

          <div className="mx-auto mt-8 max-w-3xl text-left md:text-center">
            <CategoryChip label={category} />
            <h1 className="mt-4 font-display text-[34px] font-medium leading-[1.1] tracking-[-0.02em] text-fg sm:text-[46px] lg:text-[52px]">
              {a.title}
            </h1>
            {a.meta_description ? (
              <p className="mt-5 font-serif text-[19px] leading-8 text-fg-2 sm:text-[21px]">{a.meta_description}</p>
            ) : null}
            <div className="mt-7 flex flex-col gap-4 border-y border-line py-4 sm:flex-row sm:items-center sm:justify-between md:text-left">
              <div className="flex items-center gap-3">
                <Monogram name={a.site_name} theme={theme} size="md" />
                <div>
                  <p className="text-[14px] font-semibold text-fg">By the {a.site_name} team</p>
                  <p className="text-[13px] text-fg-3">
                    Updated <time dateTime={a.published_at ?? undefined}>{updated}</time> · {readMinutes(a.word_count)} min read
                  </p>
                </div>
              </div>
              <ShareButtons url={url} title={a.title} />
            </div>
          </div>

          <Cover
            seed={a.slug}
            hue={theme.hue}
            keyword={a.keyword}
            title={a.title}
            niche={a.niche}
            size="hero"
            className="mt-8 aspect-[16/9] rounded-2xl ring-1 ring-line sm:aspect-[21/9]"
          />
        </header>

        <div className="mx-auto mt-10 grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_220px]">
          {/* Sticky table of contents */}
          <div className="hidden lg:block">
            <TableOfContents items={toc} className="sticky top-28" />
          </div>

          <div className="min-w-0 max-w-[44rem]">
            <aside
              aria-label="Affiliate disclosure"
              className="flex gap-3 rounded-xl border border-line bg-sunken px-4 py-3 text-[13px] leading-5 text-fg-2"
            >
              <Info className="mt-0.5 size-4 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden />
              <p>
                {a.site_name} is reader-supported. When you buy through links on this page we may earn a commission, at no extra
                cost to you.{" "}
                <Link href={siteHref(a.user_id, "/about#disclosure")} className="font-medium text-accent-ink underline-offset-2 hover:underline">
                  Learn more
                </Link>
              </p>
            </aside>

            {toc.length ? (
              <details className="group mt-6 rounded-xl border border-line bg-surface lg:hidden">
                <summary className="flex h-12 items-center justify-between px-4 text-[14px] font-semibold text-fg">
                  On this page
                  <ChevronDown className="size-4 text-fg-3 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <ol className="border-t border-line px-4 py-2">
                  {toc.map((t) => (
                    <li key={t.id}>
                      <a href={`#${t.id}`} className="block py-2 text-[14px] text-fg-2 hover:text-fg">
                        {t.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}

            <div className="mt-8">
              {parsed.intro ? <Markdown variant="site">{parsed.intro}</Markdown> : null}

              <TopPicks picks={picks} variant="top" />

              {parsed.sections.map((s) =>
                parsed.faq && s.id === parsed.faq.section.id ? (
                  <section key={s.id} aria-labelledby={s.id} className="mt-14">
                    <h2 id={s.id} className="scroll-mt-24 font-display text-[30px] font-medium leading-tight text-fg">
                      {s.title}
                    </h2>
                    <div className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                      {parsed.faq.items.map((f, i) => (
                        <details key={f.q} className="group" open={i === 0}>
                          <summary className="flex min-h-14 items-center justify-between gap-4 px-5 py-4 text-[16px] font-semibold leading-6 text-fg">
                            {f.q}
                            <ChevronDown className="size-4 shrink-0 text-fg-3 transition-transform duration-200 group-open:rotate-180" aria-hidden />
                          </summary>
                          <div className="px-5 pb-5 [&_.prose]:text-[16px]">
                            <Markdown variant="site" className="prose-base">
                              {f.a}
                            </Markdown>
                          </div>
                        </details>
                      ))}
                    </div>
                  </section>
                ) : (
                  <section key={s.id} aria-labelledby={s.id}>
                    <h2 id={s.id} className="mt-14 scroll-mt-24 font-display text-[30px] font-medium leading-tight tracking-[-0.01em] text-fg">
                      {s.title}
                    </h2>
                    {s.md ? (
                      <div className="mt-5">
                        <Markdown variant="site">{s.md}</Markdown>
                      </div>
                    ) : null}
                  </section>
                ),
              )}

              <TopPicks picks={picks} variant="bottom" />
            </div>

            <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[14px] font-semibold text-fg">Found this useful? Share it</p>
              <ShareButtons url={url} title={a.title} />
            </div>

            <div className="mt-12">
              <NewsletterForm siteName={a.site_name} niche={a.niche} variant="band" />
            </div>
          </div>
        </div>
      </article>

      {a.related.length ? (
        <section aria-labelledby="related-title" className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
          <h2 id="related-title" className="border-b border-line pb-3 font-display text-[26px] font-medium text-fg">
            Keep reading
          </h2>
          <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {a.related.map((r) => (
              <ArticleCard key={r.slug} a={r} userId={a.user_id} hue={theme.hue} niche={a.niche} />
            ))}
          </div>
        </section>
      ) : null}
    </SiteShell>
  );
}

export default function ArticlePage({ params }: PageProps<"/site/[user]/[slug]">) {
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      <ArticleContent params={params} />
    </Suspense>
  );
}
