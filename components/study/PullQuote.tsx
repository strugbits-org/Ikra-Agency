import type { CSSProperties } from "react";
import { MARK_PATH, MARK_STEP_X, MARK_VIEW_BOX } from "@/components/about/marks";
import { Band, Display, Measure, Prose } from "./primitives";
import type { Tone } from "./primitives";
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
 * They are also drawn rather than typed. `“` in the sans renders as two thin commas; this is
 * a solid shape and not a character, so it is an SVG — which also keeps it off whatever the
 * serif's own quote glyph happens to look like. **The drawing itself is the founders section's,
 * imported rather than copied**: `components/about/marks.ts` carries the reference site's own
 * outline, lifted out of its DOM, and two copies of a 500-character path is how the two ends of
 * one site drift apart. Only the shape is shared — the size, the colour and the outdent here
 * are this band's own measured figures.
 *
 * ## The marks come off when nobody is being quoted
 *
 * QCIF reuses this composition — a display line over two unequal columns — for a lead
 * statement about what the client does. That is the studio's own sentence, so hanging
 * quotation marks on it would attribute it to them. `marks: false` is that band; everything
 * else about the layout is shared, which is the whole reason it is one component.
 *
 * ## The two columns are unequal and do not reach the right gutter
 *
 * See QUOTE_COLS — 48.4% / 34% with 14.3% standing empty at the right. Both of those are
 * measured, and the empty right is what makes the block read as placed on the page rather
 * than justified across it.
 */
export default function PullQuote({ study }: { study: CaseStudy }) {
  if (!study.quote) return null;
  const { text, columns, marks = true, tone = "paper" } = study.quote;

  return (
    <Band tone={tone as Tone}>
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
          {marks && <QuoteMark className="absolute left-0 md:left-[var(--mark-x)]" />}
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
      /* The outline and the viewBox both come from ../about/marks — the path in its own
         coordinates and the box that converts them — exactly as the founders section draws
         it. The pair keeps its measured 118px width; the shape is a little taller in
         proportion than the one it replaces, so at the reference size the marks reach 2.7px
         further down into the first line, which is the direction the overlap is deliberate
         in anyway (see the head of this file). */
      viewBox={MARK_VIEW_BOX}
      className={`pointer-events-none text-accent ${className}`}
      style={{ width: QUOTE_MARK_SIZE, top: "var(--mark-y)" }}
      fill="currentColor"
    >
      <path d={MARK_PATH} />
      <path d={MARK_PATH} transform={`translate(${MARK_STEP_X} 0)`} />
    </svg>
  );
}
