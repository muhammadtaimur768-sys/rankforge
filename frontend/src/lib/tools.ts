import {
  BarChart3,
  FileSearch,
  FileText,
  Files,
  Link2,
  PenLine,
  Search,
  Send,
  ShieldCheck,
  Target,
  Trash2,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type Stage = "Research" | "Write" | "Fact-check" | "Link" | "Publish" | "Track";

export const STAGES: { name: Stage; index: string }[] = [
  { name: "Research", index: "01" },
  { name: "Write", index: "02" },
  { name: "Fact-check", index: "03" },
  { name: "Link", index: "04" },
  { name: "Publish", index: "05" },
  { name: "Track", index: "06" },
];

export interface ToolMeta {
  label: string;
  icon: LucideIcon;
  stage: Stage | null;
}

/** One map for every place a tool name is shown: chat chips, admin logs, charts. */
export const TOOL_META: Record<string, ToolMeta> = {
  keyword_research: { label: "Keyword research", icon: Search, stage: "Research" },
  write_article: { label: "Wrote article", icon: PenLine, stage: "Write" },
  fact_check: { label: "Fact-check", icon: ShieldCheck, stage: "Fact-check" },
  add_affiliate_link: { label: "Added affiliate link", icon: Link2, stage: "Link" },
  publish_article: { label: "Published article", icon: Send, stage: "Publish" },
  get_performance: { label: "Pulled performance", icon: BarChart3, stage: "Track" },
  check_ranking: { label: "Checked ranking", icon: Target, stage: "Track" },
  list_articles: { label: "Listed articles", icon: Files, stage: null },
  get_article: { label: "Opened article", icon: FileText, stage: null },
  delete_article: { label: "Deleted article", icon: Trash2, stage: null },
};

export function toolMeta(name: string): ToolMeta {
  return (
    TOOL_META[name] ?? {
      label: name.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase()) || "Tool",
      icon: name.includes("search") ? FileSearch : Wrench,
      stage: null,
    }
  );
}

export function stageIndex(stage: Stage | null) {
  return STAGES.find((s) => s.name === stage)?.index ?? null;
}
