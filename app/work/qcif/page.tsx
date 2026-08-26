import type { Metadata } from "next";
import CaseStudyPage from "@/components/study/CaseStudyPage";
import { QCIF } from "@/components/study/content";

export const metadata: Metadata = {
  title: `${QCIF.title} — ikra`,
  description: QCIF.summary,
};

export default function Page() {
  return <CaseStudyPage study={QCIF} />;
}
