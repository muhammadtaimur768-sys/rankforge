/*
  RankForge API client. Every backend call goes through `request()`.

  - Works in the browser and in server components (public site pages).
  - Normalises network failures, timeouts and HTTP errors into `ApiError`.
  - 401 on a customer call clears the session and sends the user to /login.
  - 401 on an admin call clears the stored admin key.
  - Browser-side failures raise a toast unless the caller passes `quiet`.
*/

import { API_URL } from "./config";
import { clearSession, getAdminKey, getSession, setAdminKey } from "./session";
import { toast } from "./toast";
import type {
  AdminArticle,
  AdminLog,
  AdminOverview,
  AdminUser,
  Article,
  ArticleDetail,
  AuthResponse,
  ChatResponse,
  KeywordResearch,
  Me,
  Performance,
  PublicArticle,
  PublicSite,
  PublicSiteSummary,
  RankCheck,
  ThreadDetail,
  ThreadSummary,
  ToolCall,
} from "./types";

export type ApiErrorKind = "network" | "timeout" | "http" | "parse" | "auth";

export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  readonly detail: unknown;

  constructor(message: string, opts: { status?: number; kind: ApiErrorKind; detail?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.status = opts.status ?? 0;
    this.kind = opts.kind;
    this.detail = opts.detail;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

type AuthMode = "none" | "user" | "admin";

export interface RequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  auth?: AuthMode;
  /** Explicit admin key; falls back to the one in sessionStorage. */
  adminKey?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Suppress toasts (caller renders its own error state). 401 handling still runs. */
  quiet?: boolean;
  /** Parse the body as text instead of JSON. */
  text?: boolean;
}

const isBrowser = typeof window !== "undefined";

function describeHost() {
  try {
    return new URL(API_URL).host;
  } catch {
    return API_URL;
  }
}

/** Pull a readable message out of FastAPI-style error bodies. */
function extractDetail(body: unknown): string | null {
  if (!body) return null;
  if (typeof body === "string") return body.slice(0, 300);
  if (typeof body === "object") {
    const b = body as Record<string, unknown>;
    const d = b.detail ?? b.error ?? b.message;
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d.length) {
      const first = d[0] as Record<string, unknown>;
      if (typeof first?.msg === "string") {
        const loc = Array.isArray(first.loc) ? first.loc.filter((x) => x !== "body").join(".") : "";
        return loc ? `${loc}: ${first.msg}` : first.msg;
      }
    }
  }
  return null;
}

function statusMessage(status: number): string {
  if (status === 400) return "The request was rejected";
  if (status === 401) return "You need to log in again";
  if (status === 403) return "You don't have access to this";
  if (status === 404) return "Not found";
  if (status === 409) return "That already exists";
  if (status === 422) return "Some fields are invalid";
  if (status === 429) return "Too many requests. Wait a moment and try again";
  if (status >= 500) return "The server hit an error";
  return `Request failed (${status})`;
}

let redirecting = false;

/**
 * Clearing the session is enough to log out: the workspace guard
 * (WorkspaceProvider) watches the session and sends the user to /login?next=…
 */
function handleUserUnauthorized() {
  const hadSession = !!getSession();
  clearSession();
  if (!isBrowser || redirecting || !hadSession) return;
  if (window.location.pathname.startsWith("/login") || window.location.pathname.startsWith("/signup")) return;
  redirecting = true;
  toast.error("Session expired", "Log in again to continue.");
  window.setTimeout(() => {
    redirecting = false;
  }, 2000);
}

