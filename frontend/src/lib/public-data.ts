import { cache } from "react";
import { api, ApiError } from "./api";
import type { PublicArticle, PublicSite } from "./types";

export type Loaded<T> = { ok: true; data: T } | { ok: false; notFound: boolean; message: string };

async function load<T>(fn: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    const notFound = err instanceof ApiError && err.status === 404;
    return { ok: false, notFound, message: err instanceof Error ? err.message : "Unknown error" };
  }
}

/** Deduped per request, so generateMetadata and the page share one call (and one counted view). */
export const getPublicSite = cache((userId: string) => load<PublicSite>(() => api.public.site(userId)));

export const getPublicArticle = cache((userId: string, slug: string) =>
  load<PublicArticle>(() => api.public.article(userId, slug)),
);
