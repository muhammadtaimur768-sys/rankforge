import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Brain,
  Check,
  ChevronDown,
  FileSearch,
  Globe,
  MousePointerClick,
  ScrollText,
  ShieldCheck,
  Target,
} from "lucide-react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { HeroPreview } from "@/components/marketing/hero-preview";
import { SiteGrid, SiteGridSkeleton } from "@/components/public/site-cards";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PIPELINE = [
  {
    index: "01",
    name: "Research",
    tool: "keyword_research",
    body: "Expands a seed topic into keywords with search intent, estimated difficulty and an opportunity score.",
  },
  {
    index: "02",
    name: "Write",
    tool: "write_article",
    body: "Drafts the article for the keyword you pick, with a title, slug and meta description written for search.",
  },
  {
    index: "03",
    name: "Fact-check",
    tool: "fact_check",
    body: "Pulls each factual claim out of the draft and checks it against sources before anything is published.",
  },
  {
    index: "04",
    name: "Link",
    tool: "add_affiliate_link",
    body: "Adds your affiliate links behind a tracked redirect, so every click is counted per link.",
  },
  {
    index: "05",
    name: "Publish",
    tool: "publish_article",
    body: "Puts the article on your hosted site with metadata, OpenGraph tags and sponsored link attributes.",
  },
  {
    index: "06",
    name: "Track",
    tool: "get_performance · check_ranking",
    body: "Reports views, clicks and rank positions so you know which articles earn and which need work.",
  },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Claims checked before they go live",
    body: "Each article carries its fact-check list: the claim, whether it held up, and the sources behind it.",
  },
  {
    icon: MousePointerClick,
    title: "Clicks counted per link",
    body: "Links route through a tracked redirect, so you can see which anchor on which article sent the visitor.",
  },
  {
    icon: Brain,
    title: "Memory that carries across chats",
    body: "The agent keeps your niche, audience and preferred retailers between threads. You can delete anything it saved.",
  },
  {
    icon: Globe,
    title: "A site search engines can read",
    body: "Article pages are server-rendered with titles, descriptions and OpenGraph tags, plus an affiliate disclosure.",
  },
  {
    icon: Target,
    title: "Rank checks on demand",
    body: "Ask where an article sits for its keyword. Every check is stored, so the history is there when you need it.",
  },
  {
    icon: ScrollText,
    title: "Every agent turn on the record",
    body: "Tokens, latency and tool calls are logged for each message, and requests that try to misuse the agent are blocked.",
  },
];

const PLANS = [
  {
    name: "Hosted site",
    price: "$0",
    period: "forever",
    blurb: "For trying the full pipeline on one niche.",
    cta: "Start free",
    features: [
      "Affiliate site at /site/your-name",
      "5 articles a month",
      "Fact-check and tracked links on every article",
      "Performance dashboard",
    ],
  },
  {
    name: "Starter",
    price: "$49",
    period: "per month",
    blurb: "For a solo publisher posting every week.",
    cta: "Choose Starter",
    features: ["30 articles a month", "Keyword research on 100 seeds", "Weekly rank checks", "Long-term memory for niche and tone"],
  },
  {
    name: "Growth",
    price: "$149",
    period: "per month",
    blurb: "For a site that already earns and needs volume.",
    cta: "Choose Growth",
    featured: true,
    features: ["100 articles a month", "Unlimited keyword research", "Daily rank checks", "Priority queue for long articles"],
  },
  {
    name: "Agency",
    price: "$399",
    period: "per month",
    blurb: "For teams running sites for several clients.",
    cta: "Choose Agency",
    features: ["300 articles a month", "Up to 10 client sites", "Usage and cost reports per client", "Priority support"],
  },
];

const FAQ = [
  {
    q: "How does RankForge make money?",
    a: "The hosted affiliate site is free, and the commissions it earns are yours. RankForge charges for SEO packages: Starter, Growth and Agency add article volume, rank tracking and more sites.",
  },
  {
    q: "Whose affiliate links are used?",
    a: "Yours. Give the agent your retailer links and it places them in the article. Each link is wrapped in a tracked redirect, so the click is counted before the visitor reaches the retailer.",
  },
  {
    q: "How does the fact-check work?",
    a: "After drafting, the agent extracts the factual claims and checks each one against sources. In your workspace every article shows its claims, their status and the sources used.",
  },
  {
    q: "Will my articles rank?",
    a: "No one can promise rankings. RankForge picks keywords with a realistic opportunity score, writes to the search intent and tracks positions, so you can see what works and adjust.",
  },
  {
    q: "What does the agent remember about me?",
    a: "Inside a chat thread it remembers the whole conversation. Across threads it keeps facts about you, like your niche or favorite retailers. You can review and delete them on the Memory page.",
  },
  {
    q: "Can I edit or take down an article?",
    a: "Yes. Ask the agent in chat to rewrite, publish or delete any article. The change shows up on your site straight away.",
  },
  {
    q: "Do I need my own domain?",
    a: "No. Your site lives at /site/your-username on RankForge and is listed in the public directory once you publish.",
  },
];

