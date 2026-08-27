/**
 * Every number the case studies' choreography uses. No DOM, no GSAP instances — the paint
 * in ./sequence is assembled from these against the figures ./measure reads back.
 *
 * ## Everything here was measured off the reference recording, not chosen
 *
 * The section is a pinned horizontal track: vertical scrolling translates a row of
 * equal-width cells leftwards across a held viewport. The figures below come from frame
 * analysis of the reference capture (1920×1040, ~1905px layout viewport once its scrollbar
 * is taken off), so they are transcriptions rather than taste:
 *
 *   cell pitch          952.4px  → 50.00vw  (11 independent divider-pair measurements)
 *   image width         801px    → 42.05vw  → 50vw − 2 × 4vw
 *   image aspect        801:552  → 1.451
 *   travel              1px of scroll per 1px of track, i.e. `scrollWidth − innerWidth`
 *
 * The one figure that is now a preference rather than a transcription is the last of
 * those: TRAVEL_PER_SCROLL below deliberately runs the track faster than the reference
 * did. It is the only knob for the section's pace.
 *
 * ## The only per-cell animation is the rise, and that is the whole of it
 *
 * Frame analysis ruled out everything else the previous build had. Tracking the reference's
 * artwork *within* each card frame — the tower in the first card, its "Hi, I'm Alex."
 * lettering — put it at 15.8–16.0% of the frame's width at both ends of the traverse, so
 * there is **no inner parallax**. The card frames measured 792–795px across the whole
 * traverse, so there is **no scale**. Cards leaving on the left held their caption's
 * baseline to the pixel until they were clipped, so there is **no exit fade, drift or dim**.
 *
 * What is left is a single vertical entrance per cell, and it is not a stagger of that
 * cell's lines — the caption's underline rule and the frame's top edge moved by identical
 * amounts at identical times (24px at the same frame, repeatedly), so the cell's whole
 * content block translates as one piece.
 */

/* ── the track ───────────────────────────────────────────────────────────────── */

/**
 * One cell, as a percentage of the viewport's width. Two cells fill the screen.
 *
 * Measured at 952.4px ± 0.5 against a 1905px layout viewport, i.e. exactly half. Every
 * cell is this wide — the heading and the closing call-to-action are cells too, not
 * decoration bolted either end, which is what makes the track a plain flex row and the pin
 * length a plain consequence of the project count.
 */
export const CELL_VW = 50;

/**
 * The image's inset within its cell, per side, in vw — so the image is
 * `CELL_VW − 2 × IMAGE_PAD_VW` wide. Measured at 75.75px ≈ 3.98vw, against an 801px image.
 */
export const IMAGE_PAD_VW = 4;
export const IMAGE_VW = CELL_VW - 2 * IMAGE_PAD_VW;

/**
 * The image's shape, and a ceiling on its height.
 *
 * The aspect is measured (801 × 552). The ceiling is not in the reference — it cannot be,
 * because that capture is one viewport — but without it a tall narrow window would make
 * `IMAGE_VW` taller than the screen and push the caption out of the stage. Expressed as a
 * width cap in vh so the aspect is never broken to satisfy it: see the `min()` in
 * CaseLayers.
 */
export const IMAGE_ASPECT = 1.45;
/**
 * 62, and the value is constrained from both sides rather than picked.
 *
 * The cap binds when `IMAGE_VW · W ≤ IMAGE_MAX_VH · IMAGE_ASPECT · H`, i.e. above an aspect
 * ratio of `IMAGE_MAX_VH × 0.0345`. It **must not** bind at the reference's own 1905×947
 * (aspect 2.011), or the section stops matching the recording at the very viewport it was
 * measured from — that needs > 58.3, and the first pass at 58 got this wrong, shipping an
 * image 4.6px narrow. It **must** bind on a short wide window, where 42vw of image plus its
 * caption is taller than the stage — 1920×600 wants it. 62 binds above aspect 2.14, which
 * leaves the reference untouched and holds the block at 82vh in the 1920×600 case.
 */
export const IMAGE_MAX_VH = 62;

