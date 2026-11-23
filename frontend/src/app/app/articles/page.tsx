import type { Metadata } from "next";
import { ArticlesView } from "@/components/app/articles";

export const metadata: Metadata = { title: "Articles" };

export default function ArticlesPage() {
  return <ArticlesView />;
}
