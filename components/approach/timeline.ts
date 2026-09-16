import { gsap } from "@/lib/gsap";
import { CELL_COUNT } from "./metrics";

/**
 * The approach section's beats.
 *
 * **What the reference actually does, measured rather than assumed.** Tracking the rail's
 * accent across all 270 frames of `third-section.mp4`:
 *
 *   - The fill is **scrubbed**, not cued. Every stretch where the rail's y is parked has the
 *     fill parked with it — f111–f126 hold at y=797 / 492px, f135–f141 at 697 / 732px,
 *     f174–f180 at 397 / 1324px, f201–f237 at 197 / 1668px. A cue would have kept moving.
 *   - The mapping is one viewport of scroll. Least-squares over the 107 frames where the fill
 *     is between 3% and 97% gives `fill% = -0.1157·railY + 120.19` (residual rms 2.5%), which
 *     puts 0% at railY 1039 against a viewport bottom of 1040, and 100% at railY 175 — i.e.
 *     **88px below the viewport top of a 953px viewport**. That is REVEAL_END_PCT below.
 *   - **The dots do not animate.** Their outer diameter measures 67 x 72px on every frame,
 *     lit or unlit, with the wobble entirely inside the compression noise. What looked like a
 *     dot "lighting up" is the wipe crossing it: the raw accent runs at dot 1 go
 *     `(112,117)` → `(112,139)` → `(112,175)` over three frames. The dot is simply a wider
 *     part of the same track, and the whole rail is one continuous left-to-right reveal.
 *
 * So the bounce here is **an addition, not a transcription** — see BOUNCE_AMP.
 *
 * The other departure is the clock: the reference's scrub can be flicked past, and the brief
 * is that the gesture plays whole at any scroll rate. That is `hero/flooredCue`'s shape, and
 * it is imported rather than reimplemented. One consequence is load-bearing: the fill and the
 * horizontal traverse are **the same number** (`reach` in ./sequence, which ./measure's
 * `trackXFor` is a pure function of), not two clocks over one
 * moment, which is this repo's most expensive recurring bug.
 */

/* ── the reveal ───────────────────────────────────────────────────────────────── */

/**
 * Where the fill completes, as a percentage of the viewport height from its top — measured
 * 88px of 953.
 *
 * It is the only figure the reveal needs, because the fill starts as the rail's centre crosses
 * the fold (measured railY 1039 against a fold at 1040, so exactly). The scroll the reveal
 * takes is therefore `100 - REVEAL_END_PCT` and is derived below rather than stated twice.
 */
export const REVEAL_END_PCT = 10;

/** The scroll one screen-width of rail takes, in vh. 90, and measured 90.7. */
export const REVEAL_VH = 100 - REVEAL_END_PCT;

/**
 * How long the reveal takes on its own clock when the reader is not outrunning it.
 *
 * The reference cannot supply this — its fill is scrubbed, so its apparent speed is the
 * reader's own and the same recording gives a different figure on every flick. 1.4s is this
 * build's, and what it buys is stated as the crossover: `REVEAL_VH / REVEAL_SECONDS` is
 * **64vh/s**, so a reader moving slower than that gets the whole gesture on the clock and a
 * faster one gets it bounded by the floor. An ordinary reading scroll is around 85vh/s, which
 * puts most readers just above the crossover — i.e. behaving like the reference's scrub, with
 * the clock catching only the careful reader and the floor catching the flick.
 *
 * Scaled by the track's length in ./sequence, so the *pace* is one screen-width of rail per
 * REVEAL_SECONDS however many cells there are.
 */
export const REVEAL_SECONDS = 1.4;

/** Slower coming back, so undoing the reveal reads as a rewind rather than a snap. */
export const REVEAL_REVERSE_SPEED = 0.85;

/**
 * Travel since the last direction flip before the cue is told the reader has turned round.
 * Same Schmitt-trigger figure, and for the same reason, as `cases/timeline`'s.
 */
export const DIR_FLIP_VH = 3;

/**
 * **Linear.** The fill is a position along a line, and the line is the same line at every
 * point — there is nothing about reaching 40% of it that wants to be slower or faster than
 * reaching 80%. The reference's own fit is a straight line to within 2.5% rms, which is the
 * measurement rather than a preference, and the residual that is there is the reader's scroll
 * lagging on flicks, not a curve.
 */
export const REVEAL_EASE = gsap.parseEase("none");

/* ── the traverse, when there are more cells than fit ──────────────────────────── */

/**
 * Where the fill's leading edge sits on screen once the track starts moving, as a share of the
 * visible width: the position of the **last on-screen dot**, which at three cells is two
 * thirds of the way across plus one dot radius.
 *
 * This is what makes the traverse begin exactly when the brief says it does — "scrolling will
 * scroll horizontally after 3 are shown" is the same instant as the fill passing the third
 * dot. It also decides where a dot lights during the traverse: at this fraction of the screen
 * rather than at its right edge, so a dot arrives unfilled, slides to this mark, fills, and
 * then continues left fully lit. Pinning the edge to the right edge instead — the obvious
 * simplification — fills every dot while it is still half off screen.
 *
 * A number rather than a constant, because it follows from the cell count and the dot's own
 * inset; ./sequence solves it against the measured geometry.
 */
