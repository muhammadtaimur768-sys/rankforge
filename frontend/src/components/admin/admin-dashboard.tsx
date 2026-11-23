"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronRight,
  KeyRound,
  Lock,
  RefreshCw,
  ScrollText,
  ShieldAlert,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { fillDaily, fmtCompact, fmtDateTime, fmtMs, fmtNum, fmtRelative, fmtUsd, truncate } from "@/lib/format";
import { getAdminKey, setAdminKey } from "@/lib/session";
import { toolMeta } from "@/lib/tools";
import type { AdminArticle, AdminDaily, AdminLog, AdminOverview, AdminUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MiniDailyChart, RankedBars, type SeriesDef } from "@/components/charts/charts";
import { Markdown } from "@/components/markdown";
import { ToolCallList } from "@/components/tool-chip";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import {
  Badge,
  Card,
  CardHeader,
  FieldError,
  Input,
  Label,
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
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { StatusBadge } from "@/components/app/bits";
import { useHydrated } from "@/components/app/workspace";

type Section<T> = { data?: T; error?: unknown };

interface AdminData {
  overview: Section<AdminOverview>;
  users: Section<AdminUser[]>;
  articles: Section<AdminArticle[]>;
  logs: Section<AdminLog[]>;
}

const CHATS: SeriesDef = { key: "chats", label: "Chats", color: "var(--chart-1)", kind: "bar" };
const COST: SeriesDef = { key: "cost_usd", label: "Cost", color: "var(--chart-2)", kind: "line", format: (v) => fmtUsd(v, 4) };

/* ---------- gate ---------- */

function Gate({ onUnlock, notice }: { onUnlock: (key: string) => Promise<string | null>; notice: string | null }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!key.trim()) {
      setError("Enter the admin key");
      ref.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onUnlock(key.trim());
    setBusy(false);
    if (err) {
      setError(err);
      ref.current?.select();
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-4 py-6 sm:px-8">
      <div className="flex items-center justify-between">
        <Logo suffix="Admin" />
        <ThemeToggle />
      </div>
      <main id="main" className="flex flex-1 items-center justify-center py-12">
        <form onSubmit={submit} className="w-full max-w-sm animate-rise" noValidate>
          <div className="flex size-11 items-center justify-center rounded-xl border border-line bg-raised text-fg-3">
            <KeyRound className="size-5" strokeWidth={1.5} aria-hidden />
          </div>
          <h1 className="mt-5 text-[26px] font-medium tracking-[-0.01em] text-fg">Admin dashboard</h1>
          <p className="mt-2 text-[15px] text-fg-2">
            Enter the admin key to see usage, cost and agent logs. It is kept for this browser tab only.
          </p>
          {notice ? (
            <p className="mt-5 flex items-start gap-2 rounded-xl bg-warning-soft px-3.5 py-3 text-[13px] text-warning" role="status">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {notice}
            </p>
          ) : null}
          <div className="mt-6 space-y-2">
            <Label htmlFor="admin-key">Admin key</Label>
            <Input
              ref={ref}
              id="admin-key"
              type="password"
              autoComplete="current-password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "admin-key-error" : undefined}
            />
            <FieldError id="admin-key-error">{error}</FieldError>
          </div>
          <Button type="submit" size="lg" className="mt-5 w-full" loading={busy} icon={<Lock className="size-4" aria-hidden />}>
            Unlock
          </Button>
        </form>
      </main>
    </div>
  );
}

/* ---------- sortable users table ---------- */

type UserSortKey = keyof Pick<AdminUser, "user_id" | "articles" | "views" | "clicks" | "chats" | "cost_usd" | "last_active">;

function SortTh({
  label,
  k,
  sort,
  onSort,
  align,
}: {
  label: string;
  k: UserSortKey;
  sort: { key: UserSortKey; dir: "asc" | "desc" };
  onSort: (k: UserSortKey) => void;
  align?: "right";
}) {
  const active = sort.key === k;
  return (
    <Th align={align} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn("inline-flex items-center gap-1 hover:text-fg", active && "text-fg", align === "right" && "flex-row-reverse")}
      >
        {label}
        {active ? (
          sort.dir === "asc" ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />
        ) : null}
      </button>
    </Th>
  );
}

