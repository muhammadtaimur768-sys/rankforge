"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { clearSession, getSession, subscribeSession, type Session } from "@/lib/session";
import type { Me } from "@/lib/types";

interface WorkspaceValue {
  session: Session;
  me: Me | null;
  meError: unknown;
  refreshMe: () => Promise<void>;
  /** Text waiting to be placed in the chat composer. */
  draft: string | null;
  consumeDraft: () => string | null;
  /** Jump to chat with a prefilled message. */
  askAgent: (message: string) => void;
  logout: () => void;
}

const Ctx = createContext<WorkspaceValue | null>(null);

export function useWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return v;
}

const noopSubscribe = () => () => {};

export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function WorkspaceProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const session = useSyncExternalStore(subscribeSession, getSession, () => null);
  const [me, setMe] = useState<Me | null>(null);
  const [meError, setMeError] = useState<unknown>(null);
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !session) router.replace(`/login?next=${encodeURIComponent(pathname || "/app")}`);
  }, [hydrated, session, router, pathname]);

  const refreshMe = useCallback(async () => {
    try {
      const m = await api.me.get({ quiet: true });
      setMe(m);
      setMeError(null);
    } catch (err) {
      setMeError(err);
    }
  }, []);

  const userId = session?.userId;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    api.me
      .get({ quiet: true })
      .then((m) => {
        if (!cancelled) {
          setMe(m);
          setMeError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setMeError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const consumeDraft = useCallback(() => {
    const d = draft;
    if (d !== null) setDraft(null);
    return d;
  }, [draft]);

  const askAgent = useCallback(
    (message: string) => {
      setDraft(message);
      router.push("/app");
    },
    [router],
  );

  const logout = useCallback(() => {
    clearSession();
    setMe(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo<WorkspaceValue | null>(
    () =>
      session
        ? { session, me, meError, refreshMe, draft, consumeDraft, askAgent, logout }
        : null,
    [session, me, meError, refreshMe, draft, consumeDraft, askAgent, logout],
  );

  if (!hydrated || !value) return <>{fallback}</>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
