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
 * The other departure is the clock, and it is now a larger one than the reference's scrub.
 * The brief is that the gesture plays whole at any scroll rate, which is `hero/flooredCue`'s
 * shape and is imported rather than reimplemented — but **the gesture is one step of the rail,
 * not the whole of it**: one scroll runs the line to the next dot and stops there, and the next
 * scroll takes it to the one after. See STEP_SECONDS for the client's own wording and
 * ./measure's `stopsFor` for where the line is allowed to rest. That is not something the
 * recording could have suggested; its fill is continuous.
 *
 * One consequence is load-bearing and survives the change: the fill and the horizontal traverse
 * are **the same number** (`reach` in ./sequence, which ./measure's `trackXFor` is a pure
 * function of), not two clocks over one moment, which is this repo's most expensive recurring
 * bug. Stepping the fill therefore steps the traverse with it, one cell per gesture, for free.
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
 * The scroll one step gets, in vh — **30, whatever the point count is**, which is what lets
 * the crossover below be a single stable number rather than something to re-derive every time
 * the client adds a CMS row.
 *
 * The algebra: the whole run is `REVEAL_VH x trackW / visible` (./measure's `totalVh`), the
 * cells are an even `1 / CELL_COUNT` of the stage so `trackW / visible` is `n / CELL_COUNT`,
 * and ./measure's `stopsFor` returns exactly one stop per point — so the span divides by `n`
 * and it cancels, leaving `REVEAL_VH / CELL_COUNT`.
 */
export const SEGMENT_VH = REVEAL_VH / CELL_COUNT;

/**
 * How long one step takes on its own clock: the line running from the dot it is resting on to
 * the next one.
 *
 * **The unit is the step, not the line**, and that is the client's own brief — "on scroll the
 * line goes to the next section completely, and another scroll animates to the next element."
 * So this section keeps the repo-wide rule that a gesture is never left parked half-done, and
 * changes what the gesture *is*. There is no whole-line duration here any more; ./sequence
 * builds the cue's own `seconds` as `STEP_SECONDS x the number of stops`, so each step takes
 * this long however long the rail is.
 *
 * 0.4s draws one cell — 561px at the reference width, so ~1400px/s, close to the 1200px/s the
 * earlier continuous build ran at and comfortably legible.
 *
 * What it has to be checked against is SEGMENT_VH, and there is an assertion below: a step has
 * exactly one segment of scroll to land in before the reader's own position takes over (see
 * ./sequence's staircase floor), so the crossover is `SEGMENT_VH / STEP_SECONDS` = **75vh/s**,
 * just above an ordinary reading scroll of ~85. Lengthen this and an average reader starts
 * seeing the last of each step snapped rather than drawn; shorten it much and the step stops
 * reading as a draw at all.
 */
export const STEP_SECONDS = 0.4;

/**
 * Each step decelerates into its dot.
 *
 * **On the cue's clock, not applied on read** — the one caller of `hero/flooredCue` that passes
 * an `ease`, and its docblock there sets out why the default is the other way round. It has to
 * be here: an ease on read shapes the whole line's progress, and what wants shaping is each
 * step's own arrival. Linear was right while the line was one continuous draw — the reference's
 * own fit is a straight line to within 2.5% rms — and is wrong now that it stops, because a
 * step that reaches its dot at full speed reads as the line being cut off there rather than
 * arriving at it.
 *
 * `power2.out` and not something with an overshoot: the dot's own bounce is the overshoot, and
 * two of them on one landing is a wobble.
 */
export const STEP_EASE = "power2.out";

/** Slower coming back, so undoing a step reads as a rewind rather than a snap. */
export const REVEAL_REVERSE_SPEED = 0.85;

/**
 * Travel since the last direction flip before the cue is told the reader has turned round.
 * Same Schmitt-trigger figure, and for the same reason, as `cases/timeline`'s.
 */
export const DIR_FLIP_VH = 3;

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
 *
 * **It fires in both directions** — once as the line arrives at the dot and again as the line
 * lets go of it on the way back up, at the client's request. The stepped reveal is what makes
 * that read as an answer rather than as noise: the line comes to rest on the dot either way, so
 * the pop has something to punctuate. It replays forwards on the uncover rather than running
 * the tween backwards, because a reversed `elastic.out` starts at the full 1.28 (a jump, not a
 * hit) and unwinds its ring, which reads as a wobble.
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
 *
 * Just under 1 rather than 1, and that is not a fudge. A step's resting place **is** a dot's
 * coverage point (./measure's `stopsFor`), and the paint reconstructs it by dividing by the
 * rail's length and multiplying back — so the comparison lands within ~1e-15 of 1 and on the
 * wrong side of it about half the time, which would drop the bounce on exactly the frame it
 * exists for.
 */
export const BOUNCE_AT_COVERAGE = 0.999;

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
  // A step has exactly one segment of scroll to land in. Past this reader speed ./sequence's
  // staircase floor overtakes the clock and the last of each step is snapped rather than
  // drawn — the correct fallback for a flick, but it must not be what an ordinary reader gets,
  // or the stepping the brief asked for is invisible.
  const crossover = SEGMENT_VH / STEP_SECONDS;
  if (crossover < 60) {
    console.error(
      `[Approach] a step hands over from clock to scroll at ${crossover.toFixed(0)}vh/s, ` +
      "which is at or below an ordinary reading scroll — most readers will see the line " +
      "jump the last of every step instead of drawing it. Shorten STEP_SECONDS.",
    );
  }
  // The bounce has to be over before the line can plausibly reach the next dot, or dots ring
  // into one another and the row reads as wobbling rather than as one dot answering the line.
  // A step is the shortest interval there can be between two of them.
  if (BOUNCE_SECONDS > STEP_SECONDS * 1.6) {
    console.error(
      `[Approach] a ${BOUNCE_SECONDS}s bounce against a ${STEP_SECONDS}s step — each dot ` +
      "will still be ringing when the next one fires. Shorten BOUNCE_SECONDS, or lengthen " +
      "STEP_SECONDS (and re-check the crossover above).",
    );
  }
}
