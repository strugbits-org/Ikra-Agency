import type { CSSProperties, ReactNode } from "react";
import {
  BAND_PAD,
  GUTTER,
  LEADING,
  TYPE,
} from "./metrics";

/**
 * The four building blocks every band on a case-study page is assembled from.
 *
 * Server components, all of them: this page has no scroll choreography, no measurement and
 * no state, so nothing here needs `"use client"`. That is worth stating because the rest of
 * `components/` is the opposite — the home page's three sections are entirely client-side
 * because they are driven by GSAP. A case study is a document.
 *
 * ## Why the sizes arrive as inline styles rather than classes
 *
 * Every figure is a `clamp()` built in ./metrics from a measured pixel value against the
 * reference's 1902px viewport. Passing them through Tailwind arbitrary values would mean
 * writing the same `clamp()` out again as an unreadable bracket string at each call site,
 * and the measured number — the only thing anyone will want to check — would disappear into
 * it. Read them here, read them in ./metrics, and they cannot disagree.
 */

/**
 * The fields a case study is presented on.
 *
 * The first four are the Cafe Technica reference's own alternation. `navy` is the QCIF
 * study's, sampled off that client's asset — see `--color-navy` in `app/globals.css`. This
 * is an enumeration rather than a free className on purpose: each entry pairs a field with
 * the ink that is legible on it, so a band cannot be given a ground without also being given
 * a foreground.
 */
export type Tone = "dark" | "paper" | "ember" | "white" | "navy";

const TONE: Record<Tone, string> = {
  // Measured #000000 / #ffffff and #f7f7f7 / #000000 — the reference sets pure black and
  // pure white here, not this site's `--color-ink`, which is a warm near-black and reads
  // brown against a photograph.
  dark: "bg-black text-white",
  paper: "bg-paper text-black",
  ember: "bg-ember text-white",
  // The credits sit on pure white rather than on `paper` — measured, and the only place on
  // the page the two are set next to each other, which is what makes the step visible.
  white: "bg-white text-black",
  navy: "bg-navy text-white",
};

/**
 * How far each band overlaps the one below it, in px.
 *
 * Without it a hairline of the page's own background opens at the seam **while the page is
 * scrolling** and closes again whenever it stops. ScrollSmoother translates `#smooth-content`
 * by a fractional number of pixels, so two adjacent boxes that share an edge in layout round
 * that edge independently when they rasterise, and a sub-pixel gap falls between them. Behind
 * them is `--color-cream`, so on the QCIF study's navy — where two bands of the *same* colour
 * meet and there is nothing else to explain a line — it reads as a grey rule under the
 * masthead. Measured mid-scroll before the fix: an isolated #f0e5e3 row between two navy rows
 * on 22 of 26 sampled frames, and none at all once the scroll settled, which is the signature.
 *
 * A negative margin rather than a border or an outline: it makes the boxes genuinely overlap,
 * so the band below paints its own background across the gap whatever way the rounding goes.
 * What it covers is the last pixel of the band's *padding*, so no copy moves and nothing is
 * hidden. Same problem, and the same answer, as `IMAGE_SEAM_BLEED_PX` in the definition
 * section's footer and the oversized panels in the hero's doors.
 */
const BAND_BLEED = "1px";

/**
 * One full-bleed horizontal band.
 *
 * `padY` is separate from the tone because the masthead closes 120px under its columns while
 * the other three close on ~95 — see MASTHEAD_PAD_BOTTOM.
 */
export function Band({
  tone,
  children,
  padTop = BAND_PAD,
  padBottom = BAND_PAD,
  className = "",
}: {
  tone: Tone;
  children: ReactNode;
  padTop?: string;
  padBottom?: string;
  className?: string;
}) {
  return (
    <section
      className={`w-full ${TONE[tone]} ${className}`}
      style={{
        paddingTop: padTop,
        paddingBottom: padBottom,
        marginBottom: `-${BAND_BLEED}`,
      }}
    >
      {children}
    </section>
  );
}

/**
 * The content box inside a band: the page's gutter, and nothing else.
 *
 * No `max-width`. The reference has none — at 1902 its copy runs the full width between the
 * gutters, and every column position on the page is a share of that box rather than of a
 * centred measure. Capping it would move all of them at once.
 */
export function Measure({
  children,
  gutter = GUTTER,
  className = "",
}: {
  children: ReactNode;
  gutter?: string;
  className?: string;
}) {
  return (
    <div
      className={`w-full ${className}`}
      style={{ paddingLeft: gutter, paddingRight: gutter }}
    >
      {children}
    </div>
  );
}

/**
 * A display line: the editorial serif, at the one size the whole page uses it at.
 *
 * `text-balance` is deliberately absent. The reference's three display blocks each break
 * where their own measure runs out — the pull quote's third line is four words long — and
 * balancing them would even the ragged edge the layout is built around.
 */
export function Display({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p
      className={`font-serif font-normal ${className}`}
      style={{
        fontSize: TYPE.display,
        lineHeight: LEADING.display,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

/**
 * A run of body paragraphs at one of the two measured leadings.
 *
 * Paragraph separation is exactly one blank line of whatever leading the block is set on —
 * measured 70px against a 35px pitch in the masthead and 57px against 28px in the pull
 * quote, i.e. the same rule at both. Expressing it as `calc(var(--lh) * 1em)` rather than a
 * fixed margin is what keeps that true as the type scales: the gap is a line, not a number.
 */
export function Prose({
  paragraphs,
  leading = "body",
  className = "",
  style,
}: {
  paragraphs: readonly string[];
  leading?: "body" | "dense";
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`[&>p+p]:mt-[calc(var(--lh)*1em)] ${className}`}
      style={
        {
          fontSize: TYPE.body,
          lineHeight: LEADING[leading],
          "--lh": LEADING[leading],
          ...style,
        } as CSSProperties
      }
    >
      {paragraphs.map((text) => (
        <p key={text}>{text}</p>
      ))}
    </div>
  );
}
