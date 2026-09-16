/**
 * Every measured figure the approach section's layout is built from, and the `fluid()` that
 * turns each one into a `clamp()`.
 *
 * A separate module from the layers for the reason `study/metrics.ts` and
 * `playground/metrics.ts` exist: the only thing anyone will want to check about a figure here
 * is what it measured, and a `clamp()` written out as a Tailwind bracket string at its call
 * site buries exactly that. It is also why sizes arrive as inline styles rather than classes.
 *
 * **The reference is `third-section.mp4` (1920 x 1040, 30.4fps), a capture of the client's own
 * Wix page** — 87px of browser chrome over a 1905 x 953 viewport, so every figure below is a
 * share of 1905. That provenance matters in one direction: the *mechanism* and the type scale
 * are the reference's and are transcribed, but its column grid is a Wix layout rather than a
 * designed one and is deliberately not reproduced — see CELL_COUNT.
 */

const REF_W = 1905;

export const fluid = (minPx: number, refPx: number, maxPx: number) =>
  `clamp(${minPx}px, ${((refPx / REF_W) * 100).toFixed(4)}vw, ${maxPx}px)`;

/* ── the rail ─────────────────────────────────────────────────────────────────── */

/**
 * The bar's thickness and the dots' diameter, both measured to the pixel on a settled frame:
 * the accent runs 16 rows deep away from any dot and 64 at each dot's centre.
 *
 * The 4:1 relation is the thing to preserve if either is retuned — it is what makes the dots
 * read as stations on a line rather than as circles with a line between them.
 */
export const BAR_H = fluid(8, 16, 20);
export const DOT_D = fluid(32, 64, 78);

/** The dot's diameter unclamped, for the one figure derived from it below. */
export const DOT_D_REF = 64;

/**
 * How many cells are on screen at once, and therefore how wide one cell is.
 *
 * Three, from the reference. **Its own three columns are not evenly spaced** — the measured
 * dot centres are 143.5 / 727.5 / 1326.5, i.e. pitches of 584 and 599 — and that 15px
 * discrepancy is not reproduced. It is a Wix grid artefact rather than a design: the same
 * capture has the third column's longest line running 81px past the right end of the rail,
 * which no deliberate layout does. An even third is what the composition reads as, and it is
 * the only version that generalises to the N cells this section now has to carry.
 */
export const CELL_COUNT = 3;

/**
 * The dot's left edge sits on its column's left edge — measured 111.5 / 695.5 / 1294.5 against
 * text columns starting at 110 / 694 / 1293. So the dot's *centre* is one radius into the
 * cell, which is what this says, and the copy below it needs no offset of its own.
 */
export const DOT_INSET_REF = DOT_D_REF / 2;

/**
 * How far the rail runs to the **left of the first dot**, measured 82px: the reference's line
 * starts at x=28 against a first dot whose left edge is at 111.5, and ends at 1745 against a
 * content box that runs to 1795. So its rail is not the content box at all — it is the same
 * length, shifted ~82px left, and the visible consequence is a short run of line before the
 * first station.
 *
 * It is load-bearing rather than decorative, which is why it is measured rather than eyeballed.
 * ./measure's `stopsFor` gives every dot a stop, and the first dot's only earns its gesture
 * because of this: without the lead-in its coverage point is 64px into a 1685px line, so the
 * opening scroll draws a third of a percent of the rail and reads as the section ignoring the
 * reader, which is why the first build had no stop there and why the first scroll appeared to
 * jump to the second dot. With it, the opening gesture draws 146px and pops a dot.
 *
 * **It comes out of the gutter, not out of the first cell.** GUTTER is 110 at the reference and
 * this is 82, and the relation holds at every width the row exists at — 44 against 59 at 1024,
 * 100 against 132 at 2560 — so the rail always reaches into the page's left margin and never to
 * the edge of the window, and no dot or column moves to make room for it. ./ApproachLayers'
 * `approachStageClip` is what lets it draw out there.
 */
export const RAIL_LEAD_IN = fluid(24, 82, 100);

/* ── type ─────────────────────────────────────────────────────────────────────── */

/**
 * The heading: 42px on a 51px line pitch.
 *
 * Solved rather than eyeballed, the same method `study/metrics.ts` uses — the cap height of
 * the "D" in "Discovering" measures 30px, and Zalando Sans' cap is 0.714 of its size, which
 * returns 42.0. The pitch is then measured directly: the two lines of "Discovering your /
 * competitive value" have their cap tops at 263 and 314.
 */
export const HEADING = fluid(26, 42, 50);
export const HEADING_LEADING = 51 / 42;

