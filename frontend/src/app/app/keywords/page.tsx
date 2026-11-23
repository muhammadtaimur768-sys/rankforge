import type { Metadata } from "next";
import { KeywordsView } from "@/components/app/keywords";

export const metadata: Metadata = { title: "Keywords" };

export default function KeywordsPage() {
  return <KeywordsView />;
}
