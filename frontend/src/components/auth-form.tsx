"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { getSession, setSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/primitives";

type Mode = "login" | "signup";

const USERNAME_RE = /^[a-z0-9_-]{3,32}$/;

function validateUsername(v: string): string | null {
  if (!v) return "Enter a username";
  if (v.length < 3) return "Use at least 3 characters";
  if (v.length > 32) return "Use 32 characters or fewer";
  if (!USERNAME_RE.test(v)) return "Use lowercase letters, numbers, - or _ only";
  return null;
}

function validatePassword(v: string, mode: Mode): string | null {
  if (!v) return "Enter a password";
  if (mode === "signup" && v.length < 6) return "Use at least 6 characters";
  return null;
}

function nextPath(): string {
  if (typeof window === "undefined") return "/app";
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/app") ? n : "/app";
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState<{ u?: boolean; p?: boolean }>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const userRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (getSession()) router.replace(nextPath());
  }, [router]);

  const uErr = touched.u ? validateUsername(username) : null;
  const pErr = touched.p ? validatePassword(password, mode) : null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ u: true, p: true });
    setFormError(null);
    const ue = validateUsername(username);
    const pe = validatePassword(password, mode);
    if (ue) return userRef.current?.focus();
    if (pe) return pwRef.current?.focus();

    setSubmitting(true);
    try {
      const res = mode === "signup" ? await api.auth.signup(username, password) : await api.auth.login(username, password);
      if (!res?.token) throw new ApiError("The server didn't return a session token", { kind: "parse" });
      setSession(res.token, res.user_id || username);
      toast.success(mode === "signup" ? "Account created" : "Logged in", mode === "signup" ? "Your workspace is ready." : undefined);
      router.replace(nextPath());
    } catch (err) {
      let msg = err instanceof Error ? err.message : "Something went wrong";
      if (err instanceof ApiError) {
        if (err.status === 409) msg = "That username is taken. Try another one.";
        else if (err.status === 401) msg = "That username and password don't match.";
        else if (err.kind === "network") msg = `${err.message}. Check your connection and try again.`;
      }
      setFormError(msg);
      setSubmitting(false);
    }
  }

  const isSignup = mode === "signup";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5" aria-describedby={formError ? "form-error" : undefined}>
      {formError ? (
        <div
          id="form-error"
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-negative/25 bg-negative-soft px-3.5 py-3 text-sm text-negative"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{formError}</span>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          ref={userRef}
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          placeholder="trailnotes"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
          onBlur={() => setTouched((t) => ({ ...t, u: true }))}
          aria-invalid={!!uErr}
          aria-describedby={uErr ? "username-error" : "username-help"}
          maxLength={32}
          required
        />
        {uErr ? (
          <FieldError id="username-error">{uErr}</FieldError>
        ) : isSignup ? (
          <p id="username-help" className="text-[13px] text-fg-3">
            3 to 32 characters: a–z, 0–9, - and _. It becomes your site address.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            ref={pwRef}
            id="password"
            name="password"
            type={showPw ? "text" : "password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, p: true }))}
            aria-invalid={!!pErr}
            aria-describedby={pErr ? "password-error" : undefined}
            className="pr-12"
            required
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[10px] text-fg-3 transition-colors hover:text-fg"
            aria-label={showPw ? "Hide password" : "Show password"}
            aria-pressed={showPw}
          >
            {showPw ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
        <FieldError id="password-error">{pErr}</FieldError>
      </div>

      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        {submitting ? (isSignup ? "Creating account" : "Logging in") : isSignup ? "Create account" : "Log in"}
      </Button>

      <p className="text-center text-sm text-fg-2">
        {isSignup ? "Already have an account? " : "New to RankForge? "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-accent-ink hover:underline">
          {isSignup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
