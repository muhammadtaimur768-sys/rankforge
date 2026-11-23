"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronRight, FileText, PenLine, RefreshCw, Search } from "lucide-react";
import { api } from "@/lib/api";
import { ctr, fmtDate, fmtNum, fmtPct } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { Article } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, Input, PageHeader, Skeleton, Table, TableWrap, Td, Th, Tr } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { AppPage } from "./app-shell";
import { StatusBadge } from "./bits";
import { useWorkspace } from "./workspace";

type Filter = "all" | "published" | "draft";

export function ArticlesView() {
  const router = useRouter();
  const { askAgent } = useWorkspace();
  const { data, error, loading, initialLoading, reload } = useApi(() => api.me.articles({ quiet: true }));
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const list = data ?? [];
    return {
      all: list.length,
      published: list.filter((a) => a.status === "published").length,
      draft: list.filter((a) => a.status === "draft").length,
    };
  }, [data]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? [])
      .filter((a) => filter === "all" || a.status === filter)
      .filter((a) => !needle || a.title.toLowerCase().includes(needle) || a.keyword.toLowerCase().includes(needle))
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  }, [data, filter, q]);

  const open = (a: Article) => router.push(`/app/articles/${encodeURIComponent(a.id)}`);

  return (
    <AppPage>
      <PageHeader
        title="Articles"
        description="Everything the agent has written for you. Ask the agent in chat to publish, edit or delete an article."
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
            <Button size="sm" onClick={() => askAgent("Write an article about ")} icon={<PenLine className="size-3.5" aria-hidden />}>
              New article
            </Button>
          </>
        }
      />

      <Card className="mt-6">
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" aria-label="Filter by status" className="flex gap-1">
            {(["all", "published", "draft"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] transition-colors duration-150",
                  filter === f ? "bg-raised font-medium text-fg" : "text-fg-2 hover:text-fg",
                )}
              >
                {f === "all" ? "All" : f === "published" ? "Published" : "Drafts"}
                <span className="font-mono text-[11px] text-fg-3">{counts[f]}</span>
              </button>
            ))}
          </div>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-3" aria-hidden />
            <label htmlFor="article-search" className="sr-only">
              Search articles
            </label>
            <Input
              id="article-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="h-9 pl-9 text-sm"
            />
          </div>
        </div>

        {initialLoading ? (
          <div className="space-y-px p-3" role="status" aria-label="Loading articles">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-2 py-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="hidden h-6 w-20 sm:block" />
                <Skeleton className="hidden h-4 w-12 md:block" />
                <Skeleton className="hidden h-4 w-12 md:block" />
              </div>
            ))}
          </div>
        ) : error && !data ? (
          <ErrorState title="Couldn't load articles" error={error} onRetry={reload} />
        ) : !data?.length ? (
          <EmptyState
            icon={FileText}
            title="No articles yet"
            description="Ask the agent to research a topic and write the first one. It will show up here as a draft."
            action={
              <Button onClick={() => askAgent("Research keywords for ")} icon={<PenLine className="size-4" aria-hidden />}>
                Ask the agent
              </Button>
            }
          />
        ) : !rows.length ? (
          <EmptyState icon={Search} title="No matches" description="Try another search or switch the status filter." />
        ) : (
          <>
            {/* Desktop table */}
            <TableWrap className="hidden md:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Article</Th>
                    <Th>Status</Th>
                    <Th align="right">Words</Th>
                    <Th align="right">Views</Th>
                    <Th align="right">Clicks</Th>
                    <Th align="right">CTR</Th>
                    <Th>Created</Th>
                    <Th>
                      <span className="sr-only">Open</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <Tr key={a.id} className="cursor-pointer" onClick={() => open(a)}>
                      <Td className="max-w-[28rem]">
                        <Link
                          href={`/app/articles/${encodeURIComponent(a.id)}`}
                          className="block truncate font-medium text-fg hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {a.title}
                        </Link>
                        <span className="block truncate text-[12px] text-fg-3">{a.keyword || "—"}</span>
                      </Td>
                      <Td>
                        <StatusBadge status={a.status} />
                      </Td>
                      <Td align="right" className="font-mono text-[13px]">
                        {fmtNum(a.word_count)}
                      </Td>
                      <Td align="right" className="font-mono text-[13px] text-fg">
                        {fmtNum(a.views)}
                      </Td>
                      <Td align="right" className="font-mono text-[13px] text-fg">
                        {fmtNum(a.clicks)}
                      </Td>
                      <Td align="right" className="font-mono text-[13px]">
                        {fmtPct(ctr(a.clicks, a.views))}
                      </Td>
                      <Td className="whitespace-nowrap text-[13px]">{fmtDate(a.created_at)}</Td>
                      <Td className="w-8 text-fg-3">
                        <ChevronRight className="size-4" aria-hidden />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>

            {/* Mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((a) => (
                <li key={a.id}>
                  <Link href={`/app/articles/${encodeURIComponent(a.id)}`} className="block px-4 py-4 hover:bg-raised/40">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium leading-5 text-fg">{a.title}</p>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="mt-1 truncate text-[12px] text-fg-3">{a.keyword || "—"}</p>
                    <dl className="mt-3 flex gap-5 font-mono text-[12px]">
                      <div>
                        <dt className="sr-only">Views</dt>
                        <dd className="text-fg">
                          {fmtNum(a.views)} <span className="font-sans text-fg-3">views</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="sr-only">Clicks</dt>
                        <dd className="text-fg">
                          {fmtNum(a.clicks)} <span className="font-sans text-fg-3">clicks</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="sr-only">Words</dt>
                        <dd className="text-fg-2">
                          {fmtNum(a.word_count)} <span className="font-sans text-fg-3">words</span>
                        </dd>
                      </div>
                    </dl>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </AppPage>
  );
}
