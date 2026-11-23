/* Markdown helpers for public article pages: sections, TOC, FAQ and product picks. */

import { fixTrackedUrl } from "./api";
import type { PublicLink } from "./types";

export function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[`*_~[\]()]/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 64) || "section"
  );
}

/** Strip inline markdown to plain text. */
export function plain(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[\s*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[*_`~>#|]/g, "")
    .replace(/^\s*[-+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface Section {
  id: string;
  title: string;
  md: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface ParsedArticle {
  intro: string;
  sections: Section[];
  faq: { section: Section; items: FaqItem[] } | null;
}

const FAQ_RE = /^(faqs?|frequently asked questions|common questions|questions and answers|q\s*&\s*a)\b/i;

export function parseArticle(md: string, title: string): ParsedArticle {
  let body = md.replace(/\r\n/g, "\n");
  // Drop a leading H1 that repeats the page title.
  const h1 = body.match(/^\s*#\s+(.+)\n+/);
  if (h1 && plain(h1[1]).toLowerCase() === title.trim().toLowerCase()) body = body.slice(h1[0].length);
  body = body.replace(/^\s*#\s+.+\n+/, (m) => (m.trim().startsWith("# ") ? "" : m));

  const parts = body.split(/^##\s+(?!#)/m);
  const intro = parts.shift()?.trim() ?? "";
  const used = new Map<string, number>();
  const sections: Section[] = parts.map((p) => {
    const nl = p.indexOf("\n");
    const rawTitle = (nl === -1 ? p : p.slice(0, nl)).replace(/#+\s*$/, "").trim();
    const t = plain(rawTitle);
    let id = slugify(t);
    const n = used.get(id) ?? 0;
    used.set(id, n + 1);
    if (n) id = `${id}-${n + 1}`;
    return { id, title: t, md: nl === -1 ? "" : p.slice(nl + 1).trim() };
  });

  let faq: ParsedArticle["faq"] = null;
  const fi = sections.findIndex((s) => FAQ_RE.test(s.title));
  if (fi !== -1) {
    const s = sections[fi];
    const qs = s.md.split(/^###\s+/m);
    const lead = qs.shift()?.trim();
    let items: FaqItem[] = qs
      .map((chunk) => {
        const nl = chunk.indexOf("\n");
        const q = plain(nl === -1 ? chunk : chunk.slice(0, nl)).replace(/^(q|question)\s*[:.]\s*/i, "");
        const a = (nl === -1 ? "" : chunk.slice(nl + 1).trim()).replace(/^(\*\*)?(a|answer)\s*[:.]\s*(\*\*)?\s*/i, "");
        return { q, a };
      })
      .filter((x) => x.q && x.a);
    // Also accept "**Question?**" paragraphs followed by an answer.
    if (!items.length && lead) {
      const re = /^\*\*(.+?\?)\*\*\s*\n?([\s\S]*?)(?=^\*\*.+?\?\*\*|$(?![\s\S]))/gm;
      items = Array.from(lead.matchAll(re))
        .map((m) => ({ q: plain(m[1]), a: m[2].trim() }))
        .filter((x) => x.q && x.a);
    }
    if (items.length) faq = { section: s, items };
  }

  return { intro, sections, faq };
}

export interface Pick {
  name: string;
  href: string;
  blurb: string | null;
}

/** Build the "Top picks" list from the API links, or from tracked links in the markdown. */
export function buildPicks(md: string, links: PublicLink[]): Pick[] {
  let source = links;
  if (!source.length) {
    const seen = new Set<string>();
    source = Array.from(md.matchAll(/\[([^\]]+)]\(([^)\s]+\/go\/[^)\s]+)\)/g))
      .map((m) => ({ anchor: plain(m[1]), href: fixTrackedUrl(m[2]) }))
      .filter((l) => (seen.has(l.href) ? false : (seen.add(l.href), true)));
  }
  const lines = md.split("\n");
  return source.slice(0, 6).map((l) => {
    const idx = lines.findIndex((ln) => ln.includes(`[${l.anchor}]`) || ln.includes(l.anchor));
    let blurb: string | null = null;
    if (idx !== -1) {
      const line = lines[idx];
      let after = plain(line.split(/\]\([^)]*\)/).slice(1).join(" ")).replace(/^[\s:–—-]+/, "");
      // Link used as a heading: take the paragraph that follows it.
      if (after.length < 12) after = plain(lines.slice(idx + 1).find((x) => x.trim() && !x.trim().startsWith("#")) ?? "");
      const text = after.replace(/^[\s:–—-]+/, "");
      const sentence = text.match(/^(.+?[.!?])(\s|$)/)?.[1] ?? text;
      if (sentence.length > 12) blurb = sentence.length > 150 ? `${sentence.slice(0, 147).trimEnd()}…` : sentence;
    }
    return { name: l.anchor, href: l.href, blurb };
  });
}
