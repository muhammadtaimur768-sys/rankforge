import { ExternalLink } from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { ToolChipFace } from "@/components/tool-chip";

const LINKS = [
  { anchor: "Durston X-Mid 1", host: "rei.com", clicks: 41 },
  { anchor: "Big Agnes Copper Spur HV UL1", host: "backcountry.com", clicks: 33 },
  { anchor: "Nemo Hornet Elite OSMO", host: "amazon.com", clicks: 22 },
];

/** Product preview built in code: one chat turn and the article it produced. */
export function HeroPreview() {
  return (
    <div className="relative" aria-label="Example of a RankForge chat turn and the article it published" role="img">
      <div className="overflow-hidden rounded-[20px] border border-line-strong bg-surface shadow-float">
        <div className="flex h-10 items-center gap-2 border-b border-line bg-sunken px-4">
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="ml-3 truncate font-mono text-[11px] text-fg-3">rankforge / chat / tents</span>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-raised px-4 py-2.5 text-[13px] leading-5 text-fg">
            Find low-competition keywords for ultralight tents and publish a buying guide for the best one
          </div>

          <div className="flex gap-3">
            <LogoMark className="mt-0.5 size-6 shrink-0" />
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <ToolChipFace name="keyword_research" />
                <ToolChipFace name="write_article" />
                <ToolChipFace name="fact_check" />
                <ToolChipFace name="add_affiliate_link" />
                <ToolChipFace name="publish_article" />
              </div>
              <p className="text-[13px] leading-5 text-fg-2">
                <span className="text-fg">&ldquo;ultralight tent under $300&rdquo;</span> had the best opportunity score
                (82, difficulty 24). The guide is live. 11 of 12 claims checked out. I rewrote one weight figure that
                didn&apos;t match the maker&apos;s spec sheet.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-bg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-medium leading-5 text-fg">Best ultralight tents under $300 for 2026</p>
                <p className="mt-1 flex items-center gap-1 truncate font-mono text-[11px] text-fg-3">
                  /site/trailnotes/best-ultralight-tents-under-300
                  <ExternalLink className="size-3 shrink-0" aria-hidden />
                </p>
              </div>
              <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md bg-positive-soft px-2 text-[11px] font-medium text-positive">
                <span className="size-1.5 rounded-full bg-current" />
                Published
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-line py-3">
              {[
                ["Views", "1,284"],
                ["Clicks", "96"],
                ["CTR", "7.5%"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] text-fg-3">{k}</dt>
                  <dd className={`mt-0.5 font-mono text-[17px] tabular ${k === "Clicks" ? "text-accent-ink" : "text-fg"}`}>
                    {v}
                  </dd>
                </div>
              ))}
            </dl>

            <ul className="mt-3 space-y-2">
              {LINKS.map((l) => (
                <li key={l.anchor} className="flex items-center gap-3 text-[12px]">
                  <span className="min-w-0 flex-1 truncate text-fg-2">
                    {l.anchor} <span className="text-fg-3">· {l.host}</span>
                  </span>
                  <span className="relative hidden h-1.5 w-16 overflow-hidden rounded-full bg-raised sm:block" aria-hidden>
                    <span className="absolute inset-y-0 left-0 rounded-full bg-chart-2" style={{ width: `${(l.clicks / 41) * 100}%` }} />
                  </span>
                  <span className="w-8 text-right font-mono tabular text-fg">{l.clicks}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
