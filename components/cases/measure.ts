import type { CaseRefs } from "./sequence";

/**
 * The layout figures every frame of the case studies is computed against. Reads the DOM;
 * writes nothing to it.
 *
 * Re-read on every ScrollTrigger refresh rather than once on mount, because all of it is
 * viewport-relative: a resize, a rotation or a mobile URL bar collapsing changes the
 * viewport width and therefore every figure below.
 */
export type CaseMeasure = {
  /** The viewport's width in px — the frame the track travels across. */
  viewportW: number;
  /**
   * The track's overflow, and therefore the pin's whole length: scroll this many pixels and
   * the track's right edge arrives at the viewport's right edge. One px of scrolling is one
   * px of horizontal travel, which is the reference's own relation and what makes the cells
   * move at the speed of the reader's hand rather than at some multiple of it.
   *
   * `0` when the track fits the viewport, which the sequence treats as "nothing to do".
   */
  distance: number;
  /** Per cell, in DOM order: its resting left edge within the track. */
  cellLeft: number[];
  /**
   * Per cell, in DOM order: its content block's laid-out height, in px.
   *
   * The rise is a fraction of the block's own height (see RISE_PCT) so that the heading cell
   * — a much shorter block — travels proportionally rather than by a card's distance. That
   * reads naturally as `yPercent`, and it was written that way first, but GSAP 3.15 drops the
   * percentage term when it is the only transform on the element: the cache takes `NaN`, the
   * renderer's `if (xPercent || yPercent)` sees a falsy value and emits a bare
   * `translate3d(0px, 0px, 0px)`. The whole rise silently did nothing — the track traversed,
   * every cell stayed at rest, and nothing threw. Resolving the fraction against a measured
   * height here and writing plain `y` keeps the identical motion on the path that the track's
   * own `x` already proves works.
   *
   * `offsetHeight` for the same reason `offsetLeft` is used below: it is a layout value and
   * ignores the transform the rise itself is writing, so re-measuring mid-scroll cannot feed
   * the current pose back into the geometry.
   */
  contentH: number[];
};

/**
 * `offsetLeft`, deliberately, and not `getBoundingClientRect().left`.
 *
 * `offsetLeft` is a *layout* value: it ignores transforms. The rect does not — and the track
 * carries the horizontal translation while each cell's content carries the rise, so a
 * refresh that happened mid-scroll would measure the cells wherever they had been painted
 * and bake the reader's position into the geometry. That is the same class of fault as
 * measuring from where a cued move landed, and it is silent.
 *
 * The track is `position: relative` in the markup so that it is the cells' `offsetParent`,
 * which is what makes `offsetLeft` mean "distance from the track's left edge" rather than
 * from some arbitrary ancestor.
 */
export function measureCases(refs: CaseRefs): CaseMeasure {
  const track = refs.track.current;
  const viewportW = document.documentElement.clientWidth;

  if (!track) return { viewportW, distance: 0, cellLeft: [], contentH: [] };

  const cellLeft = refs.cells.current.map((el) => el?.offsetLeft ?? 0);
  const contentH = refs.contents.current.map((el) => el?.offsetHeight ?? 0);

  // `scrollWidth` rather than `offsetWidth`: the track is `w-max`, so the two agree, but
  // scrollWidth is the one that stays honest if a cell ever overflows it.
  const distance = Math.max(0, track.scrollWidth - viewportW);

  return { viewportW, distance, cellLeft, contentH };
}
