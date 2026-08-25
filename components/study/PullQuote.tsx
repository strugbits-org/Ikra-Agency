import type { CSSProperties } from "react";
import { Band, Display, Measure, Prose } from "./primitives";
import type { CaseStudy } from "./content";
import {
  QUOTE_BODY_GAP,
  QUOTE_COLS,
  QUOTE_MARK_SIZE,
  QUOTE_MARK_X,
  QUOTE_MARK_Y,
  QUOTE_MEASURE,
} from "./metrics";

/**
 * Band 2: the client's own line, set large in the serif, over two columns of narrative.
 *
 * ## The quotation mark hangs; the text does not move for it
 *
 * In the reference the pair of marks sits at x=42 while the sentence starts at 96 — the same
 * gutter every other line on the page starts at. So the marks are outdented into the gutter
 * rather than the sentence being indented past them, which is why they are absolutely
 * positioned here instead of being an inline glyph. An inline one would push the first line
 * right and leave the following two hanging left of it, which is the giveaway that a layout
 * has been eyeballed from a screenshot.
 *
 * They are also drawn rather than typed. `“` in the sans renders as two thin commas; the
 * reference's are two solid teardrops, which is a shape and not a character, so it is an
 * SVG. That also keeps them off whatever the serif's own quote glyph happens to look like.
 *
 * ## The two columns are unequal and do not reach the right gutter
 *
 * See QUOTE_COLS — 48.4% / 34% with 14.3% standing empty at the right. Both of those are
 * measured, and the empty right is what makes the block read as placed on the page rather
 * than justified across it.
 */
export default function PullQuote({ study }: { study: CaseStudy }) {
  const { text, columns } = study.quote;

  return (
    <Band tone="paper">
      <Measure>
        {/* The measure is the display's, not the band's — see QUOTE_MEASURE. Left to the
            full content box the quote sets as two lines instead of three. */}
        <div
          className="relative"
          style={
            {
              maxWidth: `${QUOTE_MEASURE}%`,
              "--mark-x": `calc(-1 * ${QUOTE_MARK_X})`,
              "--mark-y": `calc(-1 * ${QUOTE_MARK_Y})`,
            } as CSSProperties
          }
        >
          {/* Outdented into the gutter, and only where there is a gutter to outdent into:
              below `md` the page's own padding is 20px and the marks would fall off the
              left of the screen, so there they sit on the copy's own edge instead.

              `Display` is `relative` and comes second, so the sentence paints over the
              marks — positioned siblings paint in tree order, and both of these are
              positioned. Leave the paragraph static and the absolutely-placed marks would
              paint over the words instead. */}
          <QuoteMark className="absolute left-0 md:left-[var(--mark-x)]" />
          <Display className="relative">{text}</Display>
        </div>

        {/* Percentage tracks that deliberately do not add up: 48.4 + 3.3 + 34 leaves 14.3%
            of free space, which grid puts at the end because `justify-content` starts. That
            leftover is the measurement, not an oversight. */}
        <div
          className="grid grid-cols-1 gap-y-10 lg:gap-y-0 lg:[column-gap:var(--quote-gap)] lg:[grid-template-columns:var(--quote-cols)]"
          style={
            {
              marginTop: QUOTE_BODY_GAP,
              "--quote-cols": `${QUOTE_COLS.left}% ${QUOTE_COLS.right}%`,
              "--quote-gap": `${QUOTE_COLS.gap}%`,
            } as CSSProperties
          }
        >
          {columns.map((paragraphs) => (
            <Prose key={paragraphs[0]} paragraphs={paragraphs} leading="dense" />
          ))}
        </div>
      </Measure>
    </Band>
  );
}

function QuoteMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      /* Two droplets, point at the top and mass at the bottom — not two commas.
         The reference's mark is a teardrop the *other* way up from a typographic
         opening quote: a round bulb sitting low with a cusp rising to the right, and
         no tail below it at all. The spike's right edge is *concave* into the bulb,
         which is the detail that separates it from a plain teardrop. Drawn twice, 68
         units apart, in a 118 x 72 box, so the pair reproduces the measured 118 x 75 at
         the shipped size. Two earlier passes drew the ordinary comma-shaped glyph —
         what `“` itself gives you, and exactly what this is not. */
      viewBox="0 0 118 72"
      className={`pointer-events-none text-accent ${className}`}
      style={{ width: QUOTE_MARK_SIZE, top: "var(--mark-y)" }}
      fill="currentColor"
    >
      <path d="M36 0C28 18 0 22 0 47c0 13.8 11.2 25 25 25s25-11.2 25-25c-5-14-11-33-14-47Z" />
      <path d="M104 0c-8 18-36 22-36 47 0 13.8 11.2 25 25 25s25-11.2 25-25c-5-14-11-33-14-47Z" />
    </svg>
  );
}