/**
 * Empty run at the end of the track, in vw, so the closing cell can finish its own travel.
 *
 * Without it the track's right edge is the closing cell's right edge, so at full travel that
 * cell is parked at 50vw with its rise still 7% short — it never settles, and the section
 * releases on a panel that is visibly still arriving. In the reference this cannot happen
 * because its track does not end here: measured, it carries straight on into the next
 * section, whose first cell slides in from the right while the closing panel keeps moving
 * left.
 *
 * `(100 − CELL_VW) / 2` lands the closing cell dead centre at full travel — which is not an
 * invention but a frame the recording passes through (measured at x=507..1459 of 1920, centred
 * to within 2px). It mirrors the opening, where the heading cell rests against the left edge.
 */
export const TRACK_TAIL_VW = (100 - CELL_VW) / 2;

/**
 * ## The pace knob — the one number to change if the section feels slow or frantic
 *
 * Pixels of horizontal travel per pixel of vertical scroll.
 *
 *   1     the reference's own relation: the cells move at the speed of the reader's
 *         hand, and the pin is exactly as long as the track's overflow.
 *   1.5   what ships. The pin reserves `overflow / 1.5`, so a third less scrolling
 *         carries the reader through the same track and every cell crosses the screen
 *         half again as fast.
 *   2     twice the speed, half the scroll. Past about here the traverse starts to
 *         outrun SCRUB's 1s of catch-up and the track visibly lags the wheel — raise
 *         this and SCRUB together, or the section stops feeling attached to the hand.
 *
 * Nothing else has to move with it. The rise is keyed to where a cell *is* on screen
 * rather than to how much has been scrolled (see RISE_END_VW), so it still begins and
 * ends at the same two positions and simply reaches them sooner; the dev assertion on
 * TRACK_TAIL_VW below is in the same terms and holds unchanged.
 */
export const TRAVEL_PER_SCROLL = 1.5;

/* ── the rise ────────────────────────────────────────────────────────────────── */

/**
 * How far a cell's content starts below its resting place, as a percentage of that
 * content's own height.
 *
 * A fraction of the block, not a px figure, and that is what the reference's own numbers
 * point at: the fitted rise for a card was 634px against a measured content block of 667px.
 * Writing it as a fraction of the block means the heading cell — a much shorter block — rises
 * proportionally rather than by a card's distance, which is what the capture shows it doing.
 *
 * The paint resolves this against each block's measured height and writes plain `y`; it is
 * deliberately *not* handed to GSAP as `yPercent`, which silently no-ops here. See
 * `CaseMeasure.contentH` in ./measure for why.
 *
 * The fit is a `power3.out` over the span below; residuals against 17 measured samples of
 * the second card were under 5px except at two points, where the frame-edge detection is
 * itself worth ±5px.
 */
export const RISE_PCT = 95;
export const RISE_EASE = "power3.out";

/**
 * Where the rise ends, as the cell's left edge measured in fractions of the viewport's
 * width. It begins when that edge is at the viewport's *right* edge, i.e. at 1.
 *
 * Measured: the second card's content reached its resting place with its cell's left edge
 * at 543px of a 1905px viewport, and was still 1px low at 696px. So the vertical component
 * of the entrance finishes well before the horizontal one does, and a card arrives on a
 * diagonal from the lower right rather than sliding in flat.
 *
 * This is also why the two cells on screen at rest need no special case: the first cell's
 * left edge is at 0 and the second's at 0.5, so the first is settled and the second sits
 * ~2.5% of its height low — which is exactly what the capture shows at the frame the pin
 * engages (measured 20px against 16.8px predicted).
 */
export const RISE_END_VW = 0.285;

/**
 * The pre-pin entrance, and the one place a stagger does exist.
 *
 * Before the pin engages the track cannot move, so the cells on screen at rest have nothing
 * to ride in on — yet the capture shows them rising anyway, driven by the section's own
 * vertical approach (the heading's rule climbed 191px while every divider held still, which
 * is only possible if the track's x was 0 throughout). So the rise reads the *lesser* of two
 * approaches, the horizontal one and this, and the section's arrival gates the whole row.
 *
 * The lag per cell is measured rather than invented: at the frame the heading's rise was
 * 0.589 through its curve, the first card's was 0.523.
 */
export const PRE_STAGGER = 0.07;

