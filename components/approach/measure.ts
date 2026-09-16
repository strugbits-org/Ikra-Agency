import type { RefObject } from "react";
import { CELL_COUNT } from "./metrics";
import { LEAD_CELLS, REVEAL_VH, travelPerScroll } from "./timeline";

/**
 * The layout figures the approach section's paint is computed against, read back from the DOM
 * once per refresh rather than per frame.
 *
 * Once per refresh because the paint runs on every scroll event and on the cue's own ticker,
 * and on a phone the address bar collapsing changes the viewport mid-scroll — a live read
 * would multiply a moving progress by a moving width and show as jitter. Same reasoning as
 * `playground/sequence`'s `measure` and `definition/measure`.
 *
 * `offsetLeft`/`offsetWidth`, **not `getBoundingClientRect`** — the rect includes transforms,
 * and the track carries the traverse's translation, so a refresh mid-scroll would bake the
 * reader's horizontal position into the geometry. Same trap, and the same answer, as
 * `cases/measure`. The track is `relative`, so it is the cells' `offsetParent`.
 */
export type ApproachRefs = {
  /** One viewport wide, clipping the track. Pinned during the traverse. */
  stage: RefObject<HTMLDivElement | null>;
  /** The row that translates. Holds the rail and every cell. */
  track: RefObject<HTMLDivElement | null>;
  /**
   * The rail's own row — the bar and the dots, one dot tall.
   *
   * Both triggers key off *this* and not the track, because the reference's mapping is
   * measured on the rail's centre line ("fill 0% as it crosses the fold, 100% at 10% of the
   * viewport") and the track is the rail plus a screen of copy. Using the track, `center`
   * lands ~175px lower and the whole reveal runs a fifth of its span late.
   */
  rail: RefObject<HTMLDivElement | null>;
  /** Each dot's wrapper, in order. Both discs inside it scale together. */
  dots: RefObject<(HTMLElement | null)[]>;
};

export type ApproachMeasure = {
  /** The visible width one screen of cells takes — the stage's own width. */
  visible: number;
  /** The whole rail, which is `cellCount x cellW` and may be wider than the stage. */
  trackW: number;
  /** How far the track has to slide. Zero when everything already fits. */
  overflow: number;
  /** Each dot's centre, in track coordinates. */
  dotX: number[];
  /**
   * One dot's radius. Read here rather than in the paint, which used to take an `offsetWidth`
   * per dot per frame — a forced layout on every frame of the scroll *and* of the cue's own
   * ticker, for a figure that only moves on a resize.
   */
  dotR: number;
  /** Where the fill's leading edge parks on screen during the traverse, in px from the left. */
  lead: number;
  /** Px of horizontal travel per px of vertical scroll — see travelPerScroll. */
  pace: number;
  viewportH: number;
};

export function measureApproach(refs: ApproachRefs): ApproachMeasure {
  const stage = refs.stage.current;
  const track = refs.track.current;
  const dots = refs.dots.current ?? [];

  const visible = stage?.offsetWidth ?? 0;
  const trackW = track?.offsetWidth ?? visible;
  const viewportH = window.innerHeight;

  const dotX = dots.map((el) =>
    el ? el.offsetLeft + el.offsetWidth / 2 : 0,
  );
  // Every dot is the same size, so the first one that exists speaks for all of them.
  const dotR = (dots.find((el) => el)?.offsetWidth ?? 0) / 2;

  /**
   * The lead is the last on-screen dot's position, so it is read off the measured dot rather
   * than recomputed from the cell width — one source for "where a dot sits", and it stays
   * right if the gutter or the dot's inset ever changes. Falls back to the arithmetic only
   * when there are fewer dots than fit, where the traverse is zero anyway.
   */
  const lead =
    dotX.length > LEAD_CELLS
      ? dotX[LEAD_CELLS]
      : (visible / CELL_COUNT) * LEAD_CELLS;

  return {
    visible,
    trackW,
    overflow: Math.max(0, trackW - visible),
    dotX,
    dotR,
    lead,
    pace: travelPerScroll(visible, viewportH),
    viewportH,
  };
}

