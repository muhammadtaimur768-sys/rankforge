"use client";

import { RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-start justify-center px-4 py-16 sm:mx-auto sm:max-w-lg">
      <p className="font-mono text-[13px] text-negative">Error</p>
      <h1 className="mt-3 text-[28px] font-medium leading-tight text-fg">Something broke on this page</h1>
      <p className="mt-3 text-[15px] text-fg-2">{error.message || "An unexpected error occurred."}</p>
      {error.digest ? <p className="mt-2 font-mono text-[12px] text-fg-3">Reference {error.digest}</p> : null}
      <div className="mt-8 flex gap-3">
        <Button onClick={reset} icon={<RotateCcw className="size-4" aria-hidden />}>
          Try again
        </Button>
        <ButtonLink href="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </div>
  );
}
