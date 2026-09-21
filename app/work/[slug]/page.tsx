import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CaseStudyPage from "@/components/study/CaseStudyPage";
import { caseStudyFromWix, caseStudySlugsFromWix } from "@/components/study/cms";
import { STUDY_SLUGS } from "@/components/study/content";

/**
 * Every case study, at `/work/<slug>`.
 *
 * This replaced three routes that each picked a hard-coded record — `app/work/cafe-technica`,
 * `/qcif` and `/auto-maxx`, eleven near-identical lines apiece. The studies are one template
 * over the client's own CMS now (see `components/study/cms.ts`), so the slug is the only thing
 * that varies and a fourth study is a row rather than a folder.
 *
 * **`revalidate` has to stay a literal.** Next reads route segment config statically, so
 * `WIX_REVALIDATE_SECONDS` cannot be imported into this position however much it wants to be.
 * There are three of these now — here, `app/page.tsx` and `app/playground/page.tsx` — and they
 * are meant to agree, so change all three or none. `npm run build` printing `○` against this
 * route with a 1m revalidate is the check that it is still prerendered; a single uncached
 * fetch turns it `ƒ`.
 */
export const revalidate = 60;

/**
 * The slugs prerendered at build time: whatever the CMS has, plus the three that exist today.
 *
 * The union is deliberate. `generateStaticParams` runs once per build and **not** on
 * revalidation, so a row added in the CMS afterwards is not in this list — it works anyway,
 * because `dynamicParams` is left at its default of `true` and Next renders an unknown slug on
 * demand and then caches it. What the floor buys is the other direction: if the CMS happens to
 * be unreachable during a build, the three routes the home page links to are still in the
 * manifest rather than missing from it.
 */
export async function generateStaticParams() {
  const slugs = await caseStudySlugsFromWix();
  return [...new Set([...STUDY_SLUGS, ...slugs])].map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = await caseStudyFromWix(slug);
  if (!study) return {};
  return { title: `${study.title} — ikra`, description: study.summary };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = await caseStudyFromWix(slug);

  // No row, or a row too empty to be a page — see `normalise` in ./cms for what "too empty"
  // means. A 404 rather than a half-drawn study, and it heals on its own: the next request
  // after the revalidate window asks the CMS again.
  if (!study) notFound();

  return <CaseStudyPage study={study} />;
}
