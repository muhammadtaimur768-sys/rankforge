"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  AlertCircle,
  ArrowUp,
  BarChart3,
  Brain,
  Check,
  Copy,
  MessagesSquare,
  PenLine,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { fmtMs, fmtNum, fmtRelative, truncate } from "@/lib/format";
import { getPref, setPref } from "@/lib/session";
import type { ThreadSummary, TokenUsage, ToolCall } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";
import { ToolCallList } from "@/components/tool-chip";
import { LogoMark } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Kbd, Skeleton } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/states";
import { useWorkspace } from "./workspace";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls: ToolCall[];
  tokens?: TokenUsage;
  latencyMs?: number;
  failed?: string;
}

type LoadState = { status: "loading" } | { status: "ready" } | { status: "error"; error: unknown };

const rand = (n: number) => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  bytes.forEach((b) => (s += chars[b % chars.length]));
  return s;
};
const newThreadId = () => `t_${rand(10)}`;
const newMsgId = () => `m_${rand(8)}`;

const STARTERS = [
  { icon: Search, text: "Research keywords for budget hiking gear", send: true },
  { icon: PenLine, text: "Write an article about ", label: "Write an article about…", send: false },
  { icon: BarChart3, text: "How are my articles performing?", send: true },
  { icon: Brain, text: "What do you remember about me?", send: true },
];

/* ---------- small pieces ---------- */

