import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default function LoginPage() {
  return (
    <AuthShell title="Log in to RankForge" description="Pick up your threads, articles and stats where you left them.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