function timeoutSignal(ms: number, outer?: AbortSignal): { signal: AbortSignal; cleanup: () => void; timedOut: () => boolean } {
  const ctrl = new AbortController();
  let didTimeout = false;
  const timer = setTimeout(() => {
    didTimeout = true;
    ctrl.abort();
  }, ms);
  const onAbort = () => ctrl.abort();
  if (outer) {
    if (outer.aborted) ctrl.abort();
    else outer.addEventListener("abort", onAbort, { once: true });
  }
  return {
    signal: ctrl.signal,
    timedOut: () => didTimeout,
    cleanup: () => {
      clearTimeout(timer);
      outer?.removeEventListener("abort", onAbort);
    },
  };
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = "none", timeoutMs = 20000, quiet = false } = opts;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth === "user") {
    const session = getSession();
    if (!session) {
      handleUserUnauthorized();
      throw new ApiError("You need to log in", { status: 401, kind: "auth" });
    }
    headers.Authorization = `Bearer ${session.token}`;
  } else if (auth === "admin") {
    const key = opts.adminKey ?? getAdminKey();
    if (!key) throw new ApiError("Admin key required", { status: 401, kind: "auth" });
    headers["X-Admin-Key"] = key;
  }

  const t = timeoutSignal(timeoutMs, opts.signal);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: t.signal,
      cache: "no-store",
    });
  } catch (err) {
    t.cleanup();
    if (opts.signal?.aborted) throw err;
    const timedOut = t.timedOut();
    const e = timedOut
      ? new ApiError(`The API took longer than ${Math.round(timeoutMs / 1000)}s to respond`, { kind: "timeout" })
      : new ApiError(`Can't reach the RankForge API at ${describeHost()}`, { kind: "network", detail: err });
    if (isBrowser && !quiet) {
      toast.error(timedOut ? "Request timed out" : "Connection problem", e.message);
    }
    throw e;
  }
  t.cleanup();

  if (!res.ok) {
    let parsed: unknown = null;
    try {
      const raw = await res.text();
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = raw;
      }
    } catch {
      /* ignore body read errors */
    }
    const message = extractDetail(parsed) ?? statusMessage(res.status);
    const e = new ApiError(message, { status: res.status, kind: "http", detail: parsed });

    if (res.status === 401 && auth === "user") {
      handleUserUnauthorized();
      throw e;
    }
    if (res.status === 401 && auth === "admin") {
      setAdminKey(null);
      throw e;
    }
    if (isBrowser && !quiet) toast.error(statusMessage(res.status), message !== statusMessage(res.status) ? message : undefined);
    throw e;
  }

  if (opts.text) return (await res.text()) as T;
  if (res.status === 204) return undefined as T;
  try {
    return (await res.json()) as T;
  } catch (err) {
    const e = new ApiError("The API returned a response we couldn't read", { status: res.status, kind: "parse", detail: err });
    if (isBrowser && !quiet) toast.error("Unexpected response", e.message);
    throw e;
  }
}

/* ---------- normalisers: the backend is young, so tolerate missing fields ---------- */

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0);
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const optStr = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function branding(r: Record<string, unknown>) {
  return { tagline: optStr(r.tagline), accent: optStr(r.accent), audience: optStr(r.audience), about: optStr(r.about) };
}

/**
 * Tracked affiliate URLs sometimes come back with the backend's local origin
 * (e.g. http://localhost:7860/go/3). Point them at the configured API instead.
 */
