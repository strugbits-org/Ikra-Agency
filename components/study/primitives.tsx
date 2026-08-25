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

/** The four fields the reference alternates between. */
export type Tone = "dark" | "paper" | "ember" | "white";

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
};

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
      style={{ paddingTop: padTop, paddingBottom: padBottom }}
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
