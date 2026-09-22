import type { RefObject } from "react";
import { CELL_COUNT } from "./metrics";
import {
  LEAD_CELLS,
  REVEAL_END_PCT,
  REVEAL_VH,
  travelPerScroll,
} from "./timeline";

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
  /** The whole track, which is `cellCount x cellW` and may be wider than the stage. */
  trackW: number;
  /**
   * How far the rail reaches left of the track's origin — RAIL_LEAD_IN, resolved. Read off the
   * bar rather than recomputed from the token, so a change to the figure cannot leave the
   * geometry behind.
   *
   * **It is what rail coordinates are offset by**: everything below is measured from the rail's
   * left end, not the track's, because the fill starts where the *line* starts. The track's own
   * origin is at `leadIn`.
   */
  leadIn: number;
  /** How far the track has to slide. Zero when everything already fits. */
  overflow: number;
  /** Each dot's centre, in rail coordinates. */
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
  /**
   * The stage's own height, and the section's bottom padding under it. Read only so the floor
   * that keeps the footer out of the hold can be checked against the real boxes rather than
   * against the constants it is written from — see `assertApproachGeometry` and
   * ./ApproachLayers' APPROACH_STAGE_FLOOR.
   */
  stageH: number;
  padBottom: number;
  viewportH: number;
};

export function measureApproach(refs: ApproachRefs): ApproachMeasure {
  const stage = refs.stage.current;
  const track = refs.track.current;
  const dots = refs.dots.current ?? [];

  const visible = stage?.offsetWidth ?? 0;
  const trackW = track?.offsetWidth ?? visible;
  const viewportH = window.innerHeight;

  // The bar is positioned against the rail, as the dots are, so its own `offsetLeft` is the
  // lead-in in the same coordinates everything else here is read in.
  const bar = refs.rail.current?.querySelector<HTMLElement>("[data-rail-bar]");
  const leadIn = Math.max(0, -(bar?.offsetLeft ?? 0));

  const dotX = dots.map((el) =>
    el ? leadIn + el.offsetLeft + el.offsetWidth / 2 : 0,
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
      : leadIn + (visible / CELL_COUNT) * LEAD_CELLS;

  const section = stage?.closest("section") ?? null;

  return {
    visible,
    trackW,
    leadIn,
    overflow: Math.max(0, trackW - visible),
    dotX,
    dotR,
    lead,
    pace: travelPerScroll(visible, viewportH),
    stageH: stage?.offsetHeight ?? 0,
    padBottom: section
      ? parseFloat(getComputedStyle(section).paddingBottom) || 0
      : 0,
    viewportH,
  };
}

/**
 * How far the fill has to travel in total, in px of rail — the whole track, not the visible
 * width, so a fourth cell lengthens the run rather than speeding it up, **plus the lead-in**,
 * because the line starts where the line starts.
 *
 * This is the rail's length and `totalVh` below is the scroll, and since the lead-in they are
 * no longer the same shape: the lead-in adds rail without adding anywhere for the track to
 * slide to, so it makes the fill draw ~5% faster rather than making the section longer. That is
 * the right trade — the alternative is charging the reader scroll for a stretch of line that is
 * already on screen before the section begins.
 */
export const reachTotal = (m: ApproachMeasure) => m.leadIn + m.trackW;

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
 * and a clock constructed against it cannot go stale.
 *
 * **`trackW` and not `reachTotal`**, which is the one place the two have to be told apart: this
 * is the scroll the two triggers between them actually provide, and it is the reveal's 90vh
 * plus the track's own overflow. The lead-in lengthens the rail without lengthening either, so
 * folding it in here would promise a stretch of scroll that does not exist and leave the last
 * few percent of the line permanently undrawn.
 */
export const totalVh = (m: ApproachMeasure) =>
  m.visible > 0 ? (REVEAL_VH * m.trackW) / m.visible : REVEAL_VH;

/**
 * Where the fill is allowed to come to rest, as fractions of the rail — **one stop per point,
 * and one scroll gesture per stop**. See ./timeline's STEP_SECONDS for the brief this answers.
 *
 * A stop is a dot's **coverage** point, `centre + radius`, not its centre: the dot a step lands
 * on has to be solid when the line stops, and the bounce fires on that same frame (./timeline's
 * BOUNCE_AT_COVERAGE, which is also why it compares against just under 1 — the number below is
 * what the paint divides and multiplies back).
 *
 * Every dot gets one, **including the first**, and that is the whole of what RAIL_LEAD_IN buys.
 * Without the lead-in the first dot is covered 64px into a 1685px line, so the opening gesture
 * drew 0.4% of the rail; the first build therefore gave it no stop, and the visible consequence
 * was that the first scroll appeared to run straight to the second dot. With the lead-in in
 * front of it the same gesture draws 146px and pops a dot, which is a station like any other.
 *
 * One stop anyone would expect is still not here, and one nobody would:
 *
 *   - **The last stop is the rail's end, not the last dot.** The rail runs on past it — 416px
 *     in the reference, which is the reference's own composition — so a line that stopped on
 *     the final dot would leave that tail permanently unlit. It is the one step with no bounce
 *     at the end of it, by construction.
 *   - So there are `n + 1` stops for `n` points, and the steps are **uneven in length**: 146px,
 *     then a cell each, then the tail. ./sequence spaces their scroll boundaries evenly anyway,
 *     because the brief is one gesture per step and a gesture is not measured in pixels.
 */
export function stopsFor(m: ApproachMeasure): number[] {
  const total = reachTotal(m);
  if (total <= 0) return [1];
  const atDots = m.dotX.map((x) => (x + m.dotR) / total);
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
 *
 * `reachPx` and `lead` are both in rail coordinates and the lead-in cancels out of their
 * difference, so this is the same arithmetic it was before the rail grew a left end — which is
 * the reason for measuring in rail coordinates throughout rather than converting at each use.
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
  /**
   * The footer's runway, and it has to be non-negative or whatever follows this section climbs
   * into the hold while the line is still drawing. A pin holds the pinned element and nothing
   * else, and the pin's own length cancels out of this — the spacer grows the section by
   * exactly the pin — so the only thing that decides it is how much section is left under the
   * fold when the row comes to rest. ./ApproachLayers' APPROACH_STAGE_FLOOR is what holds it,
   * and this is the check against the real boxes rather than against the constants it is
   * written from, so the height of the client's own copy is in it too.
   */
  const restY = (REVEAL_END_PCT / 100) * m.viewportH - m.dotR;
  const runway = restY + m.stageH + m.padBottom - m.viewportH;
  if (runway < -1) {
    console.error(
      `[Approach] the section's bottom edge sits ${(-runway).toFixed(0)}px above the fold when ` +
      "the row comes to rest, so the footer is already climbing over it before the rail has " +
      "finished drawing. Raise APPROACH_STAGE_FLOOR, or PAD_BOTTOM.",
    );
  }

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
