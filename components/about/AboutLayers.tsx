import type { CSSProperties } from "react";
import type { Founder } from "./content";
import {
  BLOCK_W,
  BLOCK_W_PCT,
  BODY,
  BODY_LEADING,
  COLUMN,
  COLUMN_PCT,
  FLANK_H,
  FLANK_INSET_PCT,
  FLANK_TOP_NUDGE,
  FLANK_W,
  FLANK_W_PCT,
  MARK_GAP,
  MARK_H,
  MARK_LEFT,
  MARK_TOP,
  MARK_W,
  MEDIA,
  MEDIA_GAP,
  MEDIA_TOP_NUDGE,
  PARA_GAP_EM,
  QUOTE,
  QUOTE_LEADING,
  QUOTE_TRACKING,
  RULE_BOTTOM,
  RULE_TOP,
  STACK_GUTTER,
  STACK_MEASURE_MAX,
  STACK_MEDIA_MAX,
  fluid,
} from "./metrics";

/**
 * The founders section's layers: the quotation marks, the photograph's frame, the column of
 * type, and the two compositions they go into. Markup and classes only — every figure comes
 * from ./metrics, the one beat from ./timeline, and nothing here animates itself. The frames
 * carry `data-media-shape` and `data-media-at`, which is all ./sequence looks for.
 *
 * **`lg:` is ./metrics' ROW_MIN_WIDTH**, which is 1024px and is Tailwind's own `lg`. Below it
 * every block is one stacked column — photograph, then type — for the reason stated there.
 * The two are the same number on purpose; if the breakpoint is ever customised in
 * `globals.css`, ROW_MIN_WIDTH's docblock is what has to move with it.
 *
 * **Responsive widths are classes and measured widths are inline styles**, and the split is
 * not cosmetic: an inline style beats any class, so anything that has to change at `lg` has
 * to be a class or a custom property a class can override. That is why the block's three
 * measured shares arrive as a `grid-template-columns` (ignored below `lg`, where the element
 * is not a grid) rather than as widths on the two children.
 */

/**
 * One traced quotation mark, 61 x 85. Path and provenance in ./metrics' MARK block; the
 * viewBox is the frame's own pixels, so the numbers in the path are the numbers that were
 * measured.
 */
const MARK_PATH =
  "M23.0 0.0C20.9 1.8 16.3 7.2 13.6 11.0C10.9 14.8 8.2 19.5 6.2 24.0C4.2 28.5 2.4 34.0 " +
  "1.4 39.0C0.4 44.0 -0.0 51.2 0.0 55.0C0.0 58.8 0.9 60.8 1.6 63.0C2.3 65.2 2.5 66.6 4.2 " +
  "69.0C5.9 71.4 9.3 75.6 12.2 78.0C15.1 80.4 18.0 83.0 22.3 84.0C26.7 85.0 35.6 84.8 " +
  "39.3 84.0C43.1 83.2 44.5 80.4 45.8 79.0C47.1 77.6 46.2 79.2 47.4 75.0L53.0 53.0L50.0 " +
  "52.0L50.0 51.0L61.0 50.0L61.0 49.0C60.1 46.8 57.6 39.2 55.6 36.0C53.6 32.8 50.8 30.8 " +
  "48.8 29.0C46.8 27.2 46.5 26.1 43.0 25.0C39.5 23.9 30.1 23.1 27.0 22.0C23.9 20.9 24.2 " +
  "19.3 23.4 18.0C22.6 16.7 21.5 16.9 22.0 14.0L26.7 0.0L23.0 0.0Z";

const MARK_PAIR_W = MARK_W * 2 + MARK_GAP;

/**
 * The pair, as one SVG so the 13px between them is part of the drawing rather than a gap two
 * elements have to agree on at every width.
 *
 * Hidden from assistive technology: the quote it decorates is already a `<blockquote>`, and a
 * screen reader announcing a pair of quotation marks before it would be saying the same thing
 * twice.
 */
