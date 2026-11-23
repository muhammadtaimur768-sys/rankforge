import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { WifiOff } from "lucide-react";
import { identityOf, Monogram, SiteShell, SiteShellBare, siteHref } from "@/components/public/site-chrome";
import { NewsletterForm } from "@/components/public/site-client";
import { Skeleton } from "@/components/ui/primitives";
import { getPublicSite } from "@/lib/public-data";
import { siteTheme } from "@/lib/site-brand";

export async function generateMetadata({ params }: PageProps<"/site/[user]/about">): Promise<Metadata> {
  const { user } = await params;
  const userId = decodeURIComponent(user);
  const res = await getPublicSite(userId);
  if (!res.ok) return { title: "About" };
  return {
    title: { absolute: `About · ${res.data.site_name}` },
    description: `How ${res.data.site_name} researches, fact-checks and funds its guides.`,
    alternates: { canonical: siteHref(userId, "/about") },
  };
}

async function AboutContent({ params }: { params: PageProps<"/site/[user]/about">["params"] }) {
  const { user } = await params;
  const userId = decodeURIComponent(user);
  const res = await getPublicSite(userId);
  if (!res.ok) {
    if (res.notFound) notFound();
    return (
      <SiteShellBare>
        <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
          <WifiOff className="mx-auto size-6 text-fg-3" strokeWidth={1.5} aria-hidden />
          <h1 className="mt-4 font-display text-[26px] text-fg">This page couldn&apos;t be loaded</h1>
        </div>
      </SiteShellBare>
    );
  }
  const site = res.data;
  const theme = siteTheme(site.user_id, site.accent);
  const sections = [
    {
      id: "who-we-are",
      title: "Who we are",
      body:
        site.about ??
        `${site.site_name} publishes practical guides${site.niche ? ` to ${site.niche}` : ""}. We explain what matters when you buy, the trade-offs between options, and which picks suit which people.`,
    },
    ...(site.audience ? [{ id: "who-its-for", title: "Who it's for", body: site.audience }] : []),
    {
      id: "how-we-pick",
      title: "How we pick",
      body: "Each guide starts from what people actually search for. Drafts are researched and written with the help of AI agents, then every factual claim (specs, weights, prices, compatibility) is checked against sources before publishing. Claims that don't hold up are rewritten or removed.",
    },
    {
      id: "disclosure",
      title: "Affiliate disclosure",
      body: `${site.site_name} is reader-supported. Some links on this site are affiliate links: if you buy through them we may earn a commission from the retailer, at no extra cost to you. Affiliate links open in a new tab and are marked as sponsored for search engines. Commissions never change which products we recommend or how we rank them.`,
    },
    {
      id: "privacy",
      title: "Privacy",
      body: "We count page views and clicks on affiliate links to learn which guides are useful. We don't sell personal data and don't run third-party ad trackers. If you subscribe to the newsletter, your email is used only to send new guides, and you can unsubscribe at any time.",
    },
  ];

  return (
    <SiteShell id={identityOf(site)}>
      <div className="mx-auto max-w-3xl px-4 pt-14 sm:px-6 md:pt-20">
        <Monogram name={site.site_name} theme={theme} size="lg" />
        <h1 className="mt-6 font-display text-[40px] font-medium leading-[1.08] tracking-[-0.02em] text-fg sm:text-[52px]">
          About {site.site_name}
        </h1>
        {site.tagline ? <p className="mt-4 font-serif text-[20px] leading-8 text-fg-2">{site.tagline}</p> : null}
        <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex h-9 items-center rounded-full border border-line bg-surface px-3.5 text-[13px] font-medium text-fg-2 hover:border-line-strong hover:text-fg"
            >
              {s.title}
            </a>
          ))}
        </nav>
        <div className="mt-6 divide-y divide-line">
          {sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24 py-10">
              <h2 id={`${s.id}-h`} className="font-display text-[28px] font-medium text-fg">
                {s.title}
              </h2>
              <p className="mt-4 font-serif text-[18px] leading-8 text-fg-2">{s.body}</p>
            </section>
          ))}
        </div>
        <div className="mt-6">
          <NewsletterForm siteName={site.site_name} niche={site.niche} variant="band" />
        </div>
      </div>
    </SiteShell>
  );
}

export default function AboutPage({ params }: PageProps<"/site/[user]/about">) {
  return (
    <Suspense
      fallback={
        <SiteShellBare>
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6" role="status" aria-label="Loading">
            <Skeleton className="size-14 rounded-2xl" />
            <Skeleton className="mt-6 h-12 w-2/3" />
            <Skeleton className="mt-10 h-40 w-full" />
          </div>
        </SiteShellBare>
      }
    >
      <AboutContent params={params} />
    </Suspense>
  );
}