/**
 * ScrollTrigger's smoothing on the playhead, in seconds of catch-up.
 *
 * Not an ease and not a delay: the track still lands exactly where the scroll says, this
 * only takes a moment to get there. Note that a numeric scrub only does anything when the
 * trigger has an `animation` to drive — see the proxy tween in ./sequence.
 *
 * Paired with TRAVEL_PER_SCROLL: the catch-up is a fixed second of *time*, so the faster
 * the track runs the further behind the wheel it is during that second. At 1.5 the lag is
 * not readable; well past 2 it is, and this comes down with it.
 */
export const SCRUB = 1;

/* ── breakpoints ─────────────────────────────────────────────────────────────── */

/**
 * The two ranges. `isWide` is the one `./sequence` builds the pinned track and its door
 * against — the traverse's own cell pitch (`CELL_VW`) is a `md:` Tailwind class, so the
 * two share Tailwind's 768px threshold exactly.
 *
 * `isMobile` is `CaseStudies.tsx`'s own breakpoint, read independently of `gsap.matchMedia`
 * so the component can decide *whether to build the sequence at all* rather than build it
 * and have it react to the query — see the note there on why the pinned track never runs
 * below `md`.
 *
 * `.98` upper bounds rather than whole pixels: a fractional viewport width is ordinary once
 * browser zoom is involved, and `max-width: 767px` leaves 767.5 matching neither range —
 * which would tear down one paint and build nothing in its place.
 */
export const MQ = {
  isWide: "(min-width: 768px)",
  isMobile: "(max-width: 767.98px)",
} as const;

/* ── the door ────────────────────────────────────────────────────────────────── */

/**
 * ## The section's exit: the whole case-studies layer slides off to the left
 *
 * Once the track has finished its traverse the layer it lives on leaves the screen
 * sideways, uncovering a panel that has been standing still behind it the whole time.
 * Like everything above, the *shape* of it is transcribed off a reference recording
 * (1918×934, 30fps) rather than chosen, and what the frames rule out matters as much as
 * what they show:
 *
 *   rigid, not a wipe   The outgoing layer's right edge and the ink inside it move by
 *                       the same amount every frame — the ratio of content travel to
 *                       edge travel runs 0.947 → 1.000 over the fifteen frames where
 *                       both are measurable, i.e. 1:1. The layer translates; nothing
 *                       inside it slides against the frame.
 *   the panel is still  The revealed section does not move, drift, scale or parallax.
 *                       Its widest line held its right edge at x=1394 and its cap line
 *                       at y=489 on **every** frame of both the open and the close, and
 *                       its left edge at 526 from the moment the door cleared it.
 *   no fade either side The outgoing field's tone at a fixed point on the screen held
 *                       221 (y=700) and 212 (y=880) across the whole opening. The layer
 *                       does not dim as it leaves and the panel does not fade in.
 *   a whole viewport    The edge runs off the left of the screen and the field is
 *                       entirely gone. The travel is 100vw, not a partial reveal.
 *
 * So the whole effect is one translation over one stationary layer, and the temptation
 * to add a crossfade or a little parallax on the panel should be resisted the same way
 * the card scale and the inner-image parallax were measured out of the traverse above.
 *
 * ## The clock is ours, and deliberately not the reference's
 *
 * The reference's door is **scrubbed**: its speed runs 19 → 28 → 48 → 4 → 16 → 2 px per
 * frame, two accelerate-and-decelerate cycles, which is two hand gestures and not one
 * curve. (The frames that repeat a value are dropped frames — mean |Δ| of 0.01–0.13
 * against 3–10 for every frame that really moved — not a paused scroll.) So it takes two
 * scrolls to open and it parks half-open in between, which is exactly what this build is
 * asked not to do: the door has to open in one gesture whatever the reader's speed.
 *
 * That makes it a floored cue, the same shape as the hero's two door moves — see
 * `hero/flooredCue.ts`, which owns the clock, the scroll bound and the rebase-on-reversal
 * and is imported here rather than reimplemented.
 */

/** How far the layer travels, in vw. A whole viewport — measured; see above. */
export const DOOR_TRAVEL_VW = 100;

