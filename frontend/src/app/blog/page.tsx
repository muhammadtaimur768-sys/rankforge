import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteGrid, SiteGridSkeleton } from "@/components/public/site-cards";

export const metadata: Metadata = {
  title: "Sites built with RankForge",
  description: "A live directory of affiliate sites researched, written, fact-checked and published by RankForge agents.",
  alternates: { canonical: "/blog" },
};

export default function BlogDirectoryPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 pb-24 pt-14 sm:px-6 md:pt-20">
        <p className="font-mono text-[12px] text-accent-ink">Live directory</p>
        <h1 className="mt-3 text-[34px] font-medium leading-[1.1] tracking-[-0.02em] text-fg sm:text-[44px]">
          Sites built with RankForge
        </h1>
        <p className="mt-4 max-w-2xl text-[17px] leading-7 text-fg-2">
          Every site here was researched, written, fact-checked and published by RankForge agents for the person who owns it.
          Sorted by most recent article.
        </p>
        <div className="mt-12">
          <Suspense fallback={<SiteGridSkeleton count={6} />}>
            <SiteGrid />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
