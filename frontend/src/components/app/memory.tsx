"use client";

import { useState } from "react";
import { Brain, MessageSquarePlus, RefreshCw, Trash2 } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, Skeleton } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { AppPage } from "./app-shell";
import { useWorkspace } from "./workspace";

function humanKey(k: string) {
  return k.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function MemoryView() {
  const { me, meError, refreshMe, askAgent } = useWorkspace();
  const [pending, setPending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [refreshing, setRefreshing] = useState(false);

  const entries = me ? Object.entries(me.memory).filter(([k]) => !removed.has(k)) : null;

  async function confirmDelete() {
    if (!pending) return;
    setDeleting(true);
    const key = pending;
    try {
      await api.me.deleteMemory(key);
      setRemoved((s) => new Set(s).add(key));
      toast.success("Memory deleted", `The agent no longer knows “${humanKey(key)}”.`);
      setPending(null);
      void refreshMe();
    } catch (err) {
      // api.ts already raised a toast; keep the dialog open so the user can retry.
      void errorMessage(err);
    } finally {
      setDeleting(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    await refreshMe();
    setRemoved(new Set());
    setRefreshing(false);
  }

  return (
    <AppPage className="max-w-4xl">
      <PageHeader
        title="Memory"
        description="Short-term memory lives inside each chat thread. Long-term memory, listed here, is what the agent keeps about you across every thread."
        actions={
          <Button variant="secondary" size="sm" onClick={refresh} loading={refreshing} icon={<RefreshCw className="size-3.5" aria-hidden />}>
            Refresh
          </Button>
        }
      />

      <Card className="mt-6 overflow-hidden">
        {!me && meError ? (
          <ErrorState title="Couldn't load memory" error={meError} onRetry={refresh} retrying={refreshing} />
        ) : !entries ? (
          <ul className="divide-y divide-line" role="status" aria-label="Loading memory">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="size-8" />
              </li>
            ))}
          </ul>
        ) : !entries.length ? (
          <EmptyState
            icon={Brain}
            title="Nothing remembered yet"
            description="Tell the agent about your niche, audience or favorite retailers and it will save those facts here for future chats."
            action={
              <Button
                onClick={() => askAgent("Remember that my site is about ")}
                icon={<MessageSquarePlus className="size-4" aria-hidden />}
              >
                Tell the agent about your site
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {entries.map(([k, v]) => (
              <li key={k} className="flex items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[12px] text-fg-3">{k}</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-fg">{v}</p>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setPending(k)}
                  aria-label={`Delete memory ${humanKey(k)}`}
                  className="hover:bg-negative-soft hover:text-negative"
                  icon={<Trash2 className="size-4" aria-hidden />}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {entries?.length ? (
        <p className="mt-4 text-[13px] text-fg-3">
          {entries.length} {entries.length === 1 ? "fact" : "facts"} saved. Deleting one only removes it from long-term memory; past
          threads keep their history.
        </p>
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        title="Delete this memory?"
        description={
          pending ? (
            <>
              The agent will forget <span className="font-medium text-fg">{humanKey(pending)}</span> in future conversations.
              This can&apos;t be undone, but you can tell it again in chat.
            </>
          ) : null
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => !deleting && setPending(null)}
      />
    </AppPage>
  );
}
