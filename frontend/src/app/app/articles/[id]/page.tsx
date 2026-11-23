import type { Metadata } from "next";
import { ArticleDetailView } from "@/components/app/article-detail";

export const metadata: Metadata = { title: "Article" };

export default function ArticleDetailPage() {
  return <ArticleDetailView />;
}
