export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860").replace(/\/+$/, "");

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "RankForge";

/** Absolute origin of this frontend, used for canonical/OpenGraph URLs. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "http://localhost:3000"
).replace(/\/+$/, "");
