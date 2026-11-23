"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  FileQuestion,
  Link2,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { api, ApiError, goUrl } from "@/lib/api";
import { ctr, fmtDate, fmtNum, fmtPct, hostOf, readMinutes } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, Skeleton, Table, TableWrap, Td, Th, Tr } from "@/components/ui/primitives";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { AppPage } from "./app-shell";
import { FactStatus, StatusBadge } from "./bits";
import { useWorkspace } from "./workspace";

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading article">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-5 h-8 w-3/4" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="h-[480px] rounded-2xl" />
        <div className="space-y-6">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function ArticleDetailView() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const { session, askAgent } = useWorkspace();
  const { data: a, error, loading, initialLoading, reload } = useApi(() => api.me.article(id, { quiet: true }), id);
  const [tab, setTab] = useState<"preview" | "markdown">("preview");

  if (initialLoading) {
    return (
      <AppPage>
        <DetailSkeleton />
      </AppPage>
    );
  }

  if (error && !a) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <AppPage>
        <BackLink />
        <Card className="mt-6">
          {notFound ? (
            <EmptyState
              icon={FileQuestion}
              title="This article doesn't exist"
              description="It may have been deleted. Your other articles are still in the list."
              action={<ButtonLink href="/app/articles" variant="secondary">All articles</ButtonLink>}
            />
          ) : (
            <ErrorState title="Couldn't load this article" error={error} onRetry={reload} />
          )}
        </Card>
      </AppPage>
    );
  }

  if (!a) return null;

  const publicPath = `/site/${encodeURIComponent(session.userId)}/${encodeURIComponent(a.slug)}`;
  const published = a.status === "published";
  const verified = a.fact_checks.filter((f) => /verif|support|true|pass|confirm|accura|^ok$/i.test(f.status)).length;
  const label = `"${a.title}"`;

  return (
    <AppPage>
      <BackLink />

      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={a.status} />
            {a.keyword ? <span className="font-mono text-[12px] text-fg-3">{a.keyword}</span> : null}
          </div>
          <h1 className="mt-3 text-[26px] font-medium leading-tight tracking-[-0.01em] text-fg sm:text-[30px]">{a.title}</h1>
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-fg-3">
            <span>{fmtNum(a.word_count)} words</span>
            <span aria-hidden>·</span>
            <span>{readMinutes(a.word_count)} min read</span>
            <span aria-hidden>·</span>
            <span>Created {fmtDate(a.created_at)}</span>
            {published ? (
              <>
                <span aria-hidden>·</span>
                <span>Published {fmtDate(a.published_at)}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={reload}
            loading={loading}
            icon={<RefreshCw className="size-3.5" aria-hidden />}
          >
            Refresh
          </Button>
          {published ? (
            <ButtonLink
              href={publicPath}
              target="_blank"
              variant="secondary"
              size="sm"
              icon={<ExternalLink className="size-3.5" aria-hidden />}
            >
              View live
            </ButtonLink>
          ) : (
            <Button size="sm" onClick={() => askAgent(`Publish the article ${label} (id ${a.id}).`)} icon={<Send className="size-3.5" aria-hidden />}>
              Ask agent to publish
            </Button>
          )}
          <Button
            size="sm"
            variant="danger"
            onClick={() => askAgent(`Delete the article ${label} (id ${a.id}).`)}
            icon={<Trash2 className="size-3.5" aria-hidden />}
          >
            Ask agent to delete
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Content */}
        <Card className="min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
            <div role="tablist" aria-label="Content view" className="flex gap-1">
              {(["preview", "markdown"] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  type="button"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "h-8 rounded-lg px-3 text-[13px] transition-colors",
                    tab === t ? "bg-raised font-medium text-fg" : "text-fg-2 hover:text-fg",
                  )}
                >
                  {t === "preview" ? "Preview" : "Markdown"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => askAgent(`Rewrite parts of the article ${label} (id ${a.id}): `)}
              className="text-[13px] font-medium text-accent-ink hover:underline"
            >
              Ask for edits
            </button>
          </div>
          <div className="px-5 py-6 sm:px-8 sm:py-8">
            {!a.content_md ? (
              <p className="text-sm text-fg-3">This article has no content yet.</p>
            ) : tab === "preview" ? (
              <Markdown variant="preview" className="mx-auto max-w-[68ch]">
                {a.content_md}
              </Markdown>
            ) : (
              <pre className="scrollbar-thin overflow-x-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-fg-2">
                {a.content_md}
              </pre>
            )}
          </div>
        </Card>

        {/* Sidebar */}
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Performance" />
            <dl className="grid grid-cols-3 gap-3 px-5 pb-5 pt-4">
              {[
                ["Views", fmtNum(a.views)],
                ["Clicks", fmtNum(a.clicks)],
                ["CTR", fmtPct(ctr(a.clicks, a.views))],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[12px] text-fg-3">{k}</dt>
                  <dd className="mt-1 font-mono text-[20px] tabular text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Search preview" description="How the title and meta description may appear in results" />
            <div className="px-5 pb-5 pt-4">
              <div className="rounded-xl border border-line bg-bg p-4">
                <p className="truncate text-[12px] text-fg-3">
                  rankforge › site › {session.userId} › {a.slug || "…"}
                </p>
                <p className="mt-1 text-[16px] leading-6 text-info">{a.title}</p>
                <p className="mt-1 text-[13px] leading-5 text-fg-2">
                  {a.meta_description || <span className="text-fg-3">No meta description yet.</span>}
                </p>
              </div>
              <p
                className={cn(
                  "mt-2 font-mono text-[11px]",
                  a.meta_description.length > 160 ? "text-warning" : "text-fg-3",
                )}
              >
                {a.meta_description.length} / 160 characters
              </p>
              {published ? (
                <Link
                  href={publicPath}
                  target="_blank"
                  className="mt-3 flex items-center gap-1.5 break-all font-mono text-[12px] text-accent-ink hover:underline"
                >
                  {publicPath}
                  <ExternalLink className="size-3 shrink-0" aria-hidden />
                </Link>
              ) : (
                <p className="mt-3 text-[13px] text-fg-3">Not published yet. The public address will be {publicPath}</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Affiliate links"
              description={`${a.links.length} ${a.links.length === 1 ? "link" : "links"}, tracked through /go`}
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => askAgent(`Add an affiliate link to the article ${label} (id ${a.id}): `)}
                  icon={<Link2 className="size-3.5" aria-hidden />}
                >
                  Add
                </Button>
              }
            />
            {a.links.length ? (
              <TableWrap className="mt-3">
                <Table>
                  <thead>
                    <tr>
                      <Th>Anchor</Th>
                      <Th align="right">Clicks</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...a.links]
                      .sort((x, y) => y.clicks - x.clicks)
                      .map((l) => (
                        <Tr key={l.id}>
                          <Td className="max-w-0">
                            <p className="truncate text-fg">{l.anchor || "Untitled link"}</p>
                            <a
                              href={l.url}
                              target="_blank"
                              rel="sponsored nofollow noopener"
                              className="block truncate text-[12px] text-fg-3 hover:text-fg hover:underline"
                              title={`${l.url} (tracked via ${goUrl(l.id)})`}
                            >
                              {hostOf(l.url)}
                            </a>
                          </Td>
                          <Td align="right" className="w-20 font-mono text-[13px] text-fg">
                            {fmtNum(l.clicks)}
                          </Td>
                        </Tr>
                      ))}
                  </tbody>
                </Table>
              </TableWrap>
            ) : (
              <p className="px-5 pb-5 pt-3 text-[13px] text-fg-3">No affiliate links yet. Ask the agent to add one.</p>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Fact-check"
              description={
                a.fact_checks.length ? `${verified} of ${a.fact_checks.length} claims verified` : "No claims checked yet"
              }
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => askAgent(`Fact-check the article ${label} (id ${a.id}).`)}
                  icon={<ShieldCheck className="size-3.5" aria-hidden />}
                >
                  Re-check
                </Button>
              }
            />
            {a.fact_checks.length ? (
              <ul className="mt-3 divide-y divide-line border-t border-line">
                {a.fact_checks.map((f, i) => (
                  <li key={i} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[14px] leading-5 text-fg">{f.claim}</p>
                      <FactStatus status={f.status} />
                    </div>
                    {f.sources.length ? (
                      <ul className="mt-2 space-y-1">
                        {f.sources.map((s, j) => (
                          <li key={j} className="truncate text-[12px]">
                            {/^https?:\/\//.test(s) ? (
                              <a href={s} target="_blank" rel="noopener noreferrer" className="text-fg-3 hover:text-fg hover:underline">
                                {hostOf(s)}
                              </a>
                            ) : (
                              <span className="text-fg-3">{s}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-[12px] text-fg-3">No sources listed</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-5 pt-3 text-[13px] text-fg-3">
                Ask the agent to fact-check this article before you publish it.
              </p>
            )}
          </Card>
        </div>
      </div>
    </AppPage>
  );
}

function BackLink() {
  return (
    <Link
      href="/app/articles"
      className="inline-flex h-8 items-center gap-1.5 rounded-md text-[13px] text-fg-2 transition-colors hover:text-fg"
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      Articles
    </Link>
  );
}
