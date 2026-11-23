"use client";

import { useMemo, useState } from "react";
import { ChevronDown, PenLine, RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { KeywordResearch } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, Skeleton, Table, TableWrap, Td, Th, Tr } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { AppPage } from "./app-shell";
import { IntentBadge, ScoreBar, toPercentScale } from "./bits";
import { useWorkspace } from "./workspace";

function ResearchRow({ r, defaultOpen }: { r: KeywordResearch; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const { askAgent } = useWorkspace();
  const panelId = `kw-${r.id}`;

  const { rows, best } = useMemo(() => {
    const maxD = Math.max(0, ...r.results.map((x) => x.difficulty_est));
    const maxO = Math.max(0, ...r.results.map((x) => x.opportunity));
    const rows = r.results
      .map((x) => ({
        ...x,
        d: toPercentScale(x.difficulty_est, maxD),
        o: toPercentScale(x.opportunity, maxO),
      }))
      .sort((a, b) => b.o - a.o);
    return { rows, best: rows[0] };
  }, [r.results]);

  return (
    <li className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-150 hover:bg-raised/40"
      >
        <ChevronDown
          className={cn("size-4 shrink-0 text-fg-3 transition-transform duration-200", !open && "-rotate-90")}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-fg">{r.seed || "Untitled seed"}</p>
          <p className="mt-0.5 text-[12px] text-fg-3">
            {r.results.length} {r.results.length === 1 ? "keyword" : "keywords"} · {fmtDate(r.created_at)}
          </p>
        </div>
        {best ? (
          <div className="hidden min-w-0 max-w-[45%] text-right sm:block">
            <p className="text-[12px] text-fg-3">Best opportunity</p>
            <p className="truncate text-[13px] text-fg">
              {best.keyword} <span className="font-mono text-accent-ink">{best.o}</span>
            </p>
          </div>
        ) : null}
      </button>

      {open ? (
        <div id={panelId} className="animate-fade border-t border-line bg-bg/50">
          {rows.length ? (
            <TableWrap>
              <Table className="min-w-[640px]">
                <thead>
                  <tr>
                    <Th>Keyword</Th>
                    <Th>Intent</Th>
                    <Th>Difficulty</Th>
                    <Th>Opportunity</Th>
                    <Th>
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((k, i) => (
                    <Tr key={`${k.keyword}-${i}`}>
                      <Td className="font-medium text-fg">{k.keyword}</Td>
                      <Td>
                        <IntentBadge intent={k.intent} />
                      </Td>
                      <Td>
                        <ScoreBar value={k.d} tone="difficulty" label={`Difficulty ${k.d} of 100`} />
                      </Td>
                      <Td>
                        <ScoreBar value={k.o} tone={i === 0 ? "accent" : "neutral"} label={`Opportunity ${k.o} of 100`} />
                      </Td>
                      <Td align="right" className="w-32">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => askAgent(`Write an article targeting the keyword "${k.keyword}".`)}
                          icon={<PenLine className="size-3.5" aria-hidden />}
                        >
                          Write
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          ) : (
            <p className="px-5 py-6 text-[13px] text-fg-3">This research run returned no keywords.</p>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function KeywordsView() {
  const { askAgent } = useWorkspace();
  const { data, error, loading, initialLoading, reload } = useApi(() => api.me.keywords({ quiet: true }));
  const list = useMemo(
    () => [...(data ?? [])].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
    [data],
  );
  const total = list.reduce((n, r) => n + r.results.length, 0);

  return (
    <AppPage>
      <PageHeader
        title="Keywords"
        description="Every research run the agent has done, with intent, estimated difficulty and an opportunity score per keyword."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={reload}
              loading={loading && !initialLoading}
              icon={<RefreshCw className="size-3.5" aria-hidden />}
            >
              Refresh
            </Button>
            <Button size="sm" onClick={() => askAgent("Research keywords for ")} icon={<Search className="size-3.5" aria-hidden />}>
              New research
            </Button>
          </>
        }
      />

      {list.length ? (
        <p className="mt-4 font-mono text-[12px] text-fg-3">
          {list.length} {list.length === 1 ? "seed" : "seeds"} · {total} keywords
        </p>
      ) : null}

      <Card className="mt-4 overflow-hidden">
        {initialLoading ? (
          <div className="divide-y divide-line" role="status" aria-label="Loading keyword research">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="size-4" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/5" />
                </div>
              </div>
            ))}
          </div>
        ) : error && !data ? (
          <ErrorState title="Couldn't load keyword research" error={error} onRetry={reload} />
        ) : !list.length ? (
          <EmptyState
            icon={Search}
            title="No keyword research yet"
            description="Give the agent a seed topic, like “budget hiking gear”, and it will return keywords you can target."
            action={
              <Button onClick={() => askAgent("Research keywords for budget hiking gear")} icon={<Search className="size-4" aria-hidden />}>
                Research a topic
              </Button>
            }
          />
        ) : (
          <ul>
            {list.map((r, i) => (
              <ResearchRow key={r.id || `${r.seed}-${i}`} r={r} defaultOpen={i === 0} />
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-fg-3">
        <span>Difficulty: lower is easier to rank</span>
        <span>Opportunity: higher is better, weighing demand against competition</span>
      </div>
    </AppPage>
  );
}
