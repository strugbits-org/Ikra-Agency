import type { ReactNode } from "react";
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
import type { BandKey, CaseStudy } from "./content";
import {
  APPLY_COLS,
  APPLY_PHOTO_ASPECT,
  BRAND_COLS,
  BRAND_MARK_ASPECT,
  BRAND_MARK_MAX,
  IDENTITY_COLS,
  IDENTITY_MEDIA_ASPECT,
} from "./metrics";

/**
 * A case-study page, whole: the bands its record asks for, over the site's footer.
 *
 * The route does nothing but pick the record — `app/work/<slug>/page.tsx` is a handful of
 * lines — so a second study is a second entry in ./content, and every measured figure, every
 * breakpoint and every piece of markup is shared between them.
 *
 * ## The band list is data, because the two studies genuinely differ
 *
 * The first pass here was a fixed sequence, on the assumption that a second study would be
 * the same page with different words. It is not. Cafe Technica runs nine bands and QCIF six;
 * QCIF has no outcome, no applications and no credits, and it puts the deliverables chart
 * third where the other puts it fifth. Encoding that as conditionals would have meant nine
 * `study.x && ...` guards and no way to express the reordering at all.
 *
 * So `study.bands` is an ordered list of keys and this file is the table that renders one.
 * The difference between the two pages is then one legible array per record, and a third
 * study needs nothing here unless it brings a genuinely new *kind* of band.
 *
 * What stays here rather than in the record is presentation that is the same wherever the
 * band appears: which side a media split's picture takes, which tone it sits on, its measured
 * column shares. Those are the layout's, not the client's.
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
 * which is what lets it be dropped into either study's band list.
 *
 * Because of that there is also no `prefers-reduced-motion` branch here. There is no motion
 * to reduce; the only transitions on the page are hover states on two links, which the global
 * reduced-motion rule in `app/globals.css` already flattens.
 */
export default function CaseStudyPage({ study }: { study: CaseStudy }) {
  return (
    <main>
      {study.bands.map((key) => (
        <BandFor key={key} band={key} study={study} />
      ))}
      <Footer />
    </main>
  );
}

/**
 * One band, by key.
 *
 * A key whose data is missing renders nothing rather than throwing — a half-written record
 * should show the bands it does have — but it says so in development, because a silently
 * absent band is otherwise indistinguishable from one that never got written.
 */
function BandFor({ band, study }: { band: BandKey; study: CaseStudy }): ReactNode {
  switch (band) {
    case "masthead":
      return <Masthead study={study} />;

    case "quote":
      return warnIfMissing(band, study.quote) && <PullQuote study={study} />;

    case "testimonial":
      return <Testimonial study={study} />;

    case "outcome":
      return warnIfMissing(band, study.outcome) && <Outcome study={study} />;

    case "deliverables":
      return <Deliverables study={study} />;

    case "credits":
      return warnIfMissing(band, study.credits) && <Credits study={study} />;

    case "glance":
      // The one band on this page that moves, and the band supplies its own field rather
      // than GrowthBars doing it — that component renders no `Band`, no `Measure` and no
      // `Display`, which is what keeps it usable on a route that has none of them.
      return (
        <Band tone="dark">
          <Measure>
            <GrowthBars
              items={study.glance.items}
              heading={<Display>{study.glance.title}</Display>}
            />
          </Measure>
        </Band>
      );

    // The three media splits: one composition, three measured layouts. Their tones, their
    // sides and their column shares are all that differ, and all of it is measured.
    case "brand":
      return (
        warnIfMissing(band, study.brand) && (
          <MediaSplit
            content={study.brand!}
            tone={study.masthead.tone ?? "dark"}
            side="right"
            cols={BRAND_COLS}
            aspect={BRAND_MARK_ASPECT}
            mediaMax={BRAND_MARK_MAX}
          />
        )
      );

    case "applications":
      return (
        warnIfMissing(band, study.applications) && (
          <MediaSplit
            content={study.applications!}
            tone="paper"
            side="right"
            cols={APPLY_COLS}
            aspect={APPLY_PHOTO_ASPECT}
            fullHeight
          />
        )
      );

    case "identity":
      return (
        warnIfMissing(band, study.identity) && (
          <MediaSplit
            content={study.identity!}
            tone="dark"
            side="left"
            cols={IDENTITY_COLS}
            aspect={IDENTITY_MEDIA_ASPECT}
            headingClassName="text-accent"
          />
        )
      );
  }
}

/** True when the band has data. Complains in development when it does not. */
function warnIfMissing(band: BandKey, data: unknown): boolean {
  if (data) return true;
  if (process.env.NODE_ENV !== "production") {
    console.error(
      `[CaseStudyPage] the band list asks for "${band}" but the record has no data for it, ` +
      "so the band is skipped. Remove the key or write the record.",
    );
  }
  return false;
}
