/*
  Browser session storage. Safe to import anywhere: every accessor checks for
  `window` and swallows storage exceptions (private mode, blocked storage).
*/

const TOKEN_KEY = "rf_token";
const USER_KEY = "rf_user_id";
const ADMIN_KEY = "rf_admin_key";
const EVENT = "rf:session";

export interface Session {
  token: string;
  userId: string;
}

function read(storage: "local" | "session", key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (storage === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function write(storage: "local" | "session", key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    const s = storage === "local" ? window.localStorage : window.sessionStorage;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

// Cached snapshot so useSyncExternalStore gets a stable reference.
let cached: Session | null = null;
let cachedKey = "";

export function getSession(): Session | null {
  const token = read("local", TOKEN_KEY);
  const userId = read("local", USER_KEY);
  const key = `${token}|${userId}`;
  if (key !== cachedKey) {
    cachedKey = key;
    cached = token && userId ? { token, userId } : null;
  }
  return cached;
}

export function setSession(token: string, userId: string) {
  write("local", TOKEN_KEY, token);
  write("local", USER_KEY, userId);
  emit();
}

export function clearSession() {
  write("local", TOKEN_KEY, null);
  write("local", USER_KEY, null);
  emit();
}

export function subscribeSession(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY || e.key === USER_KEY || e.key === null) cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function getAdminKey(): string | null {
  return read("session", ADMIN_KEY);
}

export function setAdminKey(key: string | null) {
  write("session", ADMIN_KEY, key);
}

/** Read-and-remember helper for small per-viewer preferences. */
export function getPref(key: string): string | null {
  return read("local", `rf_pref_${key}`);
}

export function setPref(key: string, value: string | null) {
  write("local", `rf_pref_${key}`, value);
}
