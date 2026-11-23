const nf = new Intl.NumberFormat("en-US");
const cf = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const fmtNum = (n: number | null | undefined) => nf.format(Number(n) || 0);

export const fmtCompact = (n: number | null | undefined) => {
  const v = Number(n) || 0;
  return Math.abs(v) < 10000 ? nf.format(v) : cf.format(v);
};

export const fmtPct = (n: number | null | undefined, digits = 1) => `${(Number(n) || 0).toFixed(digits)}%`;

export const ctr = (clicks: number, views: number) => (views > 0 ? (clicks / views) * 100 : 0);

export const fmtUsd = (n: number | null | undefined, digits = 4) =>
  `$${(Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const fmtMs = (n: number | null | undefined) => {
  const v = Number(n) || 0;
  return v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`;
};

export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  // Naive ISO strings from the backend are treated as UTC.
  const iso = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s) ? `${s.replace(" ", "T")}Z` : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(
  s: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
) {
  const d = parseDate(s);
  return d ? d.toLocaleDateString("en-US", opts) : "—";
}

export function fmtDateTime(s: string | null | undefined) {
  const d = parseDate(s);
  return d ? d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
}

export function fmtRelative(s: string | null | undefined, now = Date.now()) {
  const d = parseDate(s);
  if (!d) return "—";
  const diff = Math.round((now - d.getTime()) / 1000);
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.round(diff / 86400)}d ago`;
  return fmtDate(s, { month: "short", day: "numeric" });
}

export const readMinutes = (words: number) => Math.max(1, Math.round((Number(words) || 0) / 230));

export function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Fill a daily series so a chart always shows `days` consecutive dates. */
export function fillDaily<T extends { date: string }>(rows: T[], days: number, empty: (date: string) => T): T[] {
  const byDate = new Map(rows.map((r) => [r.date.slice(0, 10), r]));
  const lastRow = rows
    .map((r) => r.date.slice(0, 10))
    .sort()
    .at(-1);
  const todayIso = new Date().toISOString().slice(0, 10);
  const end = new Date(`${lastRow && lastRow > todayIso ? lastRow : todayIso}T00:00:00Z`);
  const out: T[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push(byDate.get(key) ?? empty(key));
  }
  return out;
}

export const shortDay = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};

export function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}
