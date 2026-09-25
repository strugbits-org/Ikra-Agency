import HeroNarrative from "@/components/HeroNarrative";
import DefinitionSection from "@/components/DefinitionSection";
import CaseStudies from "@/components/CaseStudies";
import { caseStudiesFromWix } from "@/components/cases/content";
import Footer from "@/components/Footer";

/**
 * The case-study cards are fetched on the server and this page is cached rather than rendered
 * per request — stating it here is what keeps the page from going dynamic just because
 * something inside it talked to a third party.
 *
 * A literal, and it has to be: Next reads route segment config statically, so
 * `WIX_REVALIDATE_SECONDS` — the same minute, and what `wixQuery` asks for on its own
 * fetch — cannot be imported into this position. Change this, `/about` and `lib/wix`
 * together or none of them; `lib/wix` is where the minute's reasoning lives.
 *
 * **This is the ceiling, not the period**: the shortest revalidate among a segment's fetches
 * governs, so the figure the build reports is whichever of this, the query's and the token
 * exchange's is lowest.
 */
export const revalidate = 60;

export default async function Home() {
  // Awaited here rather than inside CaseStudies because that component is a client component:
  // it owns ScrollTriggers and matchMedia, so it cannot hold the Wix credential or block on a
  // request. The section is the same distance down the page either way — this is a *build*
  // step, not a render one, so there is nothing to wait for at the top of the document.
  const projects = await caseStudiesFromWix();

  return (
    <main>
      <HeroNarrative />
      {/* DefinitionSection ends with the dots footer; the case studies follow it. */}
      <DefinitionSection />
      <CaseStudies projects={projects} />
      <Footer />
    </main>
  );
}
