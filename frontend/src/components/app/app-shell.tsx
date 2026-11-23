"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BarChart3, Brain, ExternalLink, FileText, LogOut, Menu, MessagesSquare, Search, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Skeleton } from "@/components/ui/primitives";
import { fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./workspace";

const NAV = [
  { href: "/app", label: "Chat", icon: MessagesSquare, stat: null },
  { href: "/app/articles", label: "Articles", icon: FileText, stat: "articles" },
  { href: "/app/keywords", label: "Keywords", icon: Search, stat: "keywords_researched" },
  { href: "/app/performance", label: "Performance", icon: BarChart3, stat: null },
  { href: "/app/memory", label: "Memory", icon: Brain, stat: null },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { session, me, logout } = useWorkspace();
  const memoryCount = me ? Object.keys(me.memory).length : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4">
        <Logo href="/app" />
      </div>

      <nav aria-label="Workspace" className="mt-2 flex-1 px-2">
        <p className="px-2 pb-2 text-[12px] text-fg-3">Workspace</p>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const statValue =
              item.stat && me ? me.stats[item.stat] : item.label === "Memory" && memoryCount !== null ? memoryCount : null;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] transition-colors duration-150",
                    active
                      ? "bg-surface text-fg shadow-sm ring-1 ring-line dark:bg-raised dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                      : "text-fg-2 hover:bg-raised/70 hover:text-fg",
                  )}
                >
                  <item.icon className={cn("size-4 shrink-0", active ? "text-fg" : "text-fg-3")} strokeWidth={1.75} aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {statValue ? <span className="font-mono text-[11px] tabular text-fg-3">{fmtCompact(statValue)}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="px-2 pb-2 pt-6 text-[12px] text-fg-3">Your site</p>
        <Link
          href={`/site/${encodeURIComponent(session.userId)}`}
          target="_blank"
          onClick={onNavigate}
          className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] text-fg-2 transition-colors hover:bg-raised/70 hover:text-fg"
        >
          <ExternalLink className="size-4 shrink-0 text-fg-3" strokeWidth={1.75} aria-hidden />
          <span className="flex-1 truncate">/site/{session.userId}</span>
          {me ? <span className="font-mono text-[11px] tabular text-fg-3">{me.stats.published}</span> : null}
        </Link>
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-raised font-mono text-[13px] font-medium uppercase text-fg-2">
            {session.userId.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-fg">{session.userId}</p>
            {me ? (
              <p className="font-mono text-[11px] text-fg-3">
                {fmtCompact(me.stats.tokens_in + me.stats.tokens_out)} tokens used
              </p>
            ) : (
              <Skeleton className="mt-1 h-3 w-20" />
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={logout}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-fg-2 transition-colors hover:bg-negative-soft hover:text-negative"
          >
            <LogOut className="size-3.5" aria-hidden />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [lastPath, setLastPath] = useState(pathname);

  // Close the drawer on navigation (adjust state during render, no effect needed).
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    drawerRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-sunken lg:block">
        <SidebarContent />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-2 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex size-11 items-center justify-center rounded-lg text-fg-2 hover:bg-raised"
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="app-drawer"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <Logo href="/app" />
        <span className="size-11" aria-hidden />
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 animate-fade bg-[rgb(7_8_13/0.5)]"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <div
            id="app-drawer"
            ref={drawerRef}
            className="absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] animate-rise border-r border-line bg-sunken shadow-float"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 z-10 flex size-10 items-center justify-center rounded-lg text-fg-3 hover:bg-raised hover:text-fg"
              aria-label="Close navigation"
            >
              <X className="size-4" aria-hidden />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <main id="main" className="lg:pl-60">
        {children}
      </main>
    </div>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="min-h-dvh" role="status" aria-label="Loading workspace">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-line bg-sunken p-4 lg:block">
        <Skeleton className="h-6 w-32" />
        <div className="mt-8 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </aside>
      <div className="h-14 border-b border-line lg:hidden" />
      <div className="px-4 py-8 sm:px-8 lg:pl-[17rem]">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-3 h-4 w-80 max-w-full" />
        <Skeleton className="mt-8 h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/** Standard padded container for workspace pages. */
export function AppPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8", className)}>{children}</div>;
}
