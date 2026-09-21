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
import { APPLY_COLS, IDENTITY_COLS } from "./metrics";

/**
 * A case-study page, whole: one fixed sequence of bands, over the site's footer.
 *
 * The route does nothing but fetch the record — `app/work/[slug]/page.tsx` is a handful of
 * lines — so a new study is a row in the client's CMS, and every measured figure, every
 * breakpoint and every piece of markup is shared between them.
 *
 * ## The band list is a fixed sequence again, and that is the point of the rewrite
 *
 * It was data for a while, and the reasoning was sound at the time: the studies genuinely
 * were different pages. Cafe Technica ran nine bands and QCIF six, in a different order, with
 * a brand band the others didn't have — so `study.bands` was an ordered list of keys per
 * record and this file was the table that rendered one. Encoding that as conditionals would
 * have meant nine `study.x && …` guards and no way to express the reordering at all.
 *
 * The three have since been brought onto one template deliberately, which removes the
 * difference the mechanism existed for. QCIF's brand band is gone (its copy is that study's
 * outcome now), its chart and quote sit where the other two put them, and what is left
 * varying between the studies is **which parts have anything in them** — QCIF has no
 * applications band because its row's applications fields are empty. An ordering that never
 * differs is better as a sequence you can read down than as an array in three records, and a
 * band that appears when it has content needs no key at all.
 *
 * So: this order, and `./cms` returns `undefined` for a band the CMS row hasn't filled in.
 * A half-written fourth study renders the bands it has, in this order, and nothing else —
 * which is also what a client sees while they are writing one.
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
 * The one exception is the deliverables chart, whose bars grow as the band arrives — it
 * brings its own sequence and its own reduced-motion path, and renders no field of its own,
 * which is what lets it be dropped into the sequence below.
 *
 * Because of that there is also no `prefers-reduced-motion` branch here. There is no motion
 * to reduce; the only transitions on the page are hover states on two links, which the global
 * reduced-motion rule in `app/globals.css` already flattens.
 */
export default function CaseStudyPage({ study }: { study: CaseStudy }) {
  return (
    <main>
      <Masthead study={study} />

      {study.quote ? <PullQuote study={study} /> : null}

      <Testimonial study={study} />

      {study.outcome ? <Outcome study={study} /> : null}

      {study.glance ? (
        // The one band on this page that moves, and the band supplies its own field rather
        // than GrowthBars doing it — that component renders no `Band`, no `Measure` and no
        // `Display`, which is what keeps it usable on a route that has none of them.
        <Band tone="dark">
          <Measure>
            <GrowthBars
              items={study.glance.items}
              heading={<Display>{study.glance.title}</Display>}
            />
          </Measure>
        </Band>
      ) : null}

      {/* The two copy-beside-media bands: one composition, two measured layouts. Their tones,
          their sides and their column shares are all that differ, and all of it is measured —
          which is why those figures are here rather than in a record. They are the client's
          words, not the client's layout. */}
      {study.applications ? (
        <MediaSplit
          content={study.applications}
          tone="paper"
          side="right"
          cols={APPLY_COLS}
          fullHeight
        />
      ) : null}

      {study.identity ? (
        <MediaSplit
          content={study.identity}
          tone="dark"
          side="left"
          cols={IDENTITY_COLS}
          headingClassName="text-accent"
        />
      ) : null}

      {study.deliverables ? <Deliverables study={study} /> : null}

      {study.credits ? <Credits study={study} /> : null}

      <Footer />
    </main>
  );
}