function SectionHeading({ id, eyebrow, title, body, className }: { id?: string; eyebrow: string; title: string; body?: string; className?: string }) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <p className="font-mono text-[12px] text-accent-ink">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-[30px] font-medium leading-[1.15] tracking-[-0.02em] text-fg sm:text-[36px]">
        {title}
      </h2>
      {body ? <p className="mt-4 text-[17px] leading-7 text-fg-2">{body}</p> : null}
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-line">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:pt-16 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:py-16">
            <div className="animate-rise">
              <p className="inline-flex items-center gap-2 font-mono text-[12px] text-fg-3">
                <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                AI SEO and affiliate content engine
              </p>
              <h1 className="mt-5 text-[40px] font-medium leading-[1.05] tracking-[-0.03em] text-fg sm:text-[52px] lg:text-[60px]">
                From keyword to published affiliate article in one conversation
              </h1>
              <p className="mt-6 max-w-[34rem] text-[18px] leading-[1.6] text-fg-2">
                Tell RankForge your niche. Its agents find keywords you can rank for, write the article, check each claim,
                add tracked affiliate links and publish to a free hosted site. Then they report which links earn clicks.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/signup" size="lg" icon={<ArrowRight className="size-4" aria-hidden />} className="flex-row-reverse">
                  Get started
                </ButtonLink>
                <ButtonLink href="/blog" size="lg" variant="secondary">
                  See live sites
                </ButtonLink>
              </div>
            </div>
            <div className="animate-rise [animation-delay:80ms]">
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* Pipeline */}
        <section aria-labelledby="pipeline-title" id="pipeline" className="scroll-mt-16 border-b border-line">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
            <SectionHeading
              id="pipeline-title"
              eyebrow="How it works"
              title="Six stages, each one a tool the agent calls"
              body="You ask in plain language. The agent decides which stages to run and shows every call in the chat, so you can open any step and see exactly what it did."
            />
            <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {PIPELINE.map((s) => (
                <li key={s.index} className="flex flex-col bg-surface p-6">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[13px] text-accent-ink">{s.index}</span>
                    <h3 className="text-[17px] font-medium text-fg">{s.name}</h3>
                  </div>
                  <p className="mt-3 flex-1 text-[15px] leading-6 text-fg-2">{s.body}</p>
                  <code className="mt-5 self-start rounded-md bg-raised px-2 py-1 font-mono text-[12px] text-fg-2">{s.tool}</code>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section aria-labelledby="features-title" id="features" className="scroll-mt-16 border-b border-line">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[0.9fr_1.6fr]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <SectionHeading
                id="features-title"
                eyebrow="Features"
                title="Built for people who publish for commission"
                body="Writing is the easy part. RankForge spends its effort on what decides whether an affiliate article earns: the right keyword, accurate claims and links you can measure."
              />
            </div>
            <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <li key={f.title}>
                  <f.icon className="size-5 text-fg-3" strokeWidth={1.5} aria-hidden />
                  <h3 className="mt-4 text-[16px] font-medium text-fg">{f.title}</h3>
                  <p className="mt-2 text-[15px] leading-6 text-fg-2">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Live sites */}
        <section aria-labelledby="sites-title" className="border-b border-line bg-sunken/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                id="sites-title"
                eyebrow="Live directory"
                title="Sites built with RankForge"
                body="Real sites published by RankForge users, pulled from the live directory."
              />
              <Link
                href="/blog"
                className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-fg transition-colors hover:text-accent-ink"
              >
                View all sites <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-10">
              <Suspense fallback={<SiteGridSkeleton />}>
                <SiteGrid limit={6} />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section aria-labelledby="pricing-title" id="pricing" className="scroll-mt-16 border-b border-line">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
            <SectionHeading
              id="pricing-title"
              eyebrow="Pricing"
              title="A free site, and packages when you need volume"
              body="Every account gets a hosted affiliate site. Paid SEO packages add articles, keyword research, rank tracking and room for more sites."
            />
            <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {PLANS.map((p) => (
                <div
                  key={p.name}
                  className={cn(
                    "flex flex-col rounded-2xl border bg-surface p-6 shadow-sm",
                    p.featured ? "border-accent ring-1 ring-accent" : "border-line",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-[16px] font-medium text-fg">{p.name}</h3>
                    {p.featured ? <span className="text-[12px] font-medium text-accent-ink">Best for growing sites</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-fg-2">{p.blurb}</p>
                  <p className="mt-6 flex items-baseline gap-2">
                    <span className="font-mono text-[36px] font-medium leading-none tabular text-fg">{p.price}</span>
                    <span className="text-sm text-fg-3">{p.period}</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-3 border-t border-line pt-6">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2.5 text-sm text-fg-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <ButtonLink
                    href="/signup"
                    variant={p.featured ? "primary" : "secondary"}
                    className="mt-8 w-full"
                    aria-label={`${p.cta}: ${p.name} plan`}
                  >
                    {p.cta}
                  </ButtonLink>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[13px] text-fg-3">Prices in USD. Cancel or change plans at any time.</p>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-title" id="faq" className="scroll-mt-16">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[0.9fr_1.6fr]">
            <SectionHeading id="faq-title" eyebrow="FAQ" title="Questions people ask before signing up" />
            <div className="divide-y divide-line border-y border-line">
              {FAQ.map((item) => (
                <details key={item.q} className="group">
                  <summary className="flex min-h-14 list-none items-center justify-between gap-4 py-4 text-[16px] font-medium text-fg">
                    {item.q}
                    <ChevronDown
                      className="size-4 shrink-0 text-fg-3 transition-transform duration-200 group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <p className="pb-5 pr-8 text-[15px] leading-7 text-fg-2">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-line bg-sunken/60">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[26px] font-medium tracking-[-0.02em] text-fg">Your first article is one message away</h2>
              <p className="mt-2 flex items-center gap-2 text-[15px] text-fg-2">
                <FileSearch className="size-4 text-fg-3" strokeWidth={1.5} aria-hidden />
                Start with a seed topic. The agent handles the rest.
              </p>
            </div>
            <ButtonLink href="/signup" size="lg">
              Get started
            </ButtonLink>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
