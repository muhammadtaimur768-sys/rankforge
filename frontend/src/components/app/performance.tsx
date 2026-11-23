"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BarChart3, RefreshCw, Target } from "lucide-react";
import { api } from "@/lib/api";
import { ctr, fillDaily, fmtDateTime, fmtNum, fmtPct, shortDay } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { DailyTraffic } from "@/lib/types";
import { Legend, TimeSeriesChart, type SeriesDef } from "@/components/charts/charts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  PageHeader,
  Skeleton,
  SkeletonRows,
  StatTile,
  StatTileSkeleton,
  Table,
  TableWrap,
  Td,
  Th,
  Tr,
} from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { AppPage } from "./app-shell";
import { RankBadge } from "./bits";
import { useWorkspace } from "./workspace";

const SERIES: SeriesDef[] = [
  { key: "views", label: "Views", color: "var(--chart-1)", kind: "area" },
  { key: "clicks", label: "Clicks", color: "var(--chart-2)", kind: "line" },
];

export function PerformanceView() {
  const { me, meError, refreshMe, askAgent } = useWorkspace();
  const perf = useApi(() => api.me.performance({ quiet: true }));
  const ranks = useApi(() => api.me.ranks({ quiet: true }));

  const daily = useMemo(
    () => fillDaily<DailyTraffic>(perf.data?.daily ?? [], 30, (date) => ({ date, views: 0, clicks: 0 })),
    [perf.data],
  );
  const totals = useMemo(
    () => daily.reduce((acc, d) => ({ views: acc.views + d.views, clicks: acc.clicks + d.clicks }), { views: 0, clicks: 0 }),
    [daily],
  );
  const articles = useMemo(
    () => [...(perf.data?.articles ?? [])].sort((a, b) => b.clicks - a.clicks || b.views - a.views),
    [perf.data],
  );
  const rankRows = useMemo(
    () => [...(ranks.data ?? [])].sort((a, b) => (b.checked_at ?? "").localeCompare(a.checked_at ?? "")),
    [ranks.data],
  );
  const maxViews = Math.max(1, ...articles.map((a) => a.views));
  const s = me?.stats;
  const refreshing = perf.loading || ranks.loading;

  return (
    <AppPage>
      <PageHeader
        title="Performance"
        description="Views and affiliate clicks across your published articles, plus the latest rank checks."
        actions={
          <Button
            variant="secondary"
            size="sm"
            loading={refreshing && !perf.initialLoading}
            onClick={() => {
              perf.reload();
              ranks.reload();
              void refreshMe();
            }}
            icon={<RefreshCw className="size-3.5" aria-hidden />}
          >
            Refresh
          </Button>
        }
      />

      {/* KPI tiles */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {s ? (
          <>
            <StatTile label="Views" value={fmtNum(s.views)} hint="All time" />
            <StatTile label="Affiliate clicks" value={fmtNum(s.clicks)} hint="All time" emphasis />
            <StatTile label="Click-through rate" value={fmtPct(ctr(s.clicks, s.views))} hint="Clicks per view" />
            <StatTile label="Published" value={fmtNum(s.published)} hint={`of ${fmtNum(s.articles)} articles`} />
          </>
        ) : meError ? (
          <div className="col-span-2 lg:col-span-4">
            <Card>
              <ErrorState compact title="Couldn't load your totals" error={meError} onRetry={() => void refreshMe()} />
            </Card>
          </div>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <StatTileSkeleton key={i} />)
        )}
      </div>

      {/* Main chart */}
      <Card className="mt-6">
        <CardHeader
          title="Last 30 days"
          description={
            perf.data ? (
              <span className="font-mono tabular">
                {fmtNum(totals.views)} views · {fmtNum(totals.clicks)} clicks · {fmtPct(ctr(totals.clicks, totals.views))} CTR
              </span>
            ) : (
              "Daily views and clicks"
            )
          }
          action={<Legend series={SERIES} />}
        />
        <div className="px-3 pb-4 pt-4 sm:px-5">
          {perf.initialLoading ? (
            <Skeleton className="h-[300px] w-full rounded-xl" />
          ) : perf.error && !perf.data ? (
            <ErrorState compact title="Couldn't load traffic" error={perf.error} onRetry={perf.reload} />
          ) : totals.views === 0 && totals.clicks === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No traffic in the last 30 days"
              description="Once a published article gets visits, views and clicks will be charted here by day."
              action={
                <Button variant="secondary" size="sm" onClick={() => askAgent("Publish my best draft article.")}>
                  Ask agent to publish a draft
                </Button>
              }
            />
          ) : (
            <>
              <TimeSeriesChart
                data={daily}
                series={SERIES}
                ariaLabel={`Views and clicks per day for the last 30 days. ${totals.views} views and ${totals.clicks} clicks in total.`}
              />
              <details className="mt-3 px-2">
                <summary className="inline-flex h-8 items-center text-[12px] text-fg-3 hover:text-fg">Show as table</summary>
                <TableWrap className="mt-2 max-h-72 overflow-y-auto">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Date</Th>
                        <Th align="right">Views</Th>
                        <Th align="right">Clicks</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...daily].reverse().map((d) => (
                        <Tr key={d.date}>
                          <Td className="h-9 text-[13px]">{shortDay(d.date)}</Td>
                          <Td className="h-9 font-mono text-[13px]" align="right">
                            {fmtNum(d.views)}
                          </Td>
                          <Td className="h-9 font-mono text-[13px]" align="right">
                            {fmtNum(d.clicks)}
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              </details>
            </>
          )}
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Per-article */}
        <Card className="min-w-0">
          <CardHeader title="By article" description="Sorted by affiliate clicks" />
          <div className="mt-3">
            {perf.initialLoading ? (
              <SkeletonRows className="px-5 pb-5" />
            ) : perf.error && !perf.data ? (
              <ErrorState compact title="Couldn't load articles" error={perf.error} onRetry={perf.reload} />
            ) : !articles.length ? (
              <p className="px-5 pb-6 text-[13px] text-fg-3">No published articles yet.</p>
            ) : (
              <TableWrap>
                <Table className="min-w-[520px]">
                  <thead>
                    <tr>
                      <Th>Article</Th>
                      <Th align="right">Views</Th>
                      <Th align="right">Clicks</Th>
                      <Th align="right">CTR</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {articles.map((a) => (
                      <Tr key={a.id}>
                        <Td className="max-w-[22rem]">
                          <Link
                            href={`/app/articles/${encodeURIComponent(a.id)}`}
                            className="block truncate text-fg hover:underline"
                          >
                            {a.title}
                          </Link>
                          <span className="mt-1.5 block h-1 w-full max-w-48 overflow-hidden rounded-full bg-raised" aria-hidden>
                            <span className="block h-full rounded-full bg-chart-1" style={{ width: `${(a.views / maxViews) * 100}%` }} />
                          </span>
                        </Td>
                        <Td align="right" className="font-mono text-[13px] text-fg">
                          {fmtNum(a.views)}
                        </Td>
                        <Td align="right" className="font-mono text-[13px] text-fg">
                          {fmtNum(a.clicks)}
                        </Td>
                        <Td align="right" className="font-mono text-[13px]">
                          {fmtPct(a.ctr_pct || ctr(a.clicks, a.views))}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </div>
        </Card>

        {/* Ranks */}
        <Card className="min-w-0">
          <CardHeader
            title="Rank checks"
            description="Latest first"
            action={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => askAgent("Check where my published articles rank for their keywords.")}
                icon={<Target className="size-3.5" aria-hidden />}
              >
                Check now
              </Button>
            }
          />
          <div className="mt-3">
            {ranks.initialLoading ? (
              <SkeletonRows className="px-5 pb-5" rows={4} />
            ) : ranks.error && !ranks.data ? (
              <ErrorState compact title="Couldn't load rank checks" error={ranks.error} onRetry={ranks.reload} />
            ) : !rankRows.length ? (
              <p className="px-5 pb-6 text-[13px] text-fg-3">No rank checks yet. Ask the agent to check a keyword.</p>
            ) : (
              <TableWrap>
                <Table className="min-w-[420px]">
                  <thead>
                    <tr>
                      <Th>Keyword</Th>
                      <Th>Position</Th>
                      <Th>Checked</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankRows.map((r, i) => (
                      <Tr key={`${r.keyword}-${r.checked_at}-${i}`}>
                        <Td className="max-w-[14rem]">
                          <span className="block truncate text-fg">{r.keyword}</span>
                          <span className="block truncate text-[12px] text-fg-3">{r.domain}</span>
                        </Td>
                        <Td>
                          <RankBadge position={r.position} />
                        </Td>
                        <Td className="whitespace-nowrap text-[13px]">{fmtDateTime(r.checked_at)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </div>
        </Card>
      </div>
    </AppPage>
  );
}
