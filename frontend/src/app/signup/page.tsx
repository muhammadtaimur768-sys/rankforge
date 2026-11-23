import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your RankForge account"
      description="You get a free hosted affiliate site and an agent that can research, write and publish to it."
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
