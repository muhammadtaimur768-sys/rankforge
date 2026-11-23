import Link from "next/link";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/config";

/** Mark: three rising rank bars, the tallest one struck like a forged ingot. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden>
      <rect x="0" y="0" width="24" height="24" rx="6" className="fill-fg" />
      <rect x="5" y="13" width="3.5" height="6" rx="1" className="fill-bg" />
      <rect x="10.25" y="9.5" width="3.5" height="9.5" rx="1" className="fill-bg" />
      <rect x="15.5" y="5" width="3.5" height="14" rx="1" className="fill-accent" />
    </svg>
  );
}

export function Logo({ href = "/", className, suffix }: { href?: string; className?: string; suffix?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 rounded-md text-[17px] font-semibold text-fg", className)}
      aria-label={`${SITE_NAME} home`}
    >
      <LogoMark />
      <span>{SITE_NAME}</span>
      {suffix ? <span className="text-[13px] font-normal text-fg-3">{suffix}</span> : null}
    </Link>
  );
}
