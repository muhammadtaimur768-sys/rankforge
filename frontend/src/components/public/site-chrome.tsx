import Link from "next/link";
import type { ReactNode } from "react";
import { Libre_Bodoni, Public_Sans } from "next/font/google";
import { LogoMark } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { monogram, siteTheme, siteThemeStyle, type SiteTheme } from "@/lib/site-brand";
import { cn } from "@/lib/utils";

const display = Libre_Bodoni({ subsets: ["latin"], variable: "--font-libre-bodoni", display: "swap" });
const ui = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans", display: "swap" });

export interface SiteIdentity {
  userId: string;
  siteName: string;
  tagline: string | null;
  niche: string | null;
  about: string | null;
  audience: string | null;
  accent: string | null;
}

export function identityOf(site: {
  user_id: string;
  site_name: string;
  tagline: string | null;
  niche: string | null;
  about: string | null;
  audience: string | null;
  accent: string | null;
}): SiteIdentity {
  return {
    userId: site.user_id,
    siteName: site.site_name,
    tagline: site.tagline,
    niche: site.niche,
    about: site.about,
    audience: site.audience,
    accent: site.accent,
  };
}

export const siteHref = (userId: string, path = "") => `/site/${encodeURIComponent(userId)}${path}`;

export function Monogram({
  name,
  theme,
  size = "md",
  className,
}: {
  name: string;
  theme: SiteTheme;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "sm" ? "size-8 text-[13px] rounded-lg" : size === "lg" ? "size-14 text-[22px] rounded-2xl" : "size-10 text-[16px] rounded-xl";
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center font-display font-semibold tracking-tight", dims, className)}
      style={{ background: theme.accentStrong, color: theme.onAccent }}
    >
      {monogram(name)}
    </span>
  );
}

function SiteHeader({ id, theme }: { id: SiteIdentity; theme: SiteTheme }) {
  const nav = [
    { href: siteHref(id.userId), label: "Home" },
    { href: siteHref(id.userId, "#guides"), label: "Guides" },
    { href: siteHref(id.userId, "/about"), label: "About" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:h-[72px] sm:px-6">
        <Link href={siteHref(id.userId)} className="flex min-w-0 items-center gap-3 rounded-lg">
          <Monogram name={id.siteName} theme={theme} />
          <span className="min-w-0">
            <span className="block truncate font-display text-[19px] font-semibold leading-tight text-fg">{id.siteName}</span>
            {id.tagline ? (
              <span className="hidden truncate text-[12px] text-fg-3 sm:block">{id.tagline}</span>
            ) : null}
          </span>
        </Link>
        <nav aria-label="Site" className="ml-auto flex items-center gap-0.5">
          {nav.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="inline-flex h-10 items-center rounded-lg px-2.5 text-[14px] font-medium text-fg-2 transition-colors hover:bg-raised hover:text-fg sm:px-3"
            >
              {n.label}
            </Link>
          ))}
          <ThemeToggle className="ml-2 hidden md:inline-flex" />
        </nav>
      </div>
    </header>
  );
}

function SiteFooter({ id, theme }: { id: SiteIdentity; theme: SiteTheme }) {
  return (
    <footer className="mt-24 border-t border-line bg-sunken">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr]">
        <div className="max-w-sm">
          <div className="flex items-center gap-3">
            <Monogram name={id.siteName} theme={theme} size="sm" />
            <span className="font-display text-[18px] font-semibold text-fg">{id.siteName}</span>
          </div>
          <p className="mt-4 text-[14px] leading-6 text-fg-2">
            {id.about ??
              (id.niche
                ? `Independent, fact-checked guides to ${id.niche}. We test claims against sources before we publish.`
                : "Independent, fact-checked buying guides. We test claims against sources before we publish.")}
          </p>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-fg">Explore</p>
          <ul className="mt-3 space-y-1 text-[14px]">
            <li>
              <Link className="inline-flex h-8 items-center text-fg-2 hover:text-fg" href={siteHref(id.userId)}>
                Home
              </Link>
            </li>
            <li>
              <Link className="inline-flex h-8 items-center text-fg-2 hover:text-fg" href={siteHref(id.userId, "#guides")}>
                All guides
              </Link>
            </li>
            <li>
              <Link className="inline-flex h-8 items-center text-fg-2 hover:text-fg" href={siteHref(id.userId, "/about")}>
                About us
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-fg">Policies</p>
          <ul className="mt-3 space-y-1 text-[14px]">
            <li>
              <Link className="inline-flex h-8 items-center text-fg-2 hover:text-fg" href={siteHref(id.userId, "/about#disclosure")}>
                Affiliate disclosure
              </Link>
            </li>
            <li>
              <Link className="inline-flex h-8 items-center text-fg-2 hover:text-fg" href={siteHref(id.userId, "/about#privacy")}>
                Privacy
              </Link>
            </li>
            <li>
              <Link className="inline-flex h-8 items-center text-fg-2 hover:text-fg" href={siteHref(id.userId, "/about#how-we-pick")}>
                How we pick
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-[12px] text-fg-3 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl leading-5">
            © 2026 {id.siteName}. Some links are affiliate links: if you buy through them we may earn a commission, at no extra
            cost to you.
          </p>
          <div className="flex items-center gap-3">
            <ThemeToggle className="md:hidden" />
            <Link
              href="/"
              className="inline-flex h-8 items-center gap-2 rounded-full border border-line bg-surface px-3 text-[12px] font-medium text-fg-2 transition-colors hover:border-line-strong hover:text-fg"
            >
              <LogoMark className="size-4" />
              Powered by RankForge
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/** Branded wrapper: fonts, warm palette, per-site accent, header and footer. */
export function SiteShell({ id, children }: { id: SiteIdentity; children: ReactNode }) {
  const theme = siteTheme(id.userId, id.accent);
  return (
    <div
      className={cn("site-theme flex min-h-dvh flex-col bg-bg text-fg", display.variable, ui.variable)}
      style={siteThemeStyle(theme)}
    >
      <SiteHeader id={id} theme={theme} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter id={id} theme={theme} />
    </div>
  );
}

/** Minimal shell for loading/error states before the site identity is known. */
export function SiteShellBare({ children }: { children: ReactNode }) {
  return (
    <div className={cn("site-theme flex min-h-dvh flex-col bg-bg text-fg", display.variable, ui.variable)}>
      <div className="h-16 border-b border-line sm:h-[72px]" />
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
