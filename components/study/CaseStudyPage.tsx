import Credits from "./Credits";
import Deliverables from "./Deliverables";
import GrowthBars from "@/components/growth/GrowthBars";
import Masthead from "./Masthead";
import MediaSplit from "./MediaSplit";
import Outcome from "./Outcome";
import PullQuote from "./PullQuote";
import Testimonial from "./Testimonial";
import Footer from "@/components/Footer";
import { Band, Display, Measure } from "./primitives";
import type { CaseStudy } from "./content";
import {
  APPLY_COLS,
  APPLY_PHOTO_ASPECT,
  IDENTITY_COLS,
  IDENTITY_MEDIA_ASPECT,
} from "./metrics";

/**
 * A case-study page, whole: eight bands over the site's footer, driven entirely by one
 * `CaseStudy`.
 *
 * The route does nothing but pick the record — `app/work/<slug>/page.tsx` is three lines —
 * so a second study is a second entry in ./content plus a second folder, and every measured
 * figure, every breakpoint and every piece of markup is shared between them.
 *
 * ## Nothing here animates, and that is a finding rather than an omission
 *
 * The reference recording is a plain scroll-through: the bands do not pin, nothing fades in
 * on approach, and no element moves relative to another as the page passes. So there is no
 * `sequence.ts` next to these files and no `matchMedia` — this page is a document, and the
 * five-part split the home page's sections use (see CLAUDE.md) would be four empty modules.
 * The one thing it does inherit is ScrollSmoother, which `app/layout.tsx` wraps every route
 * in, and that needs no participation from the page.
 *
 * Because of that there is also no `prefers-reduced-motion` branch. There is no motion to
 * reduce; the only transitions on the page are hover states on two links, which the global
 * reduced-motion rule in `app/globals.css` already flattens.
 */
export default function CaseStudyPage({ study }: { study: CaseStudy }) {
  return (
    <main>
      <Masthead study={study} />
      <PullQuote study={study} />
      <Testimonial study={study} />
      <Outcome study={study} />

      {/* The one band on this page that moves, and the band supplies its own field rather
          than GrowthBars doing it — that component renders no `Band`, no `Measure` and no
          `Display`, which is what keeps it usable on a route that has none of them. */}
      <Band tone="dark">
        <Measure>
          <GrowthBars
            items={study.glance.items}
            heading={<Display>{study.glance.title}</Display>}
          />
        </Measure>
      </Band>

      {/* Two bands, one composition — see MediaSplit. Their tones,
          their sides and their column shares are all that differ, and all three are
          measured. */}
      <MediaSplit
        content={study.applications}
        tone="paper"
        side="right"
        cols={APPLY_COLS}
        aspect={APPLY_PHOTO_ASPECT}
        fullHeight
      />
      <MediaSplit
        content={study.identity}
        tone="dark"
        side="left"
        cols={IDENTITY_COLS}
        aspect={IDENTITY_MEDIA_ASPECT}
        headingClassName="text-accent"
      />

      <Deliverables study={study} />
      <Credits study={study} />
      <Footer />
    </main>
  );
}
