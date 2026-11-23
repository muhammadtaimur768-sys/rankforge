import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell, AppShellSkeleton } from "@/components/app/app-shell";
import { WorkspaceProvider } from "@/components/app/workspace";

export const metadata: Metadata = {
  title: { default: "Workspace", template: "%s · RankForge" },
  robots: { index: false, follow: false },
};

export default function WorkspaceLayout({ children }: LayoutProps<"/app">) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <WorkspaceProvider fallback={<AppShellSkeleton />}>
        <AppShell>{children}</AppShell>
      </WorkspaceProvider>
    </Suspense>
  );
}