/**
 * The heading's tracking, and it is measured rather than a taste.
 *
 * Set at 42px with the site's own default, this section's headings render with ink widths of
 * 348 and 364px against the reference's 356 and 374 for the same two lines — 2.3% and 2.7%
 * narrow at an *identical* cap height (39 and 38px of ink in both). Identical height with
 * different width is letter-spacing, not size. 8px spread over the 15 gaps of "Discovering
 * your" is 0.53px at 42px, and 10px over the 16 of "competitive value" is 0.63px, which is
 * 0.0127 and 0.0150 em.
 *
 * It is load-bearing rather than cosmetic: without it "Build Your Strategic IP" sets on one
 * line where the reference breaks it after "Strategic", and that break is what HEADING_MEASURE
 * is pinned against.
 */
export const HEADING_TRACKING = "0.014em";

/**
 * The body: 24px on a 38px pitch — **the same pair as `playground/metrics.ts`**, measured
 * independently here (cap "W" 17px against the same 0.714 cap, and ten consecutive line tops
 * 38px apart) and landing on the same numbers. That agreement is worth keeping: the two
 * sections sit on one page and one body size is what makes them read as one document.
 */
export const BODY = fluid(16, 24, 28);
export const BODY_LEADING = 38 / 24;

/**
 * The two vertical gaps, both measured as ink and restated as margins.
 *
 * Dot bottom (y=142) to the heading's first cap top (y=176) is 34px; the heading's last cap
 * top (y=227) to the body's first cap top (y=308) is 81px.
 *
 * Both are restated as margins and then **verified against the render**, which is the only way
 * to do it — the conversion depends on the face's own ascent and half-leading, so arithmetic
 * would only be a guess with more decimal places. Measured on the built page against the same
 * reference frame: the rail-to-heading gap lands at 67px against the reference's 66, and the
 * heading-to-body gap needed 30 rather than the 24 the first pass assumed (it measured 75
 * against 81).
 */
export const RAIL_GAP = fluid(14, 24, 30);
export const HEADING_GAP = fluid(18, 30, 36);

/**
 * The gutter either side of the track, and the air above and below the whole section.
 *
 * The reference gives the gutter (its columns start at x=110, so 5.8% of the width) but says
 * nothing about the section's own padding — the capture never shows the band's top edge, and
 * at the settled frame the rail is still climbing. These are this build's, sized to sit
 * between the founders section above and the footer below.
 */
export const GUTTER = fluid(24, 110, 132);
export const PAD_TOP = fluid(72, 180, 220);
export const PAD_BOTTOM = fluid(72, 180, 220);

/**
 * **The heading and the body have different measures, and that is the reference's own doing
 * rather than an oversight to tidy up.** Both are shares of the cell, so they hold at every
 * viewport and every cell count.
 *
 * The body's is bounded from below: column 2's longest line runs 694 → 1227, so 533 of a
 * ~584px pitch, i.e. at least 91%.
 *
 * The heading's is bounded from *both* sides by the reference's own line breaks, the same way
 * `playground/metrics.ts` pins its copy column — and the bounds are the widths the built page
 * actually reports rather than ink measured off the recording, because ink excludes the side
 * bearings and the trailing letter-spacing and understates the box by ~9px. Measured in the
 * browser at this section's own type: "Bring the story to life" needs **450.6px** to stay on
 * one line, and "Build Your Strategic IP" needs **479.5px** — which it must not get, because
 * the reference breaks it after "Strategic". So the measure lives in a 29px window, and 82.8%
 * of a 561.7px cell is 465px, the middle of it.
 *
 * That share is not the reference's (its own first column works out near 78%) but the
 * resulting *width* is: 465px sits inside the reference's own [450, 474] window. The
 * difference is only that this build's cells are an even third and a little narrower than its
 * first column — see CELL_COUNT — so the same line has to fit in less room.
 *
 * The 14px of margin either side is thin by construction, and this has to be checked together
 * with HEADING_TRACKING: widen the tracking and the long heading wraps a word early, narrow it
 * and the short one stops wrapping at all. A first pass at 80% missed by 1.3px.
 */
export const HEADING_MEASURE = 0.828;
export const BODY_MEASURE = 0.92;

/* ── the vertical rail, below `lg` ────────────────────────────────────────────── */

/**
 * Below `lg` the rail stands up and the cells stack under it — see `timeline.ts`'s MQ for why
 * this is a different composition rather than a narrower version of the same one.
 *
 * The bar keeps its thickness and the dots their diameter; what changes is that the dot's
 * *centre* now sits on a vertical line at this distance from the section's left gutter, and
 * the copy is indented clear of it.
 */
export const STACK_RAIL_X = fluid(16, 32, 40);
export const STACK_COPY_INDENT = fluid(56, 96, 112);
export const STACK_CELL_GAP = fluid(48, 96, 112);