/**
 * The move's own duration, and the curve it is read through.
 *
 * Not a transcription — a scrubbed reference has no duration (see above). 1.2s for a
 * full-viewport slide is brisk without being a cut, and it puts the crossover speed
 * (`DOOR_VH / DOOR_SECONDS`, the pace above which the reader outruns the clock) at
 * 50vh/s, which is the figure the hero's opening already ships at.
 *
 * The ease is applied where the cue's value is *read* rather than on its tween, which is
 * `createFlooredCue`'s contract: the clock and the scroll floor have to be compared as
 * raw progress, and an eased tween retargeted mid-flight re-eases from wherever it was
 * caught. `inOut` because the panel starts at rest and ends at rest at both ends of the
 * gesture — there is nothing carrying momentum into it.
 */
export const DOOR_SECONDS = 1.2;
export const DOOR_EASE = "power2.inOut";

/**
 * The return leg's speed, as a multiplier. 1 — the close is an exact undo of the open.
 *
 * The reference's own close ran 1.37× faster than its open (71 frames against 97), but
 * both figures are the recorder's hand rather than a design, so there is nothing there to
 * transcribe. The hero slows its return legs because they are reversals *into* content
 * the reader is coming back to read; this one reverses into the closing panel of a track
 * they have already been through, so a symmetric undo is the honest default.
 */
export const DOOR_REVERSE_SPEED = 1;

/**
 * The scroll the door is floored against, in vh past the end of the traverse — and the
 * amount the pin grows by.
 *
 * The floor is what makes the clock affordable: below the crossover the clock leads and
 * the reader gets the whole designed move; above it the scroll leads and the move
 * finishes in whatever distance is left. Either way the door is **open by the end of this
 * span**, which is what stops the pin releasing on a half-open door — the fault the
 * hero's close shipped with, and the reason `CLOSE_VH` exists there.
 *
 * 60 is generous next to the hero's 25, and for a reason that inverts the argument made
 * there. Every vh of `CLOSE_VH` is scroll spent after a move that has already landed, on
 * a screen of flat gray — so it is a grind and it is kept short. The vh spent here is
 * spent on the revealed panel, which is the thing the reader came to, so it reads as a
 * hold on content rather than a wait. It is the same trade `LEAD_HOLD_VH` makes.
 *
 * This is the one knob for how long the panel stays on screen before the pin releases
 * into the footer; raising it holds the panel that much longer.
 */
export const DOOR_VH = 60;
export const DOOR_SPAN = [0, DOOR_VH] as const;

/**
 * How far the scroll must reverse before it counts as a reversal, in vh.
 *
 * Under a wheel notch (~11vh) and comfortably above ScrollSmoother's settling wobble.
 * The direction is a Schmitt trigger on travel rather than the sign of one frame's delta,
 * for the reason spelled out at `trackDirection` in `hero/sequence.ts`: the smoother keeps
 * delivering motion for about a second after a gesture ends and the tail of it crosses
 * zero repeatedly, and each flicker would retarget a 1.2s cue that had barely started.
 */
export const DIR_FLIP_VH = 3;

/**
 * ## There is no seam here to bleed, and that is worth stating
 *
 * Both of this repo's other sliding compositions close their joins a hair past touching —
 * `IMAGE_SEAM_BLEED_PX` in the definition section's footer, and the hero's oversized door
 * panels — because ScrollSmoother scrolls in fractional pixels and two edges computed from
 * the same number still round independently.
 *
 * This one needs none, because the door is not a moving edge between two painted things.
 * The field is the section's own background and never moves at all: it is a purely vertical
 * gradient, so translating it horizontally would be invisible, and the only horizontal
 * detail on it is the track, which is transparent. So the picture has exactly one boundary
 * — field to panel — and a rounding error can only move that boundary by a subpixel. It
 * cannot expose a third thing between them, because there is no third thing.
 *
 * The one consequence to keep: **the field must stay a vertical gradient.** Give it any
 * horizontal component and the illusion breaks — the part of it that is supposed to have
 * slid off the screen would still be sitting there under the panel's left edge.
 */