export function fixTrackedUrl(href: string): string {
  const m = href.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/go\/[^?#\s]+)/i);
  if (m) return `${API_URL}${m[1]}`;
  if (href.startsWith("/go/")) return `${API_URL}${href}`;
  return href;
}

function normToolCalls(v: unknown): ToolCall[] {
  return arr<Record<string, unknown>>(v)
    .filter((c) => c && typeof c === "object")
    .map((c) => ({
      name: str(c.name) || "tool",
      args: c.args && typeof c.args === "object" ? (c.args as Record<string, unknown>) : {},
    }));
}

function normChat(v: unknown): ChatResponse {
  const r = (v ?? {}) as Record<string, unknown>;
  const tokens = (r.tokens ?? {}) as Record<string, unknown>;
  return {
    reply: str(r.reply),
    tool_calls: normToolCalls(r.tool_calls),
    tokens: { in: num(tokens.in), out: num(tokens.out) },
  };
}

function normArticle<T extends Article>(a: Record<string, unknown>): T {
  return {
    ...a,
    id: str(a.id),
    title: str(a.title) || "Untitled",
    slug: str(a.slug),
    keyword: str(a.keyword),
    status: a.status === "published" ? "published" : "draft",
    word_count: num(a.word_count),
    views: num(a.views),
    clicks: num(a.clicks),
    meta_description: str(a.meta_description),
    created_at: (a.created_at as string) ?? null,
    published_at: (a.published_at as string) ?? null,
    url: (a.url as string) ?? null,
  } as T;
}

/* ---------- endpoints ---------- */

const enc = encodeURIComponent;

export const api = {
  health: () => request<string>("/health", { text: true, quiet: true, timeoutMs: 8000 }),

  auth: {
    signup: (username: string, password: string) =>
      request<AuthResponse>("/api/auth/signup", { method: "POST", body: { username, password }, quiet: true }),
    login: (username: string, password: string) =>
      request<AuthResponse>("/api/auth/login", { method: "POST", body: { username, password }, quiet: true }),
  },

  me: {
    get: async (o: Pick<RequestOptions, "quiet" | "signal"> = {}) => {
      const r = await request<Record<string, unknown>>("/api/me", { auth: "user", ...o });
      const s = (r.stats ?? {}) as Record<string, unknown>;
      const memory: Record<string, string> = {};
      Object.entries((r.memory ?? {}) as Record<string, unknown>).forEach(([k, v]) => {
        memory[k] = typeof v === "string" ? v : JSON.stringify(v);
      });
      return {
        user_id: str(r.user_id),
        memory,
        stats: {
          articles: num(s.articles),
          published: num(s.published),
          views: num(s.views),
          clicks: num(s.clicks),
          keywords_researched: num(s.keywords_researched),
          chats: num(s.chats),
          tokens_in: num(s.tokens_in),
          tokens_out: num(s.tokens_out),
        },
      } satisfies Me;
    },

    chat: async (threadId: string, message: string, o: Pick<RequestOptions, "signal"> = {}) =>
      normChat(
        await request<unknown>("/api/me/chat", {
          method: "POST",
          auth: "user",
          body: { thread_id: threadId, message },
          timeoutMs: 180000,
          ...o,
        }),
      ),

    threads: async (o: Pick<RequestOptions, "quiet" | "signal"> = {}) =>
      arr<Record<string, unknown>>(await request<unknown>("/api/me/threads", { auth: "user", ...o })).map(
        (t): ThreadSummary => ({
          thread_id: str(t.thread_id),
          title: str(t.title),
          last_at: (t.last_at as string) ?? null,
          messages: num(t.messages),
        }),
      ),

    thread: async (id: string, o: Pick<RequestOptions, "quiet" | "signal"> = {}): Promise<ThreadDetail> => {
      const r = await request<Record<string, unknown>>(`/api/me/threads/${enc(id)}`, { auth: "user", ...o });
      return {
        thread_id: str(r.thread_id) || id,
        messages: arr<Record<string, unknown>>(r.messages).map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: str(m.content),
          tool_calls: normToolCalls(m.tool_calls),
        })),
      };
    },

    articles: async (o: Pick<RequestOptions, "quiet" | "signal"> = {}) =>
      arr<Record<string, unknown>>(await request<unknown>("/api/me/articles", { auth: "user", ...o })).map((a) =>
        normArticle<Article>(a),
      ),

    article: async (id: string, o: Pick<RequestOptions, "quiet" | "signal"> = {}) => {
      const r = await request<Record<string, unknown>>(`/api/me/articles/${enc(id)}`, { auth: "user", ...o });
      const base = normArticle<ArticleDetail>(r);
      return {
        ...base,
        content_md: str(r.content_md),
        links: arr<Record<string, unknown>>(r.links).map((l) => ({
          id: str(l.id),
          anchor: str(l.anchor),
          url: str(l.url),
          clicks: num(l.clicks),
        })),
        fact_checks: arr<Record<string, unknown>>(r.fact_checks).map((f) => ({
          claim: str(f.claim),
          status: str(f.status) || "unverified",
          sources: arr<unknown>(f.sources).map(str).filter(Boolean),
        })),
      } satisfies ArticleDetail;
    },

    keywords: async (o: Pick<RequestOptions, "quiet" | "signal"> = {}) =>
      arr<Record<string, unknown>>(await request<unknown>("/api/me/keywords", { auth: "user", ...o })).map(
        (k): KeywordResearch => ({
          id: str(k.id),
          seed: str(k.seed),
          created_at: (k.created_at as string) ?? null,
          results: arr<Record<string, unknown>>(k.results).map((r) => ({
            keyword: str(r.keyword),
            intent: str(r.intent) || "unknown",
            difficulty_est: num(r.difficulty_est),
            opportunity: num(r.opportunity),
          })),
        }),
      ),

    ranks: async (o: Pick<RequestOptions, "quiet" | "signal"> = {}) =>
      arr<Record<string, unknown>>(await request<unknown>("/api/me/ranks", { auth: "user", ...o })).map(
        (r): RankCheck => ({
          keyword: str(r.keyword),
          domain: str(r.domain),
          position: r.position === null || r.position === undefined ? null : num(r.position),
          checked_at: (r.checked_at as string) ?? null,
        }),
      ),

    performance: async (o: Pick<RequestOptions, "quiet" | "signal"> = {}): Promise<Performance> => {
      const r = await request<Record<string, unknown>>("/api/me/performance", { auth: "user", ...o });
      return {
        daily: arr<Record<string, unknown>>(r.daily).map((d) => ({
          date: str(d.date),
          views: num(d.views),
          clicks: num(d.clicks),
        })),
        articles: arr<Record<string, unknown>>(r.articles).map((a) => ({
          id: str(a.id),
          title: str(a.title) || "Untitled",
          views: num(a.views),
          clicks: num(a.clicks),
          ctr_pct: num(a.ctr_pct),
        })),
      };
    },

    deleteMemory: (key: string) =>
      request<{ ok: boolean }>(`/api/me/memory/${enc(key)}`, { method: "DELETE", auth: "user" }),
  },

  /** Public affiliate site. Called from server components; never toasts. */
  public: {
    sites: async (o: Pick<RequestOptions, "timeoutMs"> = {}) =>
      arr<Record<string, unknown>>(
        await request<unknown>("/api/public/sites", { quiet: true, timeoutMs: o.timeoutMs ?? 8000 }),
      ).map(
        (s): PublicSiteSummary => ({
          user_id: str(s.user_id),
          site_name: str(s.site_name) || str(s.user_id),
          published: num(s.published),
          last_published: (s.last_published as string) ?? null,
          tagline: optStr(s.tagline),
          accent: optStr(s.accent),
          niche: optStr(s.niche),
        }),
      ),

    site: async (userId: string): Promise<PublicSite> => {
      const r = await request<Record<string, unknown>>(`/api/public/site/${enc(userId)}`, { quiet: true, timeoutMs: 10000 });
      return {
        user_id: str(r.user_id) || userId,
        site_name: str(r.site_name) || userId,
        niche: optStr(r.niche),
        ...branding(r),
        articles: arr<Record<string, unknown>>(r.articles).map((a) => ({
          title: str(a.title) || "Untitled",
          slug: str(a.slug),
          meta_description: str(a.meta_description),
          keyword: str(a.keyword),
          word_count: num(a.word_count),
          published_at: (a.published_at as string) ?? null,
          views: a.views === undefined || a.views === null ? null : num(a.views),
        })),
        popular: arr<Record<string, unknown>>(r.popular)
          .map((p) => ({
            title: str(p.title),
            slug: str(p.slug),
            views: p.views === undefined || p.views === null ? null : num(p.views),
          }))
          .filter((p) => p.slug && p.title),
      };
    },

    article: async (userId: string, slug: string): Promise<PublicArticle> => {
      const r = await request<Record<string, unknown>>(`/api/public/site/${enc(userId)}/${enc(slug)}`, {
        quiet: true,
        timeoutMs: 10000,
      });
      return {
        title: str(r.title) || "Untitled",
        slug: str(r.slug) || slug,
        meta_description: str(r.meta_description),
        content_md: str(r.content_md),
        keyword: str(r.keyword),
        word_count: num(r.word_count),
        published_at: (r.published_at as string) ?? null,
        user_id: str(r.user_id) || userId,
        site_name: str(r.site_name) || userId,
        niche: optStr(r.niche),
        ...branding(r),
        links: arr<Record<string, unknown>>(r.links)
          .map((l) => ({ anchor: str(l.anchor), href: fixTrackedUrl(str(l.href || l.url)) }))
          .filter((l) => l.anchor && l.href),
        related: arr<Record<string, unknown>>(r.related)
          .map((x) => ({
            title: str(x.title),
            slug: str(x.slug),
            meta_description: str(x.meta_description),
            published_at: (x.published_at as string) ?? null,
          }))
          .filter((x) => x.slug && x.title && x.slug !== slug)
          .slice(0, 3),
      };
    },
  },

  admin: {
    overview: async (key?: string, o: Pick<RequestOptions, "quiet"> = {}): Promise<AdminOverview> => {
      const r = await request<Record<string, unknown>>("/api/admin/overview", { auth: "admin", adminKey: key, ...o });
      const t = (r.totals ?? {}) as Record<string, unknown>;
      return {
        totals: {
          users: num(t.users),
          articles: num(t.articles),
          published: num(t.published),
          views: num(t.views),
          clicks: num(t.clicks),
          chats: num(t.chats),
          tokens_in: num(t.tokens_in),
          tokens_out: num(t.tokens_out),
          cost_usd: num(t.cost_usd),
          blocked: num(t.blocked),
          errors: num(t.errors),
          avg_latency_ms: num(t.avg_latency_ms),
        },
        daily: arr<Record<string, unknown>>(r.daily).map((d) => ({
          date: str(d.date),
          chats: num(d.chats),
          tokens_in: num(d.tokens_in),
          tokens_out: num(d.tokens_out),
          cost_usd: num(d.cost_usd),
        })),
        tool_usage: arr<Record<string, unknown>>(r.tool_usage).map((u) => ({ name: str(u.name), count: num(u.count) })),
      };
    },

    users: async (key?: string, o: Pick<RequestOptions, "quiet"> = {}) =>
      arr<Record<string, unknown>>(await request<unknown>("/api/admin/users", { auth: "admin", adminKey: key, ...o })).map(
        (u): AdminUser => ({
          user_id: str(u.user_id),
          articles: num(u.articles),
          published: num(u.published),
          views: num(u.views),
          clicks: num(u.clicks),
          chats: num(u.chats),
          tokens_in: num(u.tokens_in),
          tokens_out: num(u.tokens_out),
          cost_usd: num(u.cost_usd),
          last_active: (u.last_active as string) ?? null,
        }),
      ),

    logs: async (key?: string, params: { limit?: number; userId?: string } = {}, o: Pick<RequestOptions, "quiet"> = {}) => {
      const q = new URLSearchParams({ limit: String(params.limit ?? 50) });
      if (params.userId) q.set("user_id", params.userId);
      return arr<Record<string, unknown>>(
        await request<unknown>(`/api/admin/logs?${q.toString()}`, { auth: "admin", adminKey: key, ...o }),
      ).map(
        (l): AdminLog => ({
          id: str(l.id),
          user_id: str(l.user_id),
          thread_id: str(l.thread_id),
          message: str(l.message),
          reply: str(l.reply),
          tool_calls: normToolCalls(
            typeof l.tool_calls === "string"
              ? (() => {
                  try {
                    return JSON.parse(l.tool_calls as string);
                  } catch {
                    return [];
                  }
                })()
              : l.tool_calls,
          ),
          tokens_in: num(l.tokens_in),
          tokens_out: num(l.tokens_out),
          latency_ms: num(l.latency_ms),
          blocked: Boolean(l.blocked),
          error: l.error ? str(l.error) : null,
          created_at: (l.created_at as string) ?? null,
        }),
      );
    },

    articles: async (key?: string, o: Pick<RequestOptions, "quiet"> = {}) =>
      arr<Record<string, unknown>>(
        await request<unknown>("/api/admin/articles", { auth: "admin", adminKey: key, ...o }),
      ).map(
        (a): AdminArticle => ({
          id: str(a.id),
          user_id: str(a.user_id),
          title: str(a.title) || "Untitled",
          keyword: str(a.keyword),
          status: a.status === "published" ? "published" : "draft",
          views: num(a.views),
          clicks: num(a.clicks),
          word_count: num(a.word_count),
          created_at: (a.created_at as string) ?? null,
        }),
      ),
  },
};

/** Tracked redirect for an affiliate link id. */
export const goUrl = (linkId: string) => `${API_URL}/go/${enc(linkId)}`;

export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
