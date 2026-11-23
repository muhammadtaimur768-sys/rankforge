import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-6 sm:px-8">
      <Logo />
      <main id="main" className="flex flex-1 flex-col items-start justify-center py-16 sm:mx-auto sm:w-full sm:max-w-lg">
        <p className="font-mono text-[13px] text-accent-ink">404</p>
        <h1 className="mt-3 text-[32px] font-medium leading-tight tracking-[-0.02em] text-fg">This page isn&apos;t here</h1>
        <p className="mt-3 text-[15px] text-fg-2">
          The link may be old, or the article was unpublished. Try the site directory or go back to the start.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/" variant="secondary" icon={<ArrowLeft className="size-4" aria-hidden />}>
            Home
          </ButtonLink>
          <ButtonLink href="/blog" variant="ghost">
            Site directory
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