function QuoteMarks() {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${MARK_PAIR_W} ${MARK_H}`}
      className="pointer-events-none absolute"
      style={{
        left: MARK_LEFT,
        top: MARK_TOP,
        width: fluid(
          Math.round(MARK_PAIR_W * 0.5),
          MARK_PAIR_W,
          Math.round(MARK_PAIR_W * 1.14),
        ),
      }}
      fill="#fff"
    >
      <path d={MARK_PATH} />
      <path d={MARK_PATH} transform={`translate(${MARK_W + MARK_GAP} 0)`} />
    </svg>
  );
}

/**
 * The photograph and the frame that rounds it.
 *
 * Two elements rather than a radius on the image itself, because the radius is scrubbed: a
 * frame with `overflow-hidden` clips one composited layer, where a radius on the `<img>` asks
 * the decoder's output to be re-clipped as it changes. The image inside never moves, so it is
 * the same division of labour as `definition/placePhoto` — one thing is animated and the
 * picture is not.
 *
 * `data-media-shape` and `data-media-at` are how ./sequence finds these, and attributes
 * rather than refs because the blocks come out of a CMS: there are as many frames as there
 * are rows, and a ref array kept in step with a list from a third party is more moving parts
 * than one `querySelectorAll`. `at` says which layout a frame belongs to — the flanked block
 * ships a pair for the row and a single for the stack, and only one pair is ever rendered,
 * so the sequence drives whichever matches the live breakpoint and leaves the other alone.
 *
 * It ships at its *resting* radius, not its starting one. That way a reader with reduced
 * motion — for whom no trigger is ever created — gets the shape the composition settles into,
 * and everyone else gets the end state for one frame rather than a square that pops.
 */
function MediaFrame({
  founder,
  aspect,
  at,
  className = "",
}: {
  founder: Founder;
  aspect: number;
  /** Which layout this frame belongs to — see ./sequence, which only drives the live one. */
  at: "both" | "row" | "stack";
  className?: string;
}) {
  const resting = founder.shape === "round-to-square" ? "0%" : "50%";
  return (
    <div
      data-media-shape={founder.shape}
      data-media-at={at}
      className={`overflow-hidden ${className}`}
      style={{ aspectRatio: `${aspect}`, borderRadius: resting }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the sizes are already solved
          from the reference and served by Wix's own CDN (see lib/wix), so next/image's
          srcset machinery and optimiser hop would only re-derive what the layout knows. */}
      {/* The flanked block's pair is a decoration — the same photograph twice, in containers
          that are already `aria-hidden` — so only the frame a block actually leads with
          carries a name. Captioning all three would read the same person out three times. */}
      <img
        src={founder.photo.src}
        srcSet={founder.photo.srcSet}
        alt={at === "row" ? "" : founder.name}
        width={founder.photo.width}
        height={founder.photo.height}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/**
 * The column: the quote, the rule, the story, the attribution.
 *
 * `relative` because the quotation marks hang off it, and they must paint *under* the
 * letterforms — which is plain tree order here, the marks being first and neither element
 * positioned above the other. Giving either a `z-index` would reverse them, the same trap
 * `DefinitionSection`'s stacked composition documents.
 */
function Column({ founder, marks }: { founder: Founder; marks: boolean }) {
  return (
    <div className="relative">
      {marks && <QuoteMarks />}

      <blockquote
        className="relative font-display text-accent italic"
        style={{
          fontSize: QUOTE,
          lineHeight: QUOTE_LEADING,
          letterSpacing: QUOTE_TRACKING,
        }}
      >
        {founder.quote}
      </blockquote>

      <hr
        className="border-0 border-t border-ink/60"
        style={{ marginTop: RULE_TOP, marginBottom: RULE_BOTTOM }}
      />

      <div className="text-ink" style={{ fontSize: BODY, lineHeight: BODY_LEADING }}>
        {founder.paragraphs.map((para, i) => (
          <p
            key={para.slice(0, 24)}
            style={i === 0 ? undefined : { marginTop: `${PARA_GAP_EM}em` }}
          >
            {para}
          </p>
        ))}
        {founder.attribution && (
          <p className="font-bold" style={{ marginTop: `${PARA_GAP_EM}em` }}>
            {founder.attribution}
          </p>
        )}
      </div>
    </div>
  );
}

/** The measured 490 / 122 / 839 as shares of the block, which is how the row states them. */
const ROW_COLUMNS = [MEDIA, MEDIA_GAP, COLUMN]
  .map((n) => `${((n / BLOCK_W) * 100).toFixed(4)}%`)
  .join(" ");

/**
 * The four figures both compositions need, as custom properties rather than inline widths.
 *
 * Inline styles beat classes, so a width written here could never be overridden at `lg` —
 * and every one of these has to change there, because the measured shares are shares of the
 * *reference viewport* and are only the composition at that width (see STACK_MEASURE_MAX).
 * Handed over as properties, the `lg:` classes below do the switching.
 */
const ABOUT_VARS = {
  ["--about-gutter" as string]: STACK_GUTTER,
  ["--about-stack-max" as string]: `${STACK_MEASURE_MAX}px`,
  ["--about-stack-media-max" as string]: `${STACK_MEDIA_MAX}px`,
  ["--about-block-w" as string]: `${BLOCK_W_PCT}%`,
  ["--about-block-max" as string]: `${Math.round(BLOCK_W * 1.14)}px`,
  ["--about-column-w" as string]: `${COLUMN_PCT}%`,
  ["--about-column-max" as string]: `${Math.round(COLUMN * 1.14)}px`,
} as CSSProperties;

/** Row widths, applied from `lg` up and inert below it. */
const ROW_WIDTH = "lg:w-(--about-block-w) lg:max-w-(--about-block-max)";
const ROW_COLUMN_WIDTH = "lg:w-(--about-column-w) lg:max-w-(--about-column-max)";

/**
 * The composition the section is mostly made of: a square photograph on the left, the column
 * on the right, the two top-aligned.
 *
 * The row's widths are shares *of the block* rather than of the viewport, so the three
 * measured figures stay in their measured proportion at every width and only the block's own
 * share of the screen is fluid.
 */
function MediaLeftBlock({ founder }: { founder: Founder }) {
  return (
    <article
      className={`mx-auto w-[calc(100%-2*var(--about-gutter))] max-w-(--about-stack-max) ${ROW_WIDTH}`}
      style={ABOUT_VARS}
    >
      <div
        className="lg:grid lg:items-start"
        style={{ gridTemplateColumns: ROW_COLUMNS }}
      >
        <div
          className="mx-auto w-full max-w-(--about-stack-media-max) lg:col-start-1 lg:mx-0 lg:max-w-none"
          style={{ marginTop: MEDIA_TOP_NUDGE }}
        >
          <MediaFrame founder={founder} aspect={1} at="both" />
        </div>
        <div className="mt-10 lg:col-start-3 lg:mt-0">
          <Column founder={founder} marks />
        </div>
      </div>
    </article>
  );
}

/**
 * The second Olya block: the same column, centred, with the same photograph repeated at each
 * side in landscape.
 *
 * **It really is the same person's block twice, and that is transcribed rather than
 * inherited.** The reference runs Olya's quote and story through once in the composition
 * above and again here; whether that is the page's intent or a duplication left in it is the
 * client's call, and the section renders whatever rows the CMS holds, so dropping it is one
 * row in the CMS rather than a code change.
 *
 * The flanking photographs are decorative repeats — `aria-hidden`, and gone entirely below
 * `lg`, where the block falls back to the stacked single-photograph layout the others use.
 * They are already down to 187px wide at `lg` itself; a step below that they stop reading as
 * photographs at all, and a phone would be asking for two of them either side of a column
 * with no room for either. That is not a smaller version of this composition, it is a
 * different and worse one.
 */
function FlankedBlock({ founder }: { founder: Founder }) {
  const flank: CSSProperties = {
    width: `${FLANK_W_PCT}vw`,
    maxWidth: FLANK_W * 1.14,
    top: FLANK_TOP_NUDGE,
  };
  return (
    <article className="relative" style={ABOUT_VARS}>
      <div
        aria-hidden
        className="absolute hidden lg:block"
        style={{ ...flank, left: `${FLANK_INSET_PCT}%` }}
      >
        <MediaFrame founder={founder} aspect={FLANK_W / FLANK_H} at="row" />
      </div>
      <div
        aria-hidden
        className="absolute hidden lg:block"
        style={{ ...flank, right: `${FLANK_INSET_PCT}%` }}
      >
        <MediaFrame founder={founder} aspect={FLANK_W / FLANK_H} at="row" />
      </div>

      <div
        className={`mx-auto w-[calc(100%-2*var(--about-gutter))] max-w-(--about-stack-max) ${ROW_COLUMN_WIDTH}`}
      >
        <div className="mx-auto mb-10 w-full max-w-(--about-stack-media-max) lg:hidden">
          <MediaFrame founder={founder} aspect={1} at="stack" />
        </div>
        <Column founder={founder} marks={false} />
      </div>
    </article>
  );
}

export function FounderBlock({ founder }: { founder: Founder }) {
  return founder.layout === "flanked" ? (
    <FlankedBlock founder={founder} />
  ) : (
    <MediaLeftBlock founder={founder} />
  );
}