/**
 * How far the fill has to travel in total, in px of rail — which is the whole track, not the
 * visible width, so a fourth cell lengthens the run rather than speeding it up.
 */
export const reachTotal = (m: ApproachMeasure) => m.trackW;

/**
 * The scroll the whole run takes, in vh, at the reveal's own pace.
 *
 * Derived from the pace rather than stated, so the reveal and the traverse cannot disagree
 * about how fast the line draws — see `travelPerScroll`.
 *
 * **The viewport height cancels**, which is worth stating because it is what makes this safe
 * to read once and hold: substituting the pace gives
 * `trackW ÷ (visible ÷ (REVEAL_VH/100 · H)) ÷ H · 100`, and both `H`s divide out, leaving
 * `REVEAL_VH · trackW / visible` — 90vh per screen-width of rail, and nothing else. So the
 * span only moves if the *cell count* does, never on a resize or a collapsing mobile URL bar,
 * and a cue constructed against it cannot go stale.
 */
export const totalVh = (m: ApproachMeasure) =>
  m.visible > 0 ? (REVEAL_VH * reachTotal(m)) / m.visible : REVEAL_VH;

/**
 * Where the fill is allowed to come to rest, as fractions of the rail — **one stop per point,
 * and one scroll gesture per stop**. See ./timeline's STEP_SECONDS for the brief this answers.
 *
 * A stop is a dot's **coverage** point, `centre + radius`, not its centre: the dot a step lands
 * on has to be solid when the line stops, and the bounce fires on that same frame (./timeline's
 * BOUNCE_AT_COVERAGE, which is also why it compares against just under 1 — the number below is
 * what the paint divides and multiplies back).
 *
 * Two of the stops anyone would expect are deliberately not here:
 *
 *   - **The first dot has none.** Its centre sits one radius into the rail, so it is covered
 *     64px into a 1685px line — a gesture ending there moves almost nothing and reads as the
 *     section failing to respond to the scroll at all. The opening gesture runs to the *second*
 *     dot and lights both on the way.
 *   - **The last stop is the rail's end, not the last dot.** The rail runs on past it — 416px
 *     in the reference, which is the reference's own composition — so a line that stopped on
 *     the final dot would leave that tail permanently unlit.
 *
 * The two cancel, which is what keeps it exactly one stop per point and therefore keeps
 * ./timeline's SEGMENT_VH at a flat 30vh however many rows the client adds.
 */
export function stopsFor(m: ApproachMeasure): number[] {
  const total = reachTotal(m);
  if (total <= 0) return [1];
  const atDots = m.dotX.slice(1).map((x) => (x + m.dotR) / total);
  return [...atDots.filter((s) => s < 1), 1];
}

/**
 * The track's translation for a given reach, in px, and the one place the two phases meet.
 *
 * `0` until the fill passes the lead mark, then it follows the fill exactly, then it stops at
 * the overflow. Written as a clamp rather than as a branch because the clamp *is* the
 * statement: the track never leads the fill, never outruns the overflow, and holds still
 * whenever either bound binds — which is what makes the last cells fill on screen with the
 * row already parked instead of at the right edge.
 */
export const trackXFor = (m: ApproachMeasure, reachPx: number) =>
  -Math.min(Math.max(reachPx - m.lead, 0), m.overflow);

/**
 * The one assertion that needs a measured box rather than a constant, so it lives here rather
 * than in timeline.ts: the fill must still have ground to cover once the traverse is complete,
 * or the final cells light while the row is still sliding under them.
 *
 * A no-op in production — the call site is guarded, and this is the only thing the guard has
 * to reach.
 */
export function assertApproachGeometry(m: ApproachMeasure) {
  if (m.overflow <= 0) return;
  const parkedAt = m.lead + m.overflow;
  if (parkedAt >= reachTotal(m)) {
    console.error(
      `[Approach] the track only finishes sliding at ${parkedAt.toFixed(0)}px of a ` +
      `${reachTotal(m).toFixed(0)}px rail, so the last dots fill while the row is still ` +
      "moving. Lower LEAD_CELLS, or widen the stage.",
    );
  }
}
