import Link from "next/link";
import { Logo } from "@/components/ui/logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#pipeline", label: "How it works" },
      { href: "/#features", label: "Features" },
      { href: "/#pricing", label: "Pricing" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Sites",
    links: [
      { href: "/blog", label: "Live sites" },
      { href: "/signup", label: "Start your site" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Log in" },
      { href: "/signup", label: "Sign up" },
      { href: "/app", label: "Workspace" },
      { href: "/admin", label: "Admin" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm text-fg-2">
            Keyword research, writing, fact-checking, affiliate links, publishing and tracking, run by one agent team.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-[13px] font-medium text-fg">{col.title}</p>
            <ul className="mt-3 space-y-1">
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="inline-flex h-8 items-center text-sm text-fg-2 transition-colors hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-[13px] text-fg-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© 2026 RankForge</p>
          <p>Sites built with RankForge contain affiliate links and label them as sponsored.</p>
        </div>
      </div>
    </footer>
  );
}