function UsersTable({ users }: { users: AdminUser[] }) {
  const [sort, setSort] = useState<{ key: UserSortKey; dir: "asc" | "desc" }>({ key: "last_active", dir: "desc" });
  const rows = useMemo(() => {
    const out = [...users].sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      const c = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? c : -c;
    });
    return out;
  }, [users, sort]);
  const onSort = (k: UserSortKey) =>
    setSort((s) => (s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: k === "user_id" ? "asc" : "desc" }));

  return (
    <TableWrap>
      <Table className="min-w-[860px]">
        <thead>
          <tr>
            <SortTh label="User" k="user_id" sort={sort} onSort={onSort} />
            <SortTh label="Articles" k="articles" sort={sort} onSort={onSort} align="right" />
            <SortTh label="Views" k="views" sort={sort} onSort={onSort} align="right" />
            <SortTh label="Clicks" k="clicks" sort={sort} onSort={onSort} align="right" />
            <SortTh label="Chats" k="chats" sort={sort} onSort={onSort} align="right" />
            <Th align="right">Tokens in / out</Th>
            <SortTh label="Cost" k="cost_usd" sort={sort} onSort={onSort} align="right" />
            <SortTh label="Last active" k="last_active" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <Tr key={u.user_id}>
              <Td className="font-medium text-fg">
                <a href={`/site/${encodeURIComponent(u.user_id)}`} target="_blank" rel="noopener" className="hover:underline">
                  {u.user_id}
                </a>
              </Td>
              <Td align="right" className="font-mono text-[13px]">
                {fmtNum(u.articles)} <span className="text-fg-3">/ {fmtNum(u.published)}</span>
              </Td>
              <Td align="right" className="font-mono text-[13px] text-fg">{fmtNum(u.views)}</Td>
              <Td align="right" className="font-mono text-[13px] text-fg">{fmtNum(u.clicks)}</Td>
              <Td align="right" className="font-mono text-[13px] text-fg">{fmtNum(u.chats)}</Td>
              <Td align="right" className="font-mono text-[13px]">
                {fmtCompact(u.tokens_in)} / {fmtCompact(u.tokens_out)}
              </Td>
              <Td align="right" className="font-mono text-[13px] text-fg">{fmtUsd(u.cost_usd)}</Td>
              <Td className="whitespace-nowrap text-[13px]" title={fmtDateTime(u.last_active)}>
                {fmtRelative(u.last_active)}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  );
}

/* ---------- logs ---------- */

function ToolIcons({ log }: { log: AdminLog }) {
  if (!log.tool_calls.length) return <span className="text-fg-3">—</span>;
  const shown = log.tool_calls.slice(0, 4);
  return (
    <span className="flex items-center gap-1">
      {shown.map((c, i) => {
        const m = toolMeta(c.name);
        return (
          <span
            key={i}
            title={m.label}
            className="flex size-6 items-center justify-center rounded-md border border-line bg-surface text-fg-3"
          >
            <m.icon className="size-3.5" strokeWidth={1.75} aria-label={m.label} />
          </span>
        );
      })}
      {log.tool_calls.length > shown.length ? (
        <span className="font-mono text-[11px] text-fg-3">+{log.tool_calls.length - shown.length}</span>
      ) : null}
    </span>
  );
}

