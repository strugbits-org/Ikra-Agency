import type { Metadata } from "next";
import CaseStudyPage from "@/components/study/CaseStudyPage";
import { AUTO_MAXX } from "@/components/study/content";

export const metadata: Metadata = {
  title: `${AUTO_MAXX.title} — ikra`,
  description: AUTO_MAXX.summary,
};

export default function Page() {
  return <CaseStudyPage study={AUTO_MAXX} />;
}
