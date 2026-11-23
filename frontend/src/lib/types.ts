/* Types mirror docs/API.md. Fields the backend may omit are optional. */

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface TokenUsage {
  in: number;
  out: number;
}

export interface ChatResponse {
  reply: string;
  tool_calls: ToolCall[];
  tokens: TokenUsage;
}

export interface AuthResponse {
  token: string;
  user_id: string;
}

export interface UserStats {
  articles: number;
  published: number;
  views: number;
  clicks: number;
  keywords_researched: number;
  chats: number;
  tokens_in: number;
  tokens_out: number;
}

export interface Me {
  user_id: string;
  memory: Record<string, string>;
  stats: UserStats;
}

export interface ThreadSummary {
  thread_id: string;
  title: string;
  last_at: string | null;
  messages: number;
}

export interface ThreadMessage {
  role: "user" | "assistant";
  content: string;
  tool_calls: ToolCall[];
}

export interface ThreadDetail {
  thread_id: string;
  messages: ThreadMessage[];
}

export type ArticleStatus = "draft" | "published";

export interface Article {
  id: string;
  title: string;
  slug: string;
  keyword: string;
  status: ArticleStatus;
  word_count: number;
  views: number;
  clicks: number;
  meta_description: string;
  created_at: string | null;
  published_at: string | null;
  url: string | null;
}

export interface AffiliateLink {
  id: string;
  anchor: string;
  url: string;
  clicks: number;
}

export interface FactCheck {
  claim: string;
  status: string;
  sources: string[];
}

export interface ArticleDetail extends Article {
  content_md: string;
  links: AffiliateLink[];
  fact_checks: FactCheck[];
}

export interface KeywordResult {
  keyword: string;
  intent: string;
  difficulty_est: number;
  opportunity: number;
}

export interface KeywordResearch {
  id: string;
  seed: string;
  created_at: string | null;
  results: KeywordResult[];
}

export interface RankCheck {
  keyword: string;
  domain: string;
  position: number | null;
  checked_at: string | null;
}

export interface DailyTraffic {
  date: string;
  views: number;
  clicks: number;
}

export interface ArticlePerformance {
  id: string;
  title: string;
  views: number;
  clicks: number;
  ctr_pct: number;
}

export interface Performance {
  daily: DailyTraffic[];
  articles: ArticlePerformance[];
}

/** Optional branding the backend may attach to a public site. */
export interface SiteBranding {
  tagline: string | null;
  accent: string | null;
  audience: string | null;
  about: string | null;
}

export interface PublicSiteSummary {
  user_id: string;
  site_name: string;
  published: number;
  last_published: string | null;
  tagline: string | null;
  accent: string | null;
  niche: string | null;
}

export interface PublicArticleSummary {
  title: string;
  slug: string;
  meta_description: string;
  keyword: string;
  word_count: number;
  published_at: string | null;
  views: number | null;
}

export interface PopularArticle {
  title: string;
  slug: string;
  views: number | null;
}

export interface PublicSite extends SiteBranding {
  user_id: string;
  site_name: string;
  niche: string | null;
  articles: PublicArticleSummary[];
  popular: PopularArticle[];
}

export interface PublicLink {
  anchor: string;
  href: string;
}

export interface RelatedArticle {
  title: string;
  slug: string;
  meta_description: string;
  published_at: string | null;
}

export interface PublicArticle extends SiteBranding {
  title: string;
  slug: string;
  meta_description: string;
  content_md: string;
  keyword: string;
  word_count: number;
  published_at: string | null;
  user_id: string;
  site_name: string;
  niche: string | null;
  links: PublicLink[];
  related: RelatedArticle[];
}

export interface AdminTotals {
  users: number;
  articles: number;
  published: number;
  views: number;
  clicks: number;
  chats: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  blocked: number;
  errors: number;
  avg_latency_ms: number;
}

export interface AdminDaily {
  date: string;
  chats: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
}

export interface ToolUsage {
  name: string;
  count: number;
}

export interface AdminOverview {
  totals: AdminTotals;
  daily: AdminDaily[];
  tool_usage: ToolUsage[];
}

export interface AdminUser {
  user_id: string;
  articles: number;
  published: number;
  views: number;
  clicks: number;
  chats: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  last_active: string | null;
}

export interface AdminLog {
  id: string;
  user_id: string;
  thread_id: string;
  message: string;
  reply: string;
  tool_calls: ToolCall[];
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  blocked: boolean;
  error: string | null;
  created_at: string | null;
}

export interface AdminArticle {
  id: string;
  user_id: string;
  title: string;
  keyword: string;
  status: ArticleStatus;
  views: number;
  clicks: number;
  word_count: number;
  created_at: string | null;
}
