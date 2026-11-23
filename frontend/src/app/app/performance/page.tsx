import type { Metadata } from "next";
import { PerformanceView } from "@/components/app/performance";

export const metadata: Metadata = { title: "Performance" };

export default function PerformancePage() {
  return <PerformanceView />;
}
