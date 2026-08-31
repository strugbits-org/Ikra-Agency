/**
 * Case-study track timing. Every figure below is measured off a reference recording
 * (1920×1040 capture, ~1905px layout viewport), not chosen — see each constant for what
 * was measured. TRAVEL_PER_SCROLL is the one preference in the file (the pace knob).
 *
 * The only per-cell animation is a vertical rise — frame analysis ruled out inner
 * parallax, scale, and exit fade/dim, and showed the whole content block moves as one
 * piece rather than staggering by line.
 */

/* ── the track ───────────────────────────────────────────────────────────────── */

/** One cell's width as % of viewport — two cells fill the screen. Measured 952.4px / 1905px. */
export const CELL_VW = 50;

/** Image inset per side, in vw. Measured ~75.75px ≈ 3.98vw against an 801px image. */
export const IMAGE_PAD_VW = 4;
export const IMAGE_VW = CELL_VW - 2 * IMAGE_PAD_VW;

/** Image aspect, measured (801 × 552). */
export const IMAGE_ASPECT = 1.45;
/**
 * Height ceiling in vh, for short wide viewports. Must not bind at the reference's own
 * 1905×947 (needs > 58.3) and must bind on a short wide window (e.g. 1920×600).
 */
export const IMAGE_MAX_VH = 62;

/**
 * Empty run at the track's end, in vw, so the closing cell finishes its rise before the pin
 * releases. Lands the closing cell dead centre at full travel — matches the reference.
 */
export const TRACK_TAIL_VW = (100 - CELL_VW) / 2;

/**
 * Pace knob: px of horizontal travel per px of vertical scroll. 1 matches the reference;
 * ships at 1.5. Raise SCRUB alongside this past ~2 or the track visibly lags the wheel.
 */
export const TRAVEL_PER_SCROLL = 1.5;

/* ── the rise ────────────────────────────────────────────────────────────────── */

/**
 * How far a cell's content starts below rest, as % of its own content height (not px, so
 * shorter blocks like the heading rise proportionally). power3.out fit off measured samples.
 */
export const RISE_PCT = 95;
export const RISE_EASE = "power3.out";

/**
 * Where the rise ends, as the cell's left edge in fractions of viewport width (the rise
 * starts when that edge hits the right edge, i.e. 1). Measured off the reference capture.
 */
export const RISE_END_VW = 0.285;

/**
 * Pre-pin entrance lag per cell — before the pin engages, the row still rises, driven by
 * the section's vertical approach rather than the track's x. Measured off the capture.
 */
export const PRE_STAGGER = 0.07;

/** ScrollTrigger playhead smoothing, in seconds of catch-up. Paired with TRAVEL_PER_SCROLL. */
export const SCRUB = 1;

/* ── breakpoints ─────────────────────────────────────────────────────────────── */

/**
 * isWide is what ./sequence builds the pinned track against, matching CELL_VW's own `md:`
 * breakpoint. isMobile is read independently so CaseStudies can decide whether to build the
 * sequence at all. `.98` upper-bounds for fractional viewport widths under browser zoom.
 */
export const MQ = {
  isWide: "(min-width: 768px)",
  isMobile: "(max-width: 767.98px)",
} as const;

/* ── the door ────────────────────────────────────────────────────────────────── */

/**
 * The section's exit: the case-studies layer slides off left, uncovering a still panel
 * behind it. Shape is transcribed off a reference recording (1918×934, 30fps) — rigid
 * translation (no wipe), panel never moves, no fade either side, a full 100vw travel.
 *
 * The clock is ours, not the reference's: its door is scrubbed and opens over two separate
 * gestures, which this build can't allow — one scroll must open it at any speed. So it's a
 * floored cue, same shape as the hero's door moves — see hero/flooredCue.ts, imported here.
 */

/** Travel distance, in vw. A whole viewport — measured. */
export const DOOR_TRAVEL_VW = 100;

/**
 * Move duration and ease. Not transcribed (a scrubbed reference has no duration) — 1.2s
 * puts the clock/scroll crossover at 50vh/s, matching the hero's opening. inOut because the
 * panel is at rest at both ends. Ease is applied where the cue is read, not on the tween —
 * see createFlooredCue.
 */
export const DOOR_SECONDS = 1.2;
export const DOOR_EASE = "power2.inOut";

/** Return-leg speed multiplier. 1 — a symmetric undo, since this reverses into a track already seen. */
export const DOOR_REVERSE_SPEED = 1;

/**
 * Scroll the door is floored against, in vh past the traverse's end — and how much the pin
 * grows by. Guarantees the door is open by the time this span ends. 60 (vs. the hero's 25)
 * because this vh is spent on the revealed panel rather than a wait on flat gray — the one
 * knob for how long the panel holds before the pin releases into the footer.
 */
export const DOOR_VH = 60;
export const DOOR_SPAN = [0, DOOR_VH] as const;

/** Reversal threshold, in vh — above a wheel notch, above ScrollSmoother's settling wobble. */
export const DIR_FLIP_VH = 3;

/**
 * No seam bleed needed here (unlike IMAGE_SEAM_BLEED_PX / the hero's door panels): the field
 * is a purely vertical gradient and never moves, so there's only one boundary — field to
 * panel — and a rounding error can only shift it by a subpixel. Keep the field vertical-only
 * or the illusion breaks.
 */

if (process.env.NODE_ENV !== "production") {
  // Two cells must fill the screen exactly at the wide breakpoint.
  if (Math.abs(2 * CELL_VW - 100) > 1e-9) {
    console.error(
      `[CaseStudies] two cells span ${2 * CELL_VW}vw rather than the viewport. The rise ` +
      "span in RISE_END_VW was measured against a half-viewport cell.",
    );
  }

  // The rise must finish before the track runs out, or the closing panel is still climbing
  // when the pin releases.
  const endCellLeft = TRACK_TAIL_VW / 100;
  const r = Math.min(1, (1 - endCellLeft) / (1 - RISE_END_VW));
  const leftover = RISE_PCT * (1 - r) ** 3;
  if (leftover > 0.5) {
    console.error(
      `[CaseStudies] the closing cell is still ${leftover.toFixed(2)}% of its height low ` +
      "when the pin releases. Raise TRACK_TAIL_VW.",
    );
  }

  // IMAGE_MAX_VH must not bind at the reference's own 1905×947, or the image no longer
  // matches the viewport it was measured from.
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

  // The door must clear the whole screen or a strip of the field is left standing.
  if (DOOR_TRAVEL_VW < 100) {
    console.error(
      `[CaseStudies] the door travels ${DOOR_TRAVEL_VW}vw, so ${100 - DOOR_TRAVEL_VW}vw of ` +
      "the case-studies field never leaves the screen.",
    );
  }

  // A floor under one wheel notch can't bound the door's landing.
  if (DOOR_VH < 12) {
    console.error(
      `[CaseStudies] DOOR_VH=${DOOR_VH} is under one wheel notch, so the scroll floor cannot ` +
      "bound the door's landing. Raise it above 12.",
    );
  }

  // Keep the clock/scroll crossover above a reading pace, or the cue degenerates into a scrub.
  const crossoverVhPerSecond = DOOR_VH / DOOR_SECONDS;
  if (crossoverVhPerSecond < 30) {
    console.error(
      `[CaseStudies] the door hands over to the scroll at ${crossoverVhPerSecond.toFixed(0)}vh/s, ` +
      "which is at or below a reading pace — the clock would never lead. Raise DOOR_VH or " +
      "shorten DOOR_SECONDS.",
    );
  }

}
