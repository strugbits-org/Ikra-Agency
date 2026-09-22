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
 * The brief is that the gesture plays whole at any scroll rate — but **the gesture is one step
 * of the rail, not the whole of it**: one scroll runs the line to the next dot and stops there,
 * and the next scroll takes it to the one after. See STEP_SECONDS for the client's own wording,
 * ./measure's `stopsFor` for where the line is allowed to rest, and ./stepper for why that is a
 * clock of this section's own rather than `hero/flooredCue`, which it was built on first. That
 * is not something the recording could have suggested; its fill is continuous.
 *
 * One consequence is load-bearing and survives the change: the fill and the horizontal traverse
 * are **the same number** (`reach` in ./sequence, which ./measure's `trackXFor` is a pure
 * function of), not two clocks over one moment, which is this repo's most expensive recurring
 * bug. Stepping the fill therefore steps the traverse with it, one cell per gesture, for free.
 */

/* ── the reveal ───────────────────────────────────────────────────────────────── */

/**
 * Where the rail's centre is when the reveal hands over, as a percentage of the viewport height
 * from its top. It is the only figure the reveal needs, because the fill starts as the rail's
 * centre crosses the fold (measured railY 1039 against a fold at 1040, so exactly), so the
 * scroll it takes is `100 - REVEAL_END_PCT` and is derived below rather than stated twice.
 *
 * **The reference measures 10 and this is 25, which is the one figure here deliberately not
 * transcribed.** Its fill completes 88px below the top of a 953px viewport, and that is right
 * for what the recording shows — a three-point rail that finishes drawing and then simply
 * scrolls away. It is wrong for what this section does that the reference never has to: with
 * more points than fit, **this mark is also where the stage pins**, so the rail stops there and
 * stays for the whole traverse. At 10 that is 64px of air above a rail with a screen of copy
 * hanging off it — the row reads as jammed against the top edge of the window rather than
 * placed in it, and the vertical scroll reads as having run on too long before the horizontal
 * one took over.
 *
 * A quarter of the viewport leaves ~206px above the rail at the reference height, against this
 * section's own 180px PAD_TOP — so during the traverse the rail sits roughly where its own top
 * padding would have put it, which is why the gap reads as composition rather than as slack.
 *
 * What it costs is that everything paced off the reveal is now spread over 75vh rather than 90:
 * a step at three points costs 18.8vh instead of 22.5, and the traverse keeps station with it
 * because `travelPerScroll` is derived from the same figure. Both stay well inside the
 * assertions at the foot of this file — a step is still nearly two wheel notches — so the
 * three-point composition the client approved moves at 1.2x and is otherwise untouched.
 */
export const REVEAL_END_PCT = 25;

/**
 * The scroll one screen-width of rail takes, in vh. Measured 90.7 at the reference's own
 * hand-over mark; 75 at the one above, for the reason it gives.
 */
export const REVEAL_VH = 100 - REVEAL_END_PCT;

/**
 * The scroll one step costs, in vh, at `points` points — the distance between two of
 * ./sequence's boundaries.
 *
 * The algebra: the run is `REVEAL_VH x trackW / visible` (./measure's `totalVh`), the cells are
 * an even `1 / CELL_COUNT` of the stage so `trackW / visible` is `points / CELL_COUNT`, and
 * ./measure's `stopsFor` returns `points + 1` stops. It is 22.5vh at three points and settles
 * towards 30 as the client adds rows, which is the right direction — a longer rail earns more
 * scroll but the extra stop is paid for out of what is already there.
 *
 * **The boundaries are evenly spaced and the steps are not**, which is deliberate and is the
 * one place this departs from "the line is where your scroll says". The first step is 146px of
 * rail and the second is a whole 561px cell; charging for them in proportion would make the
 * opening gesture a flick of the wheel and reintroduce exactly the "it jumped" the stepping
 * exists to fix. One gesture, one step, whatever the step is made of.
 */
export const segmentVh = (points: number) =>
  (REVEAL_VH * points) / (CELL_COUNT * (points + 1));

/**
 * How long one step takes on its own clock: the line running from the dot it is resting on to
 * the next one.
 *
 * **The unit is the step, not the line**, and that is the client's own brief — "on scroll the
 * line goes to the next section completely, and another scroll animates to the next element."
 * So this section keeps the repo-wide rule that a gesture is never left parked half-done, and
 * changes what the gesture *is*. There is no whole-line duration here at all; ./stepper tweens
 * one stop at a time and this is each one's duration, so a step takes the same time at three
 * points and at thirty.
 *
 * 0.4s draws one cell — 561px at the reference width, so ~1400px/s, close to the 1200px/s the
 * earlier continuous build ran at and comfortably legible. The short first step draws its 146px
 * over the same 0.4s and so runs slower; that is the arrival worth having, since it is the one
 * gesture whose whole job is to prove the section answers the wheel.
 */
export const STEP_SECONDS = 0.4;

/**
 * The most a step may be sped up when the reader is ahead of the walk, as a multiple of its own
 * rate — and the section's **lag bound**, which is what replaced the scroll floor the first
 * build had. ./stepper's docblock has the argument for the swap.
 *
 * `n` steps behind are each run at `n` times the rate, so covering them takes STEP_SECONDS flat
 * however far behind the line is, up to this many. Four covers a three-point section entirely:
 * the deepest the queue can ever get is its four stops, so the line here is **never more than
 * 0.4s behind the reader**, at any scroll rate, with every step of the catch-up drawn.
 *
 * Past four it is a floor on how short a step may get rather than a cap on the lag — 0.1s is
 * six frames, which is the least that still reads as a line moving rather than a cut. A very
 * long CMS list trades lag for that: ten stops behind take 1s to unwind, on a section whose pin
 * is proportionally longer anyway.
 */
