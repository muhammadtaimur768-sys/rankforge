/*
  Deterministic branding for public affiliate sites: accent colors, monograms,
  cover art parameters and niche icons. Pure functions, safe on server and client.
*/

import type { CSSProperties } from "react";

/** FNV-1a 32-bit hash. */
export function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small seeded PRNG (mulberry32) for repeatable art. */
export function rng(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- color helpers ---------- */

type RGB = [number, number, number];
type HSL = [number, number, number];

function hexToRgb(hex: string): RGB | null {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = ([r, g, b]: RGB) =>
  `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

function rgbToHsl([r, g, b]: RGB): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb([h, s, l]: HSL): RGB {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

const hsl = (h: number, s: number, l: number) => toHex(hslToRgb([h, s, l]));

function luminance([r, g, b]: RGB) {
  const f = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a: string, b: string) {
  const la = luminance(hexToRgb(a) ?? [0, 0, 0]);
  const lb = luminance(hexToRgb(b) ?? [0, 0, 0]);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Adjust lightness until the color reaches `target` contrast against `bg`. */
function ensureContrast(hex: string, bg: string, target: number, direction: "darken" | "lighten") {
  const [h, s, l0] = rgbToHsl(hexToRgb(hex) ?? [0, 0, 0]);
  let l = l0;
  let out = hex;
  for (let i = 0; i < 40 && contrast(out, bg) < target; i++) {
    l = direction === "darken" ? l - 0.02 : l + 0.02;
    if (l <= 0.05 || l >= 0.95) break;
    out = hsl(h, s, l);
  }
  return out;
}

/** Curated accents that read well on warm paper and as button fills. */
const ACCENTS = ["#2f855a", "#b45309", "#0f766e", "#4338ca", "#9d174d", "#0369a1", "#4d7c0f", "#a1442a", "#6d28d9", "#1d4ed8"];

export interface SiteTheme {
  accent: string;
  /** Text/buttons on light surfaces (≥ 4.5:1 on white). */
  accentStrong: string;
  /** Accent as text on dark surfaces. */
  accentInkDark: string;
  onAccent: string;
  /** Two tones for covers. */
  hue: number;
}

export function siteTheme(userId: string, accent?: string | null): SiteTheme {
  const base = accent && hexToRgb(accent) ? toHex(hexToRgb(accent)!) : ACCENTS[hash(userId) % ACCENTS.length];
  const strong = ensureContrast(base, "#ffffff", 4.6, "darken");
  const inkDark = ensureContrast(base, "#1c1a18", 5, "lighten");
  const [h] = rgbToHsl(hexToRgb(base)!);
  return { accent: base, accentStrong: strong, accentInkDark: inkDark, onAccent: "#ffffff", hue: h };
}

/** CSS variables consumed by `.site-theme` (see globals.css). */
export function siteThemeStyle(t: SiteTheme): CSSProperties {
  return {
    ["--site-accent" as string]: t.accentStrong,
    ["--site-accent-ink-light" as string]: t.accentStrong,
    ["--site-accent-ink-dark" as string]: t.accentInkDark,
    ["--site-on-accent" as string]: t.onAccent,
  };
}

export function monogram(name: string) {
  const words = name
    .replace(/['’]s\b/gi, "")
    .split(/[\s_-]+|(?=[A-Z][a-z])/)
    .filter((w) => /[a-z0-9]/i.test(w));
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).replace(/^./, (c) => c.toUpperCase());
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Cover palette derived from the site hue and the article slug. */
export function coverPalette(seedKey: string, siteHue: number) {
  const r = rng(hash(seedKey));
  const shift = (r() - 0.5) * 50;
  const h1 = siteHue + shift;
  const h2 = h1 + 18 + r() * 40;
  return {
    from: hsl(h1, 0.42 + r() * 0.2, 0.3 + r() * 0.08),
    to: hsl(h2, 0.38 + r() * 0.2, 0.46 + r() * 0.1),
    glow: hsl(h2 + 20, 0.6, 0.72),
    angle: Math.round(r() * 360),
    pattern: Math.floor(r() * 4), // 0 dots, 1 lines, 2 contours, 3 grid
    iconX: 0.62 + r() * 0.18,
    iconY: 0.38 + r() * 0.24,
    rotate: Math.round((r() - 0.5) * 24),
    rand: r,
  };
}
