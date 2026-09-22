import type { CSSProperties, RefObject } from "react";
import type { ApproachPoint } from "./content";
import {
  BAR_H,
  BODY,
  BODY_LEADING,
  BODY_MEASURE,
  CELL_COUNT,
  DOT_D,
  GUTTER,
  HEADING,
  HEADING_GAP,
  HEADING_LEADING,
  HEADING_MEASURE,
  HEADING_TRACKING,
  PAD_BOTTOM,
  RAIL_GAP,
  RAIL_LEAD_IN,
  STACK_CELL_GAP,
  STACK_COPY_INDENT,
  STACK_RAIL_X,
} from "./metrics";
import { BOUNCE_AMP, REVEAL_END_PCT } from "./timeline";

/**
 * The approach section's layers: the rail, the dots, and the cells of copy, in the two
 * compositions this section has. Markup and classes only — every figure comes from ./metrics,
 * every beat from ./timeline, and nothing here animates itself.
 *
 * **The rail is two layers of the same shape, and the fill is the top one clipped.** That is
 * the reference's own mechanism read off the frames rather than a construction chosen for
 * convenience: its accent runs at a dot go `(112,117)` → `(112,139)` → `(112,175)` over three
 * frames, i.e. the dot is not a thing that switches state but a wider part of one track that a
 * single left-to-right wipe crosses. Two layers reproduce that exactly and cost one clip.
 *
 * Each dot clips *itself* rather than sharing the bar's clip — see ./sequence, where the pop
 * needs to scale past the fill's leading edge without being sliced flat down one side.
 */

/* ── the row composition, `lg` and up ─────────────────────────────────────────── */

/**
 * One dot. A wrapper holding a base disc and an accent disc, because the wrapper is what
 * scales: scaling either disc alone would pop only half of a part-filled dot.
 *
 * The base is the field's own colour with a hairline ring, which is what the reference shows —
 * its unfilled dot measures pure white against a #f6f6f6 track, i.e. the page punched through
 * the line, with a ~#e3e3e3 edge.
 */
function Dot({
  dotRef,
  style,
}: {
  dotRef: (el: HTMLElement | null) => void;
  style?: CSSProperties;
}) {
  return (
    <span
      ref={dotRef}
      aria-hidden
      className="absolute block rounded-full"
      style={{ width: DOT_D, height: DOT_D, ...style }}
    >
      <span className="absolute inset-0 rounded-full bg-cream ring-1 ring-ink/12" />
      <span
        data-dot-fill
        className="absolute inset-0 rounded-full bg-accent"
        // Starts empty. The sequence's first paint overwrites this, but a reader with
        // JavaScript still loading should not see three filled dots on an empty line.
        style={{ clipPath: "inset(0% 100% 0% 0%)" }}
      />
    </span>
  );
}

/**
 * The horizontal track: the rail across the top, then one cell of copy per point.
 *
 * All cells are one pitch wide — `100 / CELL_COUNT` of the stage — so the track is a plain
 * flex row, its overflow is a plain consequence of the point count, and nothing needs
 * per-kind arithmetic. Same reason `cases/CaseLayers` makes its heading and call-to-action
 * cells of the track rather than chrome around it.
 *
 * The rail spans the whole track rather than stopping at the last dot, which is the
 * reference's own composition — its line runs 416px past the third dot.
 */