function LogsTable({ logs }: { logs: AdminLog[] }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <TableWrap>
      <Table className="min-w-[1000px]">
        <thead>
          <tr>
            <Th className="w-8">
              <span className="sr-only">Expand</span>
            </Th>
            <Th>Time</Th>
            <Th>User</Th>
            <Th>Message</Th>
            <Th>Reply</Th>
            <Th>Tools</Th>
            <Th align="right">Tokens</Th>
            <Th align="right">Latency</Th>
            <Th>Flags</Th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l, idx) => {
            const id = l.id || String(idx);
            const isOpen = open.has(id);
            return (
              <Fragment key={id}>
                <Tr
                  className={cn("cursor-pointer", isOpen && "bg-raised/50", (l.blocked || l.error) && "[&>td:first-child]:shadow-[inset_2px_0_0_var(--negative)]")}
                  onClick={() => toggle(id)}
                >
                  <Td className="w-8 pr-0">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? "Collapse log entry" : "Expand log entry"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(id);
                      }}
                      className="flex size-7 items-center justify-center rounded-md text-fg-3 hover:bg-raised hover:text-fg"
                    >
                      <ChevronRight className={cn("size-4 transition-transform duration-150", isOpen && "rotate-90")} aria-hidden />
                    </button>
                  </Td>
                  <Td className="whitespace-nowrap font-mono text-[12px]" title={fmtDateTime(l.created_at)}>
                    {fmtRelative(l.created_at)}
                  </Td>
                  <Td className="whitespace-nowrap text-[13px] text-fg">{l.user_id || "—"}</Td>
                  <Td className="max-w-[16rem] truncate text-[13px] text-fg">{l.message}</Td>
                  <Td className="max-w-[18rem] truncate text-[13px]">{truncate(l.reply.replace(/\s+/g, " "), 90) || "—"}</Td>
                  <Td>
                    <ToolIcons log={l} />
                  </Td>
                  <Td align="right" className="whitespace-nowrap font-mono text-[12px]">
                    {fmtCompact(l.tokens_in)} / {fmtCompact(l.tokens_out)}
                  </Td>
                  <Td align="right" className="font-mono text-[12px]">
                    {fmtMs(l.latency_ms)}
                  </Td>
                  <Td>
                    <span className="flex gap-1">
                      {l.blocked ? (
                        <Badge tone="warning">
                          <ShieldAlert className="size-3" aria-hidden /> Blocked
                        </Badge>
                      ) : null}
                      {l.error ? (
                        <Badge tone="negative">
                          <AlertCircle className="size-3" aria-hidden /> Error
                        </Badge>
                      ) : null}
                      {!l.blocked && !l.error ? <span className="text-[12px] text-fg-3">OK</span> : null}
                    </span>
                  </Td>
                </Tr>
                {isOpen ? (
                  <tr className="bg-bg/60">
                    <td colSpan={9} className="border-b border-line px-5 py-5">
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="min-w-0 space-y-4">
                          <div>
                            <p className="text-[12px] text-fg-3">Message</p>
                            <p className="mt-1 whitespace-pre-wrap break-words text-[14px] leading-6 text-fg">{l.message || "—"}</p>
                          </div>
                          {l.error ? (
                            <div>
                              <p className="text-[12px] text-negative">Error</p>
                              <pre className="scrollbar-thin mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-negative-soft p-3 font-mono text-[12px] text-negative">
                                {l.error}
                              </pre>
                            </div>
                          ) : null}
                          {l.tool_calls.length ? (
                            <div>
                              <p className="mb-2 text-[12px] text-fg-3">Tool calls</p>
                              <ToolCallList calls={l.tool_calls} />
                            </div>
                          ) : null}
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[12px] sm:grid-cols-4">
                            {[
                              ["Thread", l.thread_id || "—"],
                              ["Tokens in", fmtNum(l.tokens_in)],
                              ["Tokens out", fmtNum(l.tokens_out)],
                              ["Latency", fmtMs(l.latency_ms)],
                            ].map(([k, v]) => (
                              <div key={k} className="min-w-0">
                                <dt className="font-sans text-fg-3">{k}</dt>
                                <dd className="truncate text-fg" title={v}>{v}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] text-fg-3">Reply</p>
                          <div className="scrollbar-thin mt-1 max-h-96 overflow-auto rounded-xl border border-line bg-surface p-4">
                            {l.reply ? <Markdown variant="chat">{l.reply}</Markdown> : <p className="text-sm text-fg-3">No reply</p>}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </Table>
    </TableWrap>
  );
}

/* ---------- dashboard ---------- */

function SectionCard({
  id,
  title,
  description,
  action,
  section,
  loading,
  onRetry,
  children,
  emptyText,
  isEmpty,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  section: Section<unknown>;
  loading: boolean;
  onRetry: () => void;
  children: ReactNode;
  emptyText: string;
  isEmpty: boolean;
}) {
  return (
    <Card id={id} className="min-w-0 scroll-mt-20">
      <CardHeader title={title} description={description} action={action} />
      <div className="mt-3">
        {section.data === undefined && loading ? (
          <SkeletonRows className="px-5 pb-5" />
        ) : section.data === undefined && section.error ? (
          <ErrorState compact title={`Couldn't load ${title.toLowerCase()}`} error={section.error} onRetry={onRetry} />
        ) : isEmpty ? (
          <p className="px-5 pb-6 text-[13px] text-fg-3">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

export function AdminDashboard() {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="min-h-dvh px-4 py-6 sm:px-8" role="status" aria-label="Loading">
        <Skeleton className="h-6 w-40" />
      </div>
    );
  }
  return <AdminDashboardInner />;
}

function AdminDashboardInner() {
  const [key, setKey] = useState<string | null>(() => getAdminKey());
  const [notice, setNotice] = useState<string | null>(null);
  const [data, setData] = useState<AdminData>({ overview: {}, users: {}, articles: {}, logs: {} });
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [logUser, setLogUser] = useState("");
  const [logLimit, setLogLimit] = useState(50);

  const lock = useCallback((message: string | null) => {
    setAdminKey(null);
    setKey(null);
    setNotice(message);
    setData({ overview: {}, users: {}, articles: {}, logs: {} });
  }, []);

  const loadAll = useCallback(
    async (k: string, logParams: { userId: string; limit: number }) => {
      setLoading(true);
      const [overview, users, articles, logs] = await Promise.allSettled([
        api.admin.overview(k, { quiet: true }),
        api.admin.users(k, { quiet: true }),
        api.admin.articles(k, { quiet: true }),
        api.admin.logs(k, { limit: logParams.limit, userId: logParams.userId || undefined }, { quiet: true }),
      ]);
      const rejected = [overview, users, articles, logs].find(
        (r): r is PromiseRejectedResult => r.status === "rejected" && r.reason instanceof ApiError && r.reason.status === 401,
      );
      setLoading(false);
      if (rejected) {
        lock("The admin key was rejected. Enter it again.");
        return;
      }
      const sec = <T,>(r: PromiseSettledResult<T>, prev: Section<T>): Section<T> =>
        r.status === "fulfilled" ? { data: r.value } : { data: prev.data, error: r.reason };
      setData((d) => ({
        overview: sec(overview, d.overview),
        users: sec(users, d.users),
        articles: sec(articles, d.articles),
        logs: sec(logs, d.logs),
      }));
      setUpdatedAt(new Date().toISOString());
    },
    [lock],
  );

  const reloadLogs = useCallback(
    async (k: string, params: { userId: string; limit: number }) => {
      setLogsLoading(true);
      try {
        const logs = await api.admin.logs(k, { limit: params.limit, userId: params.userId || undefined }, { quiet: true });
        setData((d) => ({ ...d, logs: { data: logs } }));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) lock("The admin key was rejected. Enter it again.");
        else setData((d) => ({ ...d, logs: { data: d.logs.data, error: err } }));
      } finally {
        setLogsLoading(false);
      }
    },
    [lock],
  );

  // Initial load when a key is already stored for this tab.
  const initialKey = useRef(key);
  useEffect(() => {
    if (initialKey.current) void loadAll(initialKey.current, { userId: "", limit: 50 });
  }, [loadAll]);

  async function unlock(k: string): Promise<string | null> {
    try {
      await api.admin.overview(k, { quiet: true });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return "That key was rejected. Check it and try again.";
      if (err instanceof ApiError && (err.kind === "network" || err.kind === "timeout")) return `${err.message}.`;
      return err instanceof Error ? err.message : "Couldn't verify the key";
    }
    setAdminKey(k);
    setKey(k);
    setNotice(null);
    void loadAll(k, { userId: logUser, limit: logLimit });
    return null;
  }

  const ov = data.overview.data;
  const daily = useMemo(
    () =>
      fillDaily<AdminDaily>(ov?.daily ?? [], Math.max(14, Math.min(30, ov?.daily.length ?? 14)), (date) => ({
        date,
        chats: 0,
        tokens_in: 0,
        tokens_out: 0,
        cost_usd: 0,
      })),
    [ov],
  );
  const toolItems = useMemo(
    () =>
      [...(ov?.tool_usage ?? [])]
        .sort((a, b) => b.count - a.count)
        .map((t) => {
          const m = toolMeta(t.name);
          return {
            key: t.name,
            value: t.count,
            label: (
              <span className="inline-flex items-center gap-2">
                <m.icon className="size-3.5 text-fg-3" strokeWidth={1.75} aria-hidden />
                {m.label}
                <code className="hidden font-mono text-[11px] text-fg-3 sm:inline">{t.name}</code>
              </span>
            ),
          };
        }),
    [ov],
  );
  const articles = useMemo(
    () => [...(data.articles.data ?? [])].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
    [data.articles.data],
  );

  if (!key) return <Gate onUnlock={unlock} notice={notice} />;

  const t = ov?.totals;
  const periodChats = daily.reduce((n, d) => n + d.chats, 0);
  const periodCost = daily.reduce((n, d) => n + d.cost_usd, 0);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Logo href="/admin" suffix="Admin" />
          <nav aria-label="Admin sections" className="ml-4 hidden items-center gap-1 lg:flex">
            {[
              ["#overview", "Overview"],
              ["#usage", "Usage"],
              ["#users", "Users"],
              ["#articles", "Articles"],
              ["#logs", "Logs"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-md px-2.5 py-1.5 text-[13px] text-fg-2 transition-colors hover:text-fg">
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {updatedAt ? (
              <span className="hidden font-mono text-[11px] text-fg-3 sm:inline">updated {fmtRelative(updatedAt)}</span>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              loading={loading}
              onClick={() => void loadAll(key, { userId: logUser, limit: logLimit })}
              icon={<RefreshCw className="size-3.5" aria-hidden />}
            >
              Refresh
            </Button>
            <ThemeToggle className="hidden sm:inline-flex" />
            <Button size="icon-sm" variant="ghost" onClick={() => lock(null)} aria-label="Lock dashboard" title="Lock" icon={<Lock className="size-4" aria-hidden />} />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-medium leading-tight text-fg sm:text-[28px]">Operations</h1>
            <p className="mt-1.5 text-sm text-fg-2">Usage, cost and agent behavior across every RankForge account.</p>
          </div>
        </div>

        {/* KPIs */}
        <section id="overview" aria-label="Totals" className="mt-6 scroll-mt-20">
          {data.overview.error && !ov ? (
            <Card>
              <ErrorState
                compact
                title="Couldn't load totals"
                error={data.overview.error}
                onRetry={() => void loadAll(key, { userId: logUser, limit: logLimit })}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
              {!t ? (
                Array.from({ length: 10 }).map((_, i) => <StatTileSkeleton key={i} />)
              ) : (
                <>
                  <StatTile label="Users" value={fmtNum(t.users)} />
                  <StatTile label="Articles" value={fmtNum(t.articles)} hint={`${fmtNum(t.views)} views · ${fmtNum(t.clicks)} clicks`} />
                  <StatTile label="Published" value={fmtNum(t.published)} hint={t.articles ? `${Math.round((t.published / t.articles) * 100)}% of articles` : undefined} />
                  <StatTile label="Chats" value={fmtNum(t.chats)} />
                  <StatTile label="Estimated cost" value={fmtUsd(t.cost_usd, 4)} hint="USD, all time" emphasis />
                  <StatTile label="Tokens in" value={fmtCompact(t.tokens_in)} hint={fmtNum(t.tokens_in)} />
                  <StatTile label="Tokens out" value={fmtCompact(t.tokens_out)} hint={fmtNum(t.tokens_out)} />
                  <StatTile label="Avg latency" value={fmtMs(t.avg_latency_ms)} hint="Per chat turn" />
                  <StatTile label="Blocked requests" value={fmtNum(t.blocked)} hint="Stopped by guardrails" />
                  <StatTile
                    label="Errors"
                    value={<span className={t.errors ? "text-negative" : undefined}>{fmtNum(t.errors)}</span>}
                    hint={t.chats ? `${((t.errors / t.chats) * 100).toFixed(1)}% of chats` : undefined}
                  />
                </>
              )}
            </div>
          )}
        </section>

        {/* Usage charts */}
        <section id="usage" aria-label="Usage" className="mt-6 grid scroll-mt-20 gap-6 xl:grid-cols-[1fr_1fr_0.9fr]">
          <Card className="min-w-0">
            <CardHeader title="Chats per day" description={ov ? <span className="font-mono">{fmtNum(periodChats)} in this period</span> : "Daily chat turns"} />
            <div className="px-3 pb-4 pt-4 sm:px-5">
              {!ov ? (
                <Skeleton className="h-[200px] rounded-xl" />
              ) : periodChats === 0 ? (
                <p className="flex h-[200px] items-center justify-center text-[13px] text-fg-3">No chats yet</p>
              ) : (
                <MiniDailyChart data={daily} series={CHATS} ariaLabel={`Chats per day, ${periodChats} in total`} />
              )}
            </div>
          </Card>
          <Card className="min-w-0">
            <CardHeader title="Cost per day" description={ov ? <span className="font-mono">{fmtUsd(periodCost, 4)} in this period</span> : "Estimated USD"} />
            <div className="px-3 pb-4 pt-4 sm:px-5">
              {!ov ? (
                <Skeleton className="h-[200px] rounded-xl" />
              ) : periodCost === 0 ? (
                <p className="flex h-[200px] items-center justify-center text-[13px] text-fg-3">No spend yet</p>
              ) : (
                <MiniDailyChart data={daily} series={COST} ariaLabel={`Estimated cost per day, ${fmtUsd(periodCost)} in total`} />
              )}
            </div>
          </Card>
          <Card className="min-w-0">
            <CardHeader title="Tool usage" description="Calls per tool, all time" />
            <div className="px-5 pb-5 pt-4">
              {!ov ? (
                <SkeletonRows rows={5} />
              ) : toolItems.length ? (
                <RankedBars items={toolItems} />
              ) : (
                <p className="text-[13px] text-fg-3">No tool calls yet</p>
              )}
            </div>
          </Card>
        </section>

        {/* Users */}
        <div id="users" className="mt-6 scroll-mt-20">
          <SectionCard
            title="Users"
            description={data.users.data ? `${data.users.data.length} accounts` : undefined}
            section={data.users}
            loading={loading}
            onRetry={() => void loadAll(key, { userId: logUser, limit: logLimit })}
            isEmpty={!data.users.data?.length}
            emptyText="No users have signed up yet."
          >
            <UsersTable users={data.users.data ?? []} />
          </SectionCard>
        </div>

        {/* Articles */}
        <div id="articles" className="mt-6 scroll-mt-20">
          <SectionCard
            title="Articles"
            description={data.articles.data ? `${data.articles.data.length} total, newest first` : undefined}
            section={data.articles}
            loading={loading}
            onRetry={() => void loadAll(key, { userId: logUser, limit: logLimit })}
            isEmpty={!articles.length}
            emptyText="No articles have been written yet."
          >
            <TableWrap className="max-h-[480px] overflow-y-auto">
              <Table className="min-w-[860px]">
                <thead className="sticky top-0 z-10 bg-surface">
                  <tr>
                    <Th>Title</Th>
                    <Th>User</Th>
                    <Th>Status</Th>
                    <Th align="right">Words</Th>
                    <Th align="right">Views</Th>
                    <Th align="right">Clicks</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((a) => (
                    <Tr key={a.id}>
                      <Td className="max-w-[24rem]">
                        <span className="block truncate font-medium text-fg">{a.title}</span>
                        <span className="block truncate text-[12px] text-fg-3">{a.keyword || "—"}</span>
                      </Td>
                      <Td className="text-[13px]">{a.user_id}</Td>
                      <Td>
                        <StatusBadge status={a.status} />
                      </Td>
                      <Td align="right" className="font-mono text-[13px]">{fmtNum(a.word_count)}</Td>
                      <Td align="right" className="font-mono text-[13px] text-fg">{fmtNum(a.views)}</Td>
                      <Td align="right" className="font-mono text-[13px] text-fg">{fmtNum(a.clicks)}</Td>
                      <Td className="whitespace-nowrap text-[13px]">{fmtRelative(a.created_at)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          </SectionCard>
        </div>

        {/* Logs */}
        <div id="logs" className="mt-6 scroll-mt-20">
          <Card className="min-w-0">
            <CardHeader
              title="Agent logs"
              description="Most recent turns. Select a row to see the full message, reply and tool arguments."
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="log-user" className="sr-only">
                    Filter by user
                  </label>
                  <select
                    id="log-user"
                    value={logUser}
                    onChange={(e) => {
                      setLogUser(e.target.value);
                      void reloadLogs(key, { userId: e.target.value, limit: logLimit });
                    }}
                    className="h-8 rounded-lg border border-line-strong bg-surface px-2 text-[13px] text-fg"
                  >
                    <option value="">All users</option>
                    {(data.users.data ?? []).map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.user_id}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="log-limit" className="sr-only">
                    Number of entries
                  </label>
                  <select
                    id="log-limit"
                    value={logLimit}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setLogLimit(n);
                      void reloadLogs(key, { userId: logUser, limit: n });
                    }}
                    className="h-8 rounded-lg border border-line-strong bg-surface px-2 text-[13px] text-fg"
                  >
                    {[25, 50, 100, 200].map((n) => (
                      <option key={n} value={n}>
                        Last {n}
                      </option>
                    ))}
                  </select>
                  {logsLoading ? <RefreshCw className="size-3.5 animate-spin text-fg-3" aria-label="Loading logs" /> : null}
                </div>
              }
            />
            <div className="mt-3">
              {data.logs.data === undefined && (loading || logsLoading) ? (
                <SkeletonRows className="px-5 pb-5" rows={6} />
              ) : data.logs.data === undefined && data.logs.error ? (
                <ErrorState compact title="Couldn't load logs" error={data.logs.error} onRetry={() => void reloadLogs(key, { userId: logUser, limit: logLimit })} />
              ) : !data.logs.data?.length ? (
                <EmptyState icon={ScrollText} title="No log entries" description={logUser ? `No turns recorded for ${logUser}.` : "Agent turns will appear here as people chat."} />
              ) : (
                <LogsTable logs={data.logs.data} />
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