if (process.env.NODE_ENV !== "production") {
  // Two cells must fill the screen exactly at the wide breakpoint, or the track's rhythm
  // stops being "one screen shows a card and its neighbour" and the measured rise span
  // stops meaning what it means.
  if (Math.abs(2 * CELL_VW - 100) > 1e-9) {
    console.error(
      `[CaseStudies] two cells span ${2 * CELL_VW}vw rather than the viewport. The rise ` +
      "span in RISE_END_VW was measured against a half-viewport cell.",
    );
  }

  // The rise has to be finished by the time the track runs out — otherwise the closing panel
  // is still visibly climbing as the pin releases. The tail run is what buys this, so the
  // check is really on TRACK_TAIL_VW being large enough.
  const endCellLeft = TRACK_TAIL_VW / 100; // the closing cell's left edge at full travel
  const r = Math.min(1, (1 - endCellLeft) / (1 - RISE_END_VW));
  const leftover = RISE_PCT * (1 - r) ** 3;
  if (leftover > 0.5) {
    console.error(
      `[CaseStudies] the closing cell is still ${leftover.toFixed(2)}% of its height low ` +
      "when the pin releases. Raise TRACK_TAIL_VW.",
    );
  }

  // The cap must not bind at the reference's own aspect ratio, or the layout stops matching
  // the recording at the very viewport it was measured from — see IMAGE_MAX_VH.
  //
  // The image resolves to `min(IMAGE_VW vw, IMAGE_MAX_VH · IMAGE_ASPECT vh)`, so the vw term
  // wins — which is what was measured — while
  //
  //     IMAGE_VW · (W / H) ≤ IMAGE_MAX_VH · IMAGE_ASPECT
  //
  // and the cap binds below that. The floor is derived rather than stated so it stays true if
  // the cell's padding or the image's aspect is ever retuned.
  const REFERENCE_ASPECT = 1905 / 947;
  const capFloorVh = (IMAGE_VW * REFERENCE_ASPECT) / IMAGE_ASPECT;
  if (IMAGE_MAX_VH < capFloorVh) {
    console.error(
      `[CaseStudies] IMAGE_MAX_VH=${IMAGE_MAX_VH} binds at the reference's 1905×947, so the ` +
      `image is narrower than the ${(IMAGE_VW / 100) * 1905} px measured there. Raise it ` +
      `above ${capFloorVh.toFixed(1)}.`,
    );
  }

  // The image must fit its cell with its padding intact.
  if (IMAGE_VW <= 0 || IMAGE_VW >= CELL_VW) {
    console.error(
      `[CaseStudies] IMAGE_PAD_VW leaves a ${IMAGE_VW}vw image in a ${CELL_VW}vw cell.`,
    );
  }

  // The door has to clear the whole screen, or a strip of the case-studies field is still
  // standing when the pin releases and the revealed panel arrives with a grey margin.
  if (DOOR_TRAVEL_VW < 100) {
    console.error(
      `[CaseStudies] the door travels ${DOOR_TRAVEL_VW}vw, so ${100 - DOOR_TRAVEL_VW}vw of ` +
      "the case-studies field never leaves the screen.",
    );
  }

  // The floor is what guarantees the door is open by the time the pin releases, and it can
  // only do that if it has scroll to work with. A span shorter than one wheel notch (~11vh)
  // is not a floor at all — the reader crosses the whole of it in one event, and the door is
  // then wholly at the mercy of the clock finishing before the pin lets go.
  if (DOOR_VH < 12) {
    console.error(
      `[CaseStudies] DOOR_VH=${DOOR_VH} is under one wheel notch, so the scroll floor cannot ` +
      "bound the door's landing. Raise it above 12.",
    );
  }

  // Below the crossover the clock leads and the reader gets the designed move; above it the
  // scroll leads. Put the crossover under an ordinary reading pace and the clock never leads
  // anyone, which is the whole point of the cue — it degenerates into a scrub, i.e. back into
  // the reference's own two-gesture behaviour.
  const crossoverVhPerSecond = DOOR_VH / DOOR_SECONDS;
  if (crossoverVhPerSecond < 30) {
    console.error(
      `[CaseStudies] the door hands over to the scroll at ${crossoverVhPerSecond.toFixed(0)}vh/s, ` +
      "which is at or below a reading pace — the clock would never lead. Raise DOOR_VH or " +
      "shorten DOOR_SECONDS.",
    );
  }

}