export function ApproachTrack({
  points,
  trackRef,
  railRef,
  dotsRef,
}: {
  points: ApproachPoint[];
  trackRef: RefObject<HTMLDivElement | null>;
  railRef: RefObject<HTMLDivElement | null>;
  dotsRef: RefObject<(HTMLElement | null)[]>;
}) {
  return (
    <div
      ref={trackRef}
      className="relative"
      style={{ width: `${(points.length / CELL_COUNT) * 100}%` }}
    >
      {/* The rail. `relative` so the dots position against the track, and given the dot's own
          height so the bar can sit on its centre line without a transform GSAP would wipe.
          Both ScrollTriggers key off this element rather than the track — see ApproachRefs. */}
      <div ref={railRef} className="relative" style={{ height: DOT_D }}>
        {/* The bar starts RAIL_LEAD_IN *left of the track's origin* — i.e. left of the first
            dot and outside the section's content box, which is the reference's own composition
            and is what gives the opening scroll something to draw. It is the track's child, so
            it travels with the traverse rather than sitting in the gutter after the row has
            left; `approachStageClip` closes the window behind it as it goes. */}
        <div
          data-rail-bar
          aria-hidden
          className="absolute top-1/2 right-0 -translate-y-1/2"
          style={{ height: BAR_H, left: `calc(-1 * ${RAIL_LEAD_IN})` }}
        >
          {/* Square ends, not rounded — measured. The reference's accent is at its full 16px
              height on the very last column of the rail (16, 16, 18, 18 … reading inward),
              where a round cap climbs 4, 8, 12, 13 over the same four columns. */}
          <div className="absolute inset-0 bg-ink/8" />
          <div
            data-bar-fill
            className="absolute inset-0 bg-accent"
            style={{ clipPath: "inset(0% 100% 0% 0%)" }}
          />
        </div>

        {/* Everything except the bar is clipped at the stage's own left edge rather than by
            the stage — see `approachContentClip`. `inset-0` keeps this exactly the rail's box,
            so it is the dots' offsetParent at the same origin the rail was and ./measure reads
            the same numbers it did before it existed. */}
        <div data-approach-clip="dots" className="absolute inset-0">
          {points.map((point, i) => (
            <Dot
              key={point.id}
              dotRef={(el) => {
                if (dotsRef.current) dotsRef.current[i] = el;
              }}
              style={{
                // The dot's left edge sits on its cell's left edge — measured, see
                // DOT_INSET_REF — so the copy below needs no offset of its own.
                left: `${(i / points.length) * 100}%`,
                top: 0,
              }}
            />
          ))}
        </div>
      </div>

      <div data-approach-clip="copy" className="flex" style={{ marginTop: RAIL_GAP }}>
        {points.map((point) => (
          <div
            key={point.id}
            className="shrink-0"
            style={{ width: `${100 / points.length}%` }}
          >
            <Copy point={point} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The heading and body of one point. Shared by both compositions.
 *
 * **The heading is lighter than the body, which is the opposite of the obvious arrangement and
 * is the reference's.** Sampled off a settled frame, its heading's darkest ink is a neutral
 * #4c4c4c against a body of pure #000. The tones themselves are this site's rather than the
 * recording's — `--color-ink` at two strengths, the same substitution the founders section
 * makes and for the same reason — but the *relation* is transcribed, and inverting it (a full
 * ink heading over a faded body) is what the first pass did and what makes the row read as
 * three labels instead of three paragraphs with a title.
 *
 * The two measures are separate and both are pinned by the reference's own line breaks — see
 * HEADING_MEASURE.
 */
function Copy({ point }: { point: ApproachPoint }) {
  return (
    <>
      <h3
        className="text-ink/70"
        style={{
          fontSize: HEADING,
          lineHeight: HEADING_LEADING,
          letterSpacing: HEADING_TRACKING,
          width: `${HEADING_MEASURE * 100}%`,
        }}
      >
        {point.heading}
      </h3>
      <div
        className="text-ink"
        style={{
          fontSize: BODY,
          lineHeight: BODY_LEADING,
          marginTop: HEADING_GAP,
          width: `${BODY_MEASURE * 100}%`,
        }}
      >
        {point.paragraphs.map((para, i) => (
          <p key={para.slice(0, 24)} style={i === 0 ? undefined : { marginTop: "1em" }}>
            {para}
          </p>
        ))}
      </div>
    </>
  );
}

/* ── the stacked composition, below `lg` ──────────────────────────────────────── */

/**
 * Below `lg` the rail stands up and the points stack under one another beside it.
 *
 * **A different composition, not a narrower one.** Three cells across a 390px phone would be
 * 130px each — under the dot's own diameter at that width, and far under a readable measure —
 * and keeping the pinned horizontal track would mean a phone reader cannot scroll past the
 * section until they have traversed every point in it. Standing the rail up keeps the idea (a
 * line the reader travels, with a station at each point) on ordinary vertical scroll.
 *
 * It is deliberately **not scroll-driven**: with the rail vertical, the fill's progress and
 * the page's own scroll are the same axis and the same direction, so a line that fills as you
 * scroll past it is a line that is always filled to exactly where you are looking — there is
 * nothing left for the animation to say. It renders as the finished state, which is also what
 * reduced motion gets at every width.
 */
export function ApproachStack({ points }: { points: ApproachPoint[] }) {
  return (
    <div
      data-approach-stack
      className="relative"
      style={{ paddingLeft: STACK_COPY_INDENT }}
    >
      <div className="flex flex-col" style={{ gap: STACK_CELL_GAP }}>
        {points.map((point, i) => (
          <div key={point.id} className="relative">
            {/*
              One segment per point, spanning this dot's centre to the *next* dot's centre, and
              none on the last — so the line begins and ends on a station rather than
              overshooting at both ends. Drawn this way rather than as a single bar down the
              block because the reach of one bar can only be stated as "the whole column minus
              the last cell's height", which is a measurement; a segment's is arithmetic the
              layout already knows. A cell's bottom plus the gap is the next cell's top, and
              the next dot's centre is one radius below that.
            */}
            {i < points.length - 1 && (
              <span
                aria-hidden
                className="absolute bg-accent"
                style={{
                  width: BAR_H,
                  left: `calc(${STACK_RAIL_X} - ${STACK_COPY_INDENT} - ${BAR_H} / 2)`,
                  top: `calc(${DOT_D} / 2)`,
                  bottom: `calc(-1 * (${STACK_CELL_GAP} + ${DOT_D} / 2))`,
                }}
              />
            )}
            <span
              aria-hidden
              className="absolute rounded-full bg-accent"
              style={{
                width: DOT_D,
                height: DOT_D,
                left: `calc(${STACK_RAIL_X} - ${STACK_COPY_INDENT} - ${DOT_D} / 2)`,
                top: 0,
              }}
            />
            <Copy point={point} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** The gutter every composition sits in. Kept here so both read it from one place. */
export const APPROACH_GUTTER: CSSProperties = {
  paddingLeft: GUTTER,
  paddingRight: GUTTER,
};

/**
 * How far a dot's pop reaches outside its own box, as a share of the dot: half the amplitude,
 * since it scales about its centre, plus a little air. Derived from BOUNCE_AMP rather than
 * restated, so retuning the pop cannot leave either clip below behind.
 */
export const POP_OVERHANG_RATIO = BOUNCE_AMP / 2 + 0.05;

const POP_OVERHANG = `calc(${DOT_D} * ${-POP_OVERHANG_RATIO.toFixed(3)})`;

/**
 * The stage's clip, and it is a `clip-path` rather than `overflow-hidden` for a reason the
 * bounce made visible: **the stage must clip horizontally and must not clip vertically.**
 *
 * Horizontally is the whole of the traverse — a cell leaving at the window's edge. Vertically
 * there is nothing to hide and one thing that must not be hidden: the rail is the stage's first
 * child at `top: 0`, so a dot scaling to 1 + BOUNCE_AMP reaches ~9px above the stage's own top
 * edge. Under `overflow-hidden` every pop had its top sliced flat, which is what the client saw
 * as the circle looking cut.
 *
 * `overflow-x: hidden` alone is not the answer: one axis hidden with the other visible computes
 * the visible one to `auto`, which makes the stage a scroll container, and a scroll container
 * inside ScrollSmoother's transformed subtree is its own bug. Negative insets say exactly the
 * intended thing instead — same answer, and the same reasoning, as DefinitionSection's
 * OPEN_TOP_CLIP.
 *
 * **The left edge is open too, by RAIL_LEAD_IN**, so the rail can draw out into the section's
 * gutter. That is what makes the clip below necessary, and it is worth setting out why the
 * obvious alternative does not work: a stage window that opens for the lead-in and shuts again
 * as the track traverses. It cannot, because the lead-in occupies `[trackX - leadIn, trackX]`
 * and the first cell's copy starts at `trackX` — one inset can only show a strip that reaches
 * the stage's edge, so any window wide enough to show a pixel of the lead-in shows the whole of
 * the copy that has slid out past it. Measured at six points, that is up to 41px of a heading
 * being read in the margin. The clip has to be on the content, not on the container.
 *
 * The one cost is that `clip-path` hides the pixels without stopping the oversized track from
 * contributing to scrollable overflow, so with more points than fit, the page's horizontal
 * extent widens invisibly. `SmoothScrollProvider`'s page-level `overflow-x-hidden` is the
 * backstop for exactly this, and its docblock names the same trade. The lead-in itself cannot
 * add to it — it reaches *left*, and a left overhang creates no scroll in a left-to-right page.
 */
export const APPROACH_STAGE_CLIP =
  `inset(${POP_OVERHANG} 0px ${POP_OVERHANG} calc(-1 * ${RAIL_LEAD_IN}))`;

/**
 * The stage's height floor, and it is a **constraint rather than a taste**: the section's
 * bottom edge has to reach the fold when the row comes to rest, or whatever follows the section
 * climbs into the hold while the line is still drawing.
 *
 * **A pin holds the pinned element and nothing else.** Its spacer reserves the distance, and
 * every section below carries on scrolling through it — so the runway the footer has is only
 * what is left of this section under the fold at the moment the pin engages,
 * `restY + stage + PAD_BOTTOM - viewport`, and that is the same number whatever the pin's
 * length, because the spacer grows the section by exactly the pin. Measured before this
 * existed it was **-76px at 1920x953, -196 at 1440x900 and -139 at 1024x768** — negative at
 * every width, so the footer was over the row while dots were still arriving, and at 1440 it
 * crossed the fold **halfway through the traverse**. That was the report.
 *
 * `restY` is REVEAL_END_PCT of the viewport less one dot radius: the rail is the stage's first
 * child, so the stage's top edge *is* the rail's top edge. Every term is a CSS length, so the
 * floor is stated once and needs no measurement — ./measure asserts it against the real boxes,
 * which is what catches a change to PAD_BOTTOM, to the dot, to REVEAL_END_PCT, or to the height
 * of the client's own copy.
 *
 * What it costs is air under the copy — 76 / 196 / 139px at those three widths, and more on a
 * tall window. That is the trade and it is the right way round: at rest the section fills the
 * screen exactly, which is precisely what a section that is about to hold the reader should do.
 */
export const APPROACH_STAGE_FLOOR =
  `calc(${100 - REVEAL_END_PCT}vh + ${DOT_D} / 2 - ${PAD_BOTTOM})`;

/**
 * The clip on everything the stage no longer clips on the left: the dots and the copy. The bar
 * is the one thing left out of it, because the bar is the only thing that is *supposed* to be
 * out there in the gutter.
 *
 * `left` is where the stage's own left edge falls in the track's coordinates — `-trackX`, so
 * zero until the traverse starts. Only the left edge clips; the other three are open, and the
 * stage's own clip is what closes them.
 *
 * **The dots get POP_OVERHANG_RATIO of slack on it and the copy does not**, which is the one
 * asymmetry here and is not a rounding allowance. The first dot's centre sits one radius into
 * the track, so at rest it pops *across* the stage's left edge — clip it there and the circle
 * is cut down its left-hand side, which is the same complaint the vertical insets above exist
 * to answer, reintroduced on the other axis. Copy never crosses that edge under its own power,
 * so giving it the same slack only buys 12px of heading read in the margin during a traverse.
 */
export const approachContentClip = (left: number) =>
  `inset(-100vh -100vh -100vh ${left.toFixed(1)}px)`;
