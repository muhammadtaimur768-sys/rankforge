/*
  Minimal toast bus. Isomorphic and dependency free, so the API client can
  raise toasts without importing React. <Toaster /> subscribes on the client.
*/

export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  duration: number;
}

type Listener = (t: ToastItem) => void;

const listeners = new Set<Listener>();
let seq = 0;
const recent = new Map<string, number>();

export function subscribeToasts(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function push(kind: ToastKind, title: string, opts: Partial<Omit<ToastItem, "id" | "kind" | "title">> = {}) {
  // Collapse identical toasts fired within 2s (e.g. several requests failing at once).
  const sig = `${kind}:${title}:${opts.description ?? ""}`;
  const now = Date.now();
  const last = recent.get(sig);
  if (last && now - last < 2000) return;
  recent.set(sig, now);

  const item: ToastItem = {
    id: ++seq,
    kind,
    title,
    duration: kind === "error" ? 6000 : 4000,
    ...opts,
  };
  listeners.forEach((l) => l(item));
}

export const toast = {
  success: (title: string, description?: string) => push("success", title, { description }),
  error: (title: string, description?: string, action?: ToastItem["action"]) =>
    push("error", title, { description, action }),
  info: (title: string, description?: string) => push("info", title, { description }),
};