export const LEAD_CELLS = CELL_COUNT - 1;

/**
 * Px of horizontal travel per px of vertical scroll during the traverse.
 *
 * **Derived, not chosen**, and that is the point: the reveal advances the fill one screen-width
 * of rail per REVEAL_VH of scroll, and the traverse simply continues at that pace. Stating it
 * twice is how the two phases end up at different speeds and the hand-over shows as a lurch.
 * ./sequence computes it from the measured viewport.
 */
export const travelPerScroll = (viewportW: number, viewportH: number) =>
  viewportW / ((REVEAL_VH / 100) * viewportH);

/* ── the bounce ───────────────────────────────────────────────────────────────── */

/**
 * The dot's pop as the fill covers it. **Not in the reference** — measured flat there, 67 x 72
 * on every frame — and added at the client's request.
 *
 * It is a timed tween rather than a function of the fill's position, which is the one place
 * this section runs a second clock, so the reason is worth stating. A bounce written as a
 * function of `reach` would have to spend its whole shape inside the rail distance the dot
 * covers: at the fill's own pace (a screen-width per 1.4s, so ~1360px/s at the reference
 * width) a 64px dot passes in **47ms**, and no damped bounce is legible in three frames.
 * Making it long enough to see would spread it over most of a cell, so the dot would still be
 * wobbling a third of the way to the next one.
 *
 * It is safe as a second clock because nothing is keyed to where it lands: the dot's *fill* is
 * the wipe's, on the one clock, and the bounce only has to **start** on the same frame. That
 * is the same arrangement as `growth/sequence`'s bars, which `play()`/`reverse()` off a
 * trigger, and unlike the hero's wash or the wordmark slide, where two clocks had to agree
 * about a position for the whole of a move.
 */
export const BOUNCE_AMP = 0.28;
export const BOUNCE_SECONDS = 0.62;

/**
 * `elastic.out` rather than `back.out`: the brief asked for a bounce, and back's single
 * overshoot reads as a nudge. The 0.45 period gives two visible returns inside BOUNCE_SECONDS
 * and settles; a longer period rings on past the next dot at any reasonable scroll rate.
 */
export const BOUNCE_EASE = "elastic.out(1, 0.45)";

/**
 * The fill fires the bounce when it has covered the dot **completely**, not when it reaches
 * the centre.
 *
 * At the centre the dot is half accent and half field, and scaling that composite shows the
 * unfilled half growing too — a white crescent blooming out of the side of the line. One
 * radius later the disc is solid and the pop is a single accent shape.
 */
export const BOUNCE_AT_COVERAGE = 1;

/* ── breakpoints ──────────────────────────────────────────────────────────────── */

/**
 * `lg` (1024px) is where the rail stands up, and it is a different composition rather than a
 * narrower version of this one — three cells across a phone would be 130px each, which is
 * under the dot's own diameter at that width and cannot hold a line of copy. The stacked
 * version runs the rail vertically down the left and scrolls normally, so a phone is never
 * pinned inside a horizontal track it has to traverse before it can leave.
 *
 * `isRow` is what ./sequence builds the horizontal sequence against; `isStack` is read
 * independently so the section can decide which markup to render. `.98` upper-bounds for
 * fractional viewport widths under browser zoom, as `cases/timeline`'s MQ does.
 */
export const MQ = {
  isRow: "(min-width: 1024px)",
  isStack: "(max-width: 1023.98px)",
} as const;

if (process.env.NODE_ENV !== "production") {
  // The floor has to be able to finish the move inside its own span, or the guarantee the cue
  // exists for is void: past the crossover the scroll leads, and if the span runs out first
  // the fill is simply cut off wherever the reader got to.
  const crossover = REVEAL_VH / REVEAL_SECONDS;
  if (crossover < 30) {
    console.error(
      `[Approach] the reveal hands over from clock to scroll at ${crossover.toFixed(0)}vh/s, ` +
      "which is below an ordinary reading scroll — the floor will be in charge for almost " +
      "every reader and the designed gesture will never play. Shorten REVEAL_SECONDS.",
    );
  }
  // The bounce has to be over before the fill can plausibly reach the next dot, or dots ring
  // into one another and the row reads as wobbling rather than as one dot answering the line.
  const cellSeconds = REVEAL_SECONDS / CELL_COUNT;
  if (BOUNCE_SECONDS > cellSeconds * 1.6) {
    console.error(
      `[Approach] a ${BOUNCE_SECONDS}s bounce against ${cellSeconds.toFixed(2)}s between ` +
      "dots at the clock's own pace — each dot will still be ringing when the next one " +
      "fires. Shorten BOUNCE_SECONDS or widen the cells.",
    );
  }
}
