import type { Metadata } from "next";
import CaseStudyPage from "@/components/study/CaseStudyPage";
import { CAFE_TECHNICA } from "@/components/study/content";

export const metadata: Metadata = {
  title: `${CAFE_TECHNICA.title} — ikra`,
  description: CAFE_TECHNICA.summary,
};

export default function Page() {
  return <CaseStudyPage study={CAFE_TECHNICA} />;
}