function ThinkingRow({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.floor((now - startedAt) / 1000));
  return (
    <div className="flex gap-3" role="status" aria-live="polite">
      <LogoMark className="mt-0.5 size-7 shrink-0" />
      <div className="flex h-9 items-center gap-3 rounded-xl border border-line bg-surface px-3.5">
        <span className="flex items-center gap-1" aria-hidden>
          <span className="size-1.5 animate-dot rounded-full bg-fg-3" />
          <span className="size-1.5 animate-dot rounded-full bg-fg-3 [animation-delay:150ms]" />
          <span className="size-1.5 animate-dot rounded-full bg-fg-3 [animation-delay:300ms]" />
        </span>
        <span className="text-[13px] text-fg-2">Agent is working</span>
        <span className="font-mono text-[12px] tabular text-fg-3">{secs}s</span>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-[12px] text-fg-3 transition-colors hover:bg-raised hover:text-fg"
      aria-label={copied ? "Copied" : "Copy reply"}
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

function MessageRow({ m, onRetry, retryDisabled }: { m: UiMessage; onRetry: (m: UiMessage) => void; retryDisabled: boolean }) {
  if (m.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <div
          className={cn(
            "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-6 sm:max-w-[75%]",
            m.failed ? "border border-negative/30 bg-negative-soft text-fg" : "bg-raised text-fg",
          )}
        >
          {m.content}
        </div>
        {m.failed ? (
          <div className="flex items-center gap-2 text-[12px] text-negative">
            <AlertCircle className="size-3.5" aria-hidden />
            <span>Not sent: {m.failed}</span>
            <button
              type="button"
              onClick={() => onRetry(m)}
              disabled={retryDisabled}
              className="inline-flex h-7 items-center gap-1 rounded-md px-1.5 font-medium text-fg hover:bg-raised disabled:opacity-50"
            >
              <RotateCcw className="size-3" aria-hidden /> Retry
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <LogoMark className="mt-0.5 size-7 shrink-0" />
      <div className="min-w-0 flex-1 space-y-3">
        {m.tool_calls.length ? <ToolCallList calls={m.tool_calls} /> : null}
        {m.content ? (
          <Markdown variant="chat" className="text-fg-2">
            {m.content}
          </Markdown>
        ) : (
          <p className="text-sm text-fg-3">The agent finished without a written reply.</p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {m.tokens ? (
            <span className="font-mono text-[11px] tabular text-fg-3" title="Tokens in / out for this turn">
              {fmtNum(m.tokens.in)} in · {fmtNum(m.tokens.out)} out tokens
            </span>
          ) : null}
          {m.latencyMs ? <span className="font-mono text-[11px] tabular text-fg-3">{fmtMs(m.latencyMs)}</span> : null}
          {m.content ? <CopyButton text={m.content} /> : null}
        </div>
      </div>
    </div>
  );
}

function ThreadList({
  threads,
  error,
  activeId,
  onSelect,
  onNew,
  onRetry,
  busyId,
}: {
  threads: ThreadSummary[] | null;
  error: unknown;
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRetry: () => void;
  busyId: string | null;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line px-4">
        <h2 className="text-[14px] font-medium text-fg">Threads</h2>
        <Button size="sm" variant="secondary" onClick={onNew} icon={<Plus className="size-3.5" aria-hidden />}>
          New chat
        </Button>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
        {error && !threads ? (
          <ErrorState compact title="Couldn't load threads" error={error} onRetry={onRetry} />
        ) : !threads ? (
          <div className="space-y-1.5 p-1" role="status" aria-label="Loading threads">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg p-2.5">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="mt-2 h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-fg-3">Your conversations will be listed here.</p>
        ) : (
          <ul className="space-y-0.5">
            {threads.map((t) => {
              const active = t.thread_id === activeId;
              return (
                <li key={t.thread_id}>
                  <button
                    type="button"
                    onClick={() => onSelect(t.thread_id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "w-full rounded-lg px-3 py-2.5 text-left transition-colors duration-150",
                      active ? "bg-raised" : "hover:bg-raised/60",
                    )}
                  >
                    <p className={cn("truncate text-[14px]", active ? "font-medium text-fg" : "text-fg-2")}>
                      {t.title || "New conversation"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-fg-3">
                      {busyId === t.thread_id ? (
                        <span className="text-accent-ink">working…</span>
                      ) : (
                        <>
                          <span>{t.last_at ? fmtRelative(t.last_at) : "draft"}</span>
                          {t.messages ? <span>· {t.messages} msgs</span> : null}
                        </>
                      )}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------- main view ---------- */

export function ChatView() {
  const { session, draft, consumeDraft, refreshMe } = useWorkspace();
  const prefKey = `thread_${session.userId}`;

  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
  const [threadsError, setThreadsError] = useState<unknown>(null);
  const [initial] = useState(() => {
    const stored = getPref(prefKey);
    return stored ? { id: stored, fresh: false } : { id: newThreadId(), fresh: true };
  });
  const [activeId, setActiveId] = useState<string>(initial.id);
  const [messages, setMessages] = useState<Record<string, UiMessage[]>>({});
  const [loads, setLoads] = useState<Record<string, LoadState>>({});
  const [localNew, setLocalNew] = useState<Set<string>>(() => new Set(initial.fresh ? [initial.id] : []));
  const [sending, setSending] = useState<{ threadId: string; startedAt: number } | null>(null);
  const [input, setInput] = useState<string>(() => draft ?? "");
  const [threadsOpen, setThreadsOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // A prefilled draft (from "Ask agent to …" buttons) is consumed once.
  useEffect(() => {
    if (draft !== null) {
      consumeDraft();
      inputRef.current?.focus();
      const el = inputRef.current;
      if (el) el.setSelectionRange(el.value.length, el.value.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPref(prefKey, activeId);
  }, [prefKey, activeId]);

  const loadThreads = useCallback(
    () =>
      api.me
        .threads({ quiet: true })
        .then((list) => {
          list.sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? ""));
          setThreadsError(null);
          setThreads((prev) => {
            // Keep local threads that the server doesn't know about yet.
            const local = (prev ?? []).filter((t) => !t.last_at && !list.some((s) => s.thread_id === t.thread_id));
            return [...local, ...list];
          });
        })
        .catch((err) => setThreadsError(err)),
    [],
  );

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  // Load history for the active thread the first time it is opened.
  const activeLoad = loads[activeId];
  const isLocalNew = localNew.has(activeId);
  useEffect(() => {
    if (activeLoad || isLocalNew) return;
    let cancelled = false;
    const id = activeId;
    api.me
      .thread(id, { quiet: true })
      .then((t) => {
        if (cancelled) return;
        setMessages((m) => ({
          ...m,
          [id]: t.messages.map((msg) => ({ id: newMsgId(), role: msg.role, content: msg.content, tool_calls: msg.tool_calls })),
        }));
        setLoads((l) => ({ ...l, [id]: { status: "ready" } }));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setMessages((m) => ({ ...m, [id]: m[id] ?? [] }));
          setLoads((l) => ({ ...l, [id]: { status: "ready" } }));
        } else {
          setLoads((l) => ({ ...l, [id]: { status: "error", error: err } }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeId, activeLoad, isLocalNew]);

  const current = useMemo(() => messages[activeId] ?? [], [messages, activeId]);
  const status: LoadState["status"] = isLocalNew ? "ready" : (activeLoad?.status ?? "loading");
  const isSendingHere = sending?.threadId === activeId;

  // Keep the latest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [current.length, isSendingHere, activeId, status]);

  // Auto-size the composer.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  function selectThread(id: string) {
    setActiveId(id);
    setThreadsOpen(false);
  }

  function startNewThread() {
    // Reuse an existing empty local thread instead of stacking blanks.
    const emptyLocal = threads?.find((t) => localNew.has(t.thread_id) && !(messages[t.thread_id]?.length));
    const id = emptyLocal?.thread_id ?? newThreadId();
    if (!emptyLocal) {
      setLocalNew((s) => new Set(s).add(id));
      setMessages((m) => ({ ...m, [id]: [] }));
      setThreads((t) => [{ thread_id: id, title: "", last_at: null, messages: 0 }, ...(t ?? [])]);
    }
    setActiveId(id);
    setThreadsOpen(false);
    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const send = useCallback(
    async (raw: string, opts: { replaceId?: string } = {}) => {
      const text = raw.trim();
      if (!text || sending) return;
      const threadId = activeId;
      const userMsg: UiMessage = { id: newMsgId(), role: "user", content: text, tool_calls: [] };
      setMessages((m) => {
        const list = (m[threadId] ?? []).filter((x) => x.id !== opts.replaceId);
        return { ...m, [threadId]: [...list, userMsg] };
      });
      setInput("");
      const startedAt = Date.now();
      setSending({ threadId, startedAt });

      try {
        const res = await api.me.chat(threadId, text);
        const reply: UiMessage = {
          id: newMsgId(),
          role: "assistant",
          content: res.reply,
          tool_calls: res.tool_calls,
          tokens: res.tokens,
          latencyMs: Date.now() - startedAt,
        };
        setMessages((m) => ({ ...m, [threadId]: [...(m[threadId] ?? []), reply] }));
        setThreads((list) => {
          const prev = list ?? [];
          const existing = prev.find((t) => t.thread_id === threadId);
          const updated: ThreadSummary = {
            thread_id: threadId,
            title: existing?.title || truncate(text, 60),
            last_at: new Date().toISOString(),
            messages: (existing?.messages ?? 0) + 2,
          };
          return [updated, ...prev.filter((t) => t.thread_id !== threadId)];
        });
        void refreshMe();
      } catch (err) {
        const reason =
          err instanceof ApiError && err.kind === "timeout"
            ? "the agent took too long"
            : err instanceof ApiError && err.kind === "network"
              ? "couldn't reach the API"
              : errorMessage(err).toLowerCase();
        setMessages((m) => ({
          ...m,
          [threadId]: (m[threadId] ?? []).map((x) => (x.id === userMsg.id ? { ...x, failed: reason } : x)),
        }));
      } finally {
        setSending(null);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    },
    [activeId, sending, refreshMe],
  );

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  }

  function pickStarter(s: (typeof STARTERS)[number]) {
    if (s.send) void send(s.text);
    else {
      setInput(s.text);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    }
  }

  const activeThread = threads?.find((t) => t.thread_id === activeId);
  const title = activeThread?.title || (current[0]?.role === "user" ? truncate(current[0].content, 60) : "New conversation");
  const loadState = loads[activeId];

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] lg:h-dvh">
      {/* Thread list: column on desktop, overlay on mobile */}
      <div className="hidden w-72 shrink-0 border-r border-line bg-bg md:block">
        <ThreadList
          threads={threads}
          error={threadsError}
          activeId={activeId}
          onSelect={selectThread}
          onNew={startNewThread}
          onRetry={() => void loadThreads()}
          busyId={sending?.threadId ?? null}
        />
      </div>
      {threadsOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Threads">
          <button
            type="button"
            className="absolute inset-0 animate-fade bg-[rgb(7_8_13/0.5)]"
            aria-label="Close threads"
            onClick={() => setThreadsOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[19rem] max-w-[88vw] animate-rise border-r border-line bg-bg shadow-float">
            <ThreadList
              threads={threads}
              error={threadsError}
              activeId={activeId}
              onSelect={selectThread}
              onNew={startNewThread}
              onRetry={() => void loadThreads()}
              busyId={sending?.threadId ?? null}
            />
          </div>
        </div>
      ) : null}

      <section className="flex min-w-0 flex-1 flex-col" aria-label="Conversation">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3 sm:px-5">
          <button
            type="button"
            onClick={() => setThreadsOpen(true)}
            className="flex size-10 items-center justify-center rounded-lg text-fg-2 hover:bg-raised md:hidden"
            aria-label="Show threads"
          >
            <MessagesSquare className="size-[18px]" aria-hidden />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-[15px] font-medium text-fg">{title}</h1>
          <span className="hidden font-mono text-[11px] text-fg-3 sm:inline" title="Thread id">
            {activeId}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={startNewThread}
            aria-label="New chat"
            className="md:hidden"
            icon={<Plus className="size-4" aria-hidden />}
          />
        </div>

        <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            {status === "loading" ? (
              <div className="space-y-8" role="status" aria-label="Loading conversation">
                <Skeleton className="ml-auto h-12 w-2/3 rounded-2xl" />
                <div className="flex gap-3">
                  <Skeleton className="size-7 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </div>
            ) : status === "error" && loadState?.status === "error" ? (
              <ErrorState
                title="Couldn't load this conversation"
                error={loadState.error}
                onRetry={() =>
                  setLoads((l) => {
                    const next = { ...l };
                    delete next[activeId];
                    return next;
                  })
                }
              />
            ) : current.length === 0 && !isSendingHere ? (
              <div className="flex min-h-[50vh] flex-col justify-center py-8">
                <LogoMark className="size-9" />
                <h2 className="mt-5 text-[22px] font-medium tracking-[-0.01em] text-fg">Start with a topic or a question</h2>
                <p className="mt-2 max-w-lg text-[15px] text-fg-2">
                  The agent can research keywords, write and fact-check articles, add affiliate links, publish them to{" "}
                  <Link href={`/site/${encodeURIComponent(session.userId)}`} target="_blank" className="text-accent-ink hover:underline">
                    your site
                  </Link>{" "}
                  and report how they perform.
                </p>
                <div className="mt-8 grid gap-2 sm:grid-cols-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s.text}
                      type="button"
                      onClick={() => pickStarter(s)}
                      disabled={!!sending}
                      className="group flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-left shadow-sm transition-colors duration-150 hover:border-line-strong hover:bg-raised/40 disabled:opacity-50"
                    >
                      <s.icon className="mt-0.5 size-4 shrink-0 text-fg-3 group-hover:text-fg-2" strokeWidth={1.75} aria-hidden />
                      <span className="text-[14px] leading-5 text-fg">{s.label ?? s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ol className="space-y-8" aria-label="Messages">
                {current.map((m) => (
                  <li key={m.id} className="animate-fade">
                    <MessageRow m={m} onRetry={(msg) => void send(msg.content, { replaceId: msg.id })} retryDisabled={!!sending} />
                  </li>
                ))}
                {isSendingHere && sending ? (
                  <li>
                    <ThinkingRow startedAt={sending.startedAt} />
                  </li>
                ) : null}
              </ol>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-line bg-bg px-3 pb-3 pt-3 sm:px-6 sm:pb-5">
          <form
            className="mx-auto w-full max-w-3xl"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <div
              className={cn(
                "flex items-end gap-2 rounded-2xl border border-line-strong bg-surface p-2 shadow-sm transition-[border-color,box-shadow] duration-150",
                "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20",
              )}
            >
              <label htmlFor="chat-input" className="sr-only">
                Message the agent
              </label>
              <textarea
                id="chat-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={sending ? "Waiting for the agent…" : "Ask the agent to research, write, publish or report"}
                disabled={!!sending || status === "loading"}
                className="max-h-[200px] min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-6 text-fg placeholder:text-fg-3 focus:outline-none focus-visible:outline-none disabled:opacity-60"
              />
              {input ? (
                <button
                  type="button"
                  onClick={() => setInput("")}
                  className="mb-0.5 hidden size-9 items-center justify-center rounded-lg text-fg-3 hover:bg-raised hover:text-fg sm:flex"
                  aria-label="Clear message"
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : null}
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || !!sending}
                loading={!!sending}
                aria-label="Send message"
                icon={sending ? undefined : <ArrowUp className="size-4" aria-hidden />}
              />
            </div>
            <p className="mt-2 hidden items-center gap-1.5 px-1 text-[12px] text-fg-3 sm:flex">
              <Kbd>Enter</Kbd> to send <span aria-hidden>·</span> <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> for a new line
              <span className="ml-auto">Short-term memory is kept per thread</span>
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
