import type { Metadata } from "next";
import PlaygroundNarrative from "@/components/PlaygroundNarrative";
import AboutSection from "@/components/AboutSection";
import { foundersFromWix } from "@/components/about/content";
import ApproachSection from "@/components/ApproachSection";
import { approachFromWix } from "@/components/approach/content";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "ikra — playground",
  description: "Work upstream.",
};

/**
 * The founders' copy is fetched on the server and the page is cached for an hour rather than
 * rendered per request — stating it here is what keeps the *page* from going dynamic just
 * because something inside it talked to a third party.
 *
 * A literal, and it has to be: Next reads route segment config statically, so
 * `WIX_REVALIDATE_SECONDS` — which is the same 3600 and is what `wixQuery` tags its own fetch
 * with — cannot be imported into this position. Change both or neither.
 *
 * The figure the build reports for this route is 30m rather than 1h, and that is right: the
 * shortest revalidate among a segment's fetches governs, and the token exchange's is half an
 * hour for a reason `lib/wix` sets out. This is the ceiling, not the period.
 */
export const revalidate = 3600;

export default async function PlaygroundPage() {
  // In parallel: two independent collections behind one token, so serialising them would
  // spend a second Wix round trip for nothing on a cold render.
  const [founders, approach] = await Promise.all([
    foundersFromWix(),
    approachFromWix(),
  ]);

  return (
    <main>
      <PlaygroundNarrative />
      <AboutSection founders={founders} />
      <ApproachSection points={approach} />
      <Footer />
    </main>
  );
}
