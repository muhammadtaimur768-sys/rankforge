"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { getSession, subscribeSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#pipeline", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/blog", label: "Live sites" },
  { href: "/#faq", label: "FAQ" },
];

export function useSession() {
  return useSyncExternalStore(subscribeSession, getSession, () => null);
}

export function SiteHeader() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm text-fg-2 transition-colors duration-150 hover:text-fg",
                pathname === l.href && "text-fg",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {session ? (
            <ButtonLink href="/app" size="sm" variant="inverse" icon={<ArrowRight className="size-3.5" aria-hidden />}>
              Open workspace
            </ButtonLink>
          ) : (
            <>
              <Link href="/login" className="rounded-md px-3 py-2 text-sm text-fg-2 transition-colors hover:text-fg">
                Log in
              </Link>
              <ButtonLink href="/signup" size="sm" variant="inverse">
                Get started
              </ButtonLink>
            </>
          )}
        </div>
        <button
          type="button"
          className="-mr-2 flex size-11 items-center justify-center rounded-lg text-fg-2 hover:bg-raised md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>
      {open ? (
        <div id="mobile-nav" className="animate-fade border-t border-line bg-bg px-4 pb-6 pt-2 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex h-12 items-center border-b border-line text-[15px] text-fg"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 flex flex-col gap-2">
            {session ? (
              <ButtonLink href="/app" size="lg" variant="inverse" onClick={() => setOpen(false)}>
                Open workspace
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/signup" size="lg" variant="inverse" onClick={() => setOpen(false)}>
                  Get started
                </ButtonLink>
                <ButtonLink href="/login" size="lg" variant="secondary" onClick={() => setOpen(false)}>
                  Log in
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