export const MAX_CATCH_UP = 4;

/**
 * Each step decelerates into its dot.
 *
 * **On the tween, not applied on read**, which is the opposite of what `hero/flooredCue`'s
 * callers do and is why this section does not use it: there a retarget mid-move must not
 * re-ease, because the move has one destination and re-easing is a stutter in the middle of it.
 * Here a retarget *is* a new gesture — each step is its own arrival at its own dot — so the
 * ease belongs to the step and re-easing from the new start is the correct behaviour.
 *
 * Linear was right while the line was one continuous draw — the reference's own fit is a
 * straight line to within 2.5% rms — and is wrong now that it stops, because a step that reaches
 * its dot at full speed reads as the line being cut off there rather than arriving at it.
 *
 * `power2.out` and not something with an overshoot: the dot's own bounce is the overshoot, and
 * two of them on one landing is a wobble.
 */
export const STEP_EASE = "power2.out";

/** Slower coming back, so undoing a step reads as a rewind rather than a snap. */
export const REVEAL_REVERSE_SPEED = 0.85;

/**
 * Deadband on a step boundary, in vh, so a reader resting a hair above one — or ScrollSmoother
 * settling across it — does not walk the line back and forth over the same dot. Same
 * Schmitt-trigger figure, and for the same reason, as `cases/timeline`'s.
 *
 * It only guards the *retreat*: a boundary is earned the moment it is crossed going down and
 * given up only once the reader is this far back below it, so the response to a scroll is never
 * delayed and only the flicker is.
 */
export const BOUNDARY_HYST_VH = 3;

/* ── the landing ──────────────────────────────────────────────────────────────── */

/**
 * The scroll the section keeps **after the last stop has been earned** — the room the final
 * step draws in, and the whole of what makes the run finish on screen rather than off it.
 *
 * Without it the last boundary *is* the pin's own end. ./sequence spreads the boundaries evenly
 * across the run, so the last of them lands exactly where the run does — and the step it buys
 * is the biggest of the lot, the rail's bare tail past the final dot, 17% of the line. It was
 * therefore aimed on the frame the pin released and drawn entirely afterwards, with the row
 * already scrolling away under it. Measured off the drawn clip at a wheel pace, the fill stood
 * at **82% at the release, at every width**; that is the section not finishing, and it was
 * reported as exactly that.
 *
 * **Added to the pin rather than taken out of the run**, so every step keeps the scroll it
 * costs today and the cadence the client approved is untouched — see `segmentVh`, which is
 * deliberately not a function of this. It is free to add because the pin's spacer sits *inside*
 * the section: lengthening the pin lengthens the section by the same amount, so whatever
 * follows stays exactly one pin-length below the fold. What puts it below the fold in the first
 * place is ./ApproachLayers' APPROACH_STAGE_FLOOR, and the two are one fix — a hold with the
 * footer already over it is not a hold.
 *
 * `TAIL_VH / STEP_SECONDS` is the crossover: **50vh/s**, the same figure `cases/timeline`'s door
 * hands over at and within a hair of the hero's opening. Below it the step finishes inside the
 * hold at any point count; above it the reader outruns the walk, the clock goes on painting
 * after the pin lets go exactly as `DefinitionSection`'s tail does, and that is the accepted
 * trade rather than a hole — being outrun was never the complaint.
 *
 * It is also what gives a **three-point** section a hold at all: there is no overflow to
 * traverse there, so ./sequence builds the pin for this alone.
 */
export const TAIL_VH = 20;

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
  // A catch-up step must still be a step. Below about six frames the line stops reading as
  // moving between two dots and reads as having been cut to the second one, which is the whole
  // complaint the walk exists to answer — reintroducing it at speed would be a quiet
  // regression, since it only shows on a gesture big enough to queue several steps up.
  const shortest = STEP_SECONDS / MAX_CATCH_UP;
  if (shortest < 0.08) {
    console.error(
      `[Approach] the fastest step runs in ${(shortest * 1000).toFixed(0)}ms, which is too ` +
      "few frames to read as a draw — a reader who scrolls hard will see the line cut from " +
      "dot to dot. Lower MAX_CATCH_UP, or lengthen STEP_SECONDS.",
    );
  }
  // One gesture, one step — which is only true if a step costs more scroll than one wheel
  // notch. A notch is ~100px, so ~10.5vh of a 953px window; below about 12 the reader gets two
  // dots for one flick of the finger and the section is back to feeling like it skips.
  const perStep = segmentVh(CELL_COUNT);
  if (perStep < 12) {
    console.error(
      `[Approach] a step costs ${perStep.toFixed(1)}vh, which is about one wheel notch — a ` +
      "single gesture will cross two of them. Raise REVEAL_VH, or carry fewer stops.",
    );
  }
  // The hold has to outlast the step it exists for at something above a reading pace, or the
  // final stretch of line is drawn after the pin has let go — which is the whole defect this
  // answers, reintroduced quietly at the one scroll rate nobody tests at.
  const tailCrossover = TAIL_VH / STEP_SECONDS;
  if (tailCrossover < 30) {
    console.error(
      `[Approach] the tail hands over at ${tailCrossover.toFixed(0)}vh/s, which is inside a ` +
      "reading pace — the last step will finish after the pin releases for most readers. " +
      "Raise TAIL_VH, or shorten STEP_SECONDS.",
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
