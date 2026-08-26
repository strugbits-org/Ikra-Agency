import type { RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { createFlooredCue } from "@/components/hero/flooredCue";
import { measureCases, type CaseMeasure } from "./measure";
import {
  DIR_FLIP_VH,
  DOOR_EASE,
  DOOR_REVERSE_SPEED,
  DOOR_SECONDS,
  DOOR_SPAN,
  DOOR_TRAVEL_VW,
  DOOR_VH,
  MQ,
  PRE_STAGGER,
  RISE_EASE,
  RISE_END_VW,
  RISE_PCT,
  SCRUB,
  TRAVEL_PER_SCROLL,
} from "./timeline";

/**
 * The pinned horizontal track, and the door it leaves through.
 *
 * ## Why the pin is GSAP's, and why nothing here is `sticky`
 *
 * `app/layout.tsx` wraps the page in ScrollSmoother, which fakes scrolling with a transform
 * on `#smooth-content`. Under a transformed ancestor `position: sticky` never engages and
 * `position: fixed` scrolls with the page, so the only thing that can hold this stage still
 * is ScrollTrigger's own `pin`.
 *
 * Unlike the hero and the definition section this uses `pin: true` with GSAP's own pin
 * *spacing* rather than `pinSpacing: false` against a hand-written section height. Both are
 * correct; this one belongs here because the pin's length is not a hand-written figure at
 * all — it is the track's measured overflow over TRAVEL_PER_SCROLL plus the door's floor, so
 * letting ScrollTrigger reserve exactly that keeps one source of truth in `end` instead of
 * splitting it between a trigger and a stylesheet.
 *
 * ## Two clocks for the traverse, and they cannot be collapsed
 *
 * The pin drives the traverse. A second, smaller trigger drives the section's vertical
 * approach, and it has to exist separately because it runs *before* the pin does — the pin
 * does not start until this section's top edge reaches the viewport top, and the approach
 * happens while that edge is still crossing the screen.
 *
 * They are not two clocks over one moment, which is this repo's most expensive recurring
 * bug. They are two *positions* feeding one paint: the rise reads the lesser of the two
 * approaches, so whichever is behind is in charge and neither can drift against the other.
 * There is one paint function, and every value it writes is a pure function of the pair —
 * paint the same pair twice and you get the same frame.
 *
 * ## The door is the one thing here on a clock rather than a position
 *
 * Everything above is scrubbed. The exit is not: crossing the end of the traverse fires a
 * timed move that runs to completion whatever the reader does, because a door caught
 * half-open is a door caught half-open at every scroll speed and the reference's own
 * scrubbed version needs two gestures to clear the screen. See DOOR_SECONDS in ./timeline
 * for the frame evidence, and `hero/flooredCue` for the shape.
 *
 * That is a clock over a *different* moment than the traverse's, not the same one — the door
 * cannot begin until the traverse has ended, and the traverse is pinned at 1 for the whole of
 * it. What the two do share is the paint, which stays a pure function of its inputs.
 *
 * ## What is deliberately absent
 *
 * No inner-image parallax, no card scale, no scrim, no per-line stagger, no exit animation
 * on the cells; and on the door, no crossfade, no scale and no drift on the panel behind it.
 * Each was measured *out* of the reference rather than left out — see the head of ./timeline
 * for the frame evidence. The traverse plus one rise per cell plus one slide is the whole
 * section.
 */
export type CaseRefs = {
  /** The element that pins: one viewport, clipping the track and the reveal either side. */
  stage: RefObject<HTMLDivElement | null>;
  /** The flex row that translates. Its overflow is the traverse's whole length. */
  track: RefObject<HTMLDivElement | null>;
  /** The cells, in DOM order: heading, one per project, then the closing panel. */
  cells: RefObject<(HTMLElement | null)[]>;
  /** Each cell's content block — the thing that rises. One per cell, same order. */
  contents: RefObject<(HTMLElement | null)[]>;
  /** The section itself, which the approach trigger watches. */
  section: RefObject<HTMLElement | null>;
  /**
   * The window the panel behind the door is seen through: a stage-sized box that starts
   * parked off the right edge and slides left, clipping its own contents.
   */
  revealWindow: RefObject<HTMLDivElement | null>;
  /** The panel inside that window, counter-translated so it never moves on screen. */
  revealPanel: RefObject<HTMLDivElement | null>;
};

const clamp01 = gsap.utils.clamp(0, 1);

/** RISE_PCT is written as a percentage of the content block; the paint wants the fraction. */
const RISE_FRAC = RISE_PCT / 100;

/** DOOR_TRAVEL_VW is written in vw; the paint wants the fraction of the viewport. */
const DOOR_TRAVEL_FRAC = DOOR_TRAVEL_VW / 100;

export function createCaseSequence(refs: CaseRefs) {
  const mm = gsap.matchMedia();

  mm.add(MQ, () => {
    const stage = refs.stage.current;
    const track = refs.track.current;
    const section = refs.section.current;
    const revealWindow = refs.revealWindow.current;
    const revealPanel = refs.revealPanel.current;
    if (!stage || !track || !section || !revealWindow || !revealPanel) return;

    const contents = refs.contents.current;
    const rise = gsap.parseEase(RISE_EASE);
    // Parsed once: the paint calls it every frame, and `parseEase` does a string lookup.
    const doorCurve = gsap.parseEase(DOOR_EASE);

    let m: CaseMeasure = measureCases(refs);
    // The section's vertical approach, 0 while it is a screen below and 1 as its top edge
    // lands at the viewport top — which is the same instant the pin engages, so the two
    // hand over with no gap and no overlap.
    let approach = 0;
    // The traverse, 0 at the frame the pin engages and 1 when the track's right edge
    // reaches the viewport's right edge.
    let traverse = 0;
    /**
     * How far past the *end of the traverse* the reader has scrolled, in vh.
     *
     * Deliberately not clamped at zero. Negative means "still inside the traverse", which
     * `ramp` clamps to 0 for the floor anyway, but the cue also measures how far the scroll
     * has travelled since the last direction flip in order to bleed its rebase offset off —
     * and clamping here would freeze that at the moment the reader crossed back, leaving a
     * stale offset behind for the rest of the section.
     */
    let doorVh = 0;

    /** The pin's whole length in px: the traverse, and then the door's floor. */
    const traversePx = () => m.distance / TRAVEL_PER_SCROLL;
    const pinPx = () => traversePx() + (DOOR_VH / 100) * m.viewportH;
    /**
     * Where the traverse ends, as a fraction of the pin.
     *
     * The pin is longer than the traverse now, so the driver's 0→1 is no longer the
     * traverse's own 0→1 and has to be rescaled against this. That rescale is the whole of
     * what the door costs the existing choreography: at the scroll position where the pin
     * used to end, `driver.progress()` is exactly this fraction and `traverse` is exactly 1,
     * so every cell reaches every mark at the same scroll offset it did before.
     */
    const traverseFrac = () => {
      const total = pinPx();
      return total > 0 ? traversePx() / total : 1;
    };
    /** The pin's progress, restated as the door's own position. */
    const doorVhAt = (p: number) =>
      ((p * pinPx() - traversePx()) / m.viewportH) * 100;

    /**
     * The exit, played by a clock and bounded by the scroll.
     *
     * Below the crossover (`DOOR_VH / DOOR_SECONDS`, 50vh/s as tuned) the clock leads and
     * one scroll of any size — a single wheel notch included — plays the whole slide. Above
     * it the floor leads and the slide finishes in whatever distance is left. Either way it
     * is complete by the end of DOOR_SPAN, which is what stops the pin releasing on a
     * half-open door. See `hero/flooredCue` for why the two have to be combined this way
     * and what a bare cue or a bare scrub each fail at.
     *
     * Imported rather than reimplemented: the rebase-on-reversal inside it is subtle enough
     * that a second copy would be a second set of bugs, and the module is pure — the same
     * call `growth/metrics` makes on `study/metrics`'s `fluid`.
     */
    const door = createFlooredCue({
      span: DOOR_SPAN,
      seconds: DOOR_SECONDS,
      reverseSpeed: DOOR_REVERSE_SPEED,
      onUpdate: () => paint(),
    });

    /**
     * Which way the reader is going: 1 down, −1 up.
     *
     * A Schmitt trigger on travel rather than the sign of one frame's delta — see
     * DIR_FLIP_VH. `dirPeak` is the furthest point reached since the last flip, so the
     * threshold is measured from the turn rather than from wherever the last event landed.
     *
     * The reversal re-anchors the cue on what is currently on screen. Without that the swap
     * from floor to ceiling inside it pays the whole difference between the clock and the
     * ramp in a single frame, and the clock is allowed to be far ahead of the ramp: a reader
     * who nudges back up with the door fully open at 5vh would see it snap to 8% open.
     */
    let scrollDir = 1;
    let dirPeak = 0;

    const trackDirection = (vh: number) => {
      if (scrollDir > 0) {
        if (vh > dirPeak) dirPeak = vh;
        else if (vh < dirPeak - DIR_FLIP_VH) {
          scrollDir = -1;
          dirPeak = vh;
          door.rebase(vh);
        }
      } else {
        if (vh < dirPeak) dirPeak = vh;
        else if (vh > dirPeak + DIR_FLIP_VH) {
          scrollDir = 1;
          dirPeak = vh;
          door.rebase(vh);
        }
      }
    };

    // Normalised so that every cell still reaches a full 1 by the end of the approach, and
    // only the order in which they get there is staggered.
    const spread = 1 + PRE_STAGGER * Math.max(0, m.cellLeft.length - 1);

    /** One frame, from the three positions. */
    const paint = () => {
      const V = m.viewportW;
      const d = traverse * m.distance;

      /**
       * How far the case-studies layer has slid off to the left, in px.
       *
       * `read` is the cue's own accessor and is safe to call more than once in a frame —
       * it is a no-op the second time, because nothing has moved between the two. The ease
       * is applied here rather than on the cue's tween, which is `createFlooredCue`'s
       * contract: the clock and the floor have to be compared as raw progress, or an
       * interrupted run re-eases from wherever it was caught.
       */
      const doorX = doorCurve(door.read(doorVh, scrollDir)) * DOOR_TRAVEL_FRAC * V;

      gsap.set(track, { x: -(d + doorX), force3D: true });

      /**
       * The reveal, as a window and a counter-translate rather than a clip.
       *
       * The window is a stage-sized box that starts one whole viewport to the right and
       * slides left; it clips its own contents, so what is painted is exactly the strip the
       * door has vacated. The panel inside it is translated back by the same amount, which
       * leaves it standing still on screen — which is what the reference does, measured to
       * the pixel on every frame of both directions.
       *
       * Two transforms rather than one `clip-path` on purpose: transforms are composited,
       * and an animated inset clip is not — it repaints a full screen of large type every
       * frame. Same trick, and the same reason, as `placePhoto`'s counter-scale in the
       * definition section.
       *
       * Note the field itself is never moved. It is the *section's* background, it is a
       * purely vertical gradient, and the only horizontal detail on top of it is the track —
       * so sliding it would be invisible and not sliding it costs nothing. See the note on
       * seams in ./timeline, which is also why neither edge here needs a bleed.
       */
      gsap.set(revealWindow, { x: V - doorX, force3D: true });
      gsap.set(revealPanel, { x: doorX - V, force3D: true });

      for (let i = 0; i < m.cellLeft.length; i++) {
        // `d` and not `d + doorX`: the rise is keyed to where a cell sits on screen during
        // the traverse, and the door happens after every cell has settled. Feeding the
        // door's travel in here would be harmless today — each cell's approach is already
        // clamped at 1 by then — but it would silently tie the entrance to the exit.
        const left = m.cellLeft[i] - d;

        // The horizontal approach: begins as the cell's left edge crosses the viewport's
        // right edge, completes at RISE_END_VW. Clamped at both ends, so a cell parked
        // either side of its window holds the endpoint pose rather than running past it.
        const horizontal = clamp01((V - left) / (V * (1 - RISE_END_VW)));
        // The vertical approach, staggered by cell — see PRE_STAGGER.
        const vertical = clamp01(approach * spread - i * PRE_STAGGER);

        // The lesser of the two is in charge. Before the pin the track cannot move, so the
        // cells already on screen would read a finished horizontal approach and appear with
        // no entrance at all; after it, `vertical` is 1 and the traverse has sole charge.
        //
        // Plain `y` against the measured block height, not `yPercent` — the rise is still a
        // fraction of the cell's own content, but resolved here rather than by the renderer.
        // See CaseMeasure.contentH: GSAP 3.15 drops a percentage translate when it is the
        // only transform on the element, so the `yPercent` form wrote translate3d(0,0,0) on
        // every frame and the entrance never ran at all.
        gsap.set(contents[i], {
          y: RISE_FRAC * m.contentH[i] * (1 - rise(Math.min(horizontal, vertical))),
          force3D: true,
        });
      }
    };

    /**
     * One scroll position, turned into everything the door needs.
     *
     * Split out of `onUpdate` because it has four callers: the scroll, a refresh, and the
     * two edges. A pinned trigger stops firing `onUpdate` once the reader is past it, so
     * without the edges the door would hold whatever pose it was last painted in — the same
     * reason the approach trigger below carries `onLeave`/`onLeaveBack`.
     */
    const advance = (p: number) => {
      doorVh = doorVhAt(p);
      trackDirection(doorVh);
      // Past the far end it must be open, whichever way the reader is going; before the near
      // end it must be shut. Between the two the direction decides, which is what makes the
      // reverse a gesture of its own rather than the floor dragging it back.
      door.aim(doorVh >= DOOR_VH ? 1 : doorVh <= 0 || scrollDir < 0 ? 0 : 1);
      paint();
    };

    // A proxy tween, and it is not ceremony: a numeric `scrub` is implemented as a tween on
    // the *animation's* progress, so a trigger with only an `onUpdate` and no animation gets
    // no smoothing at all and receives the raw, stepped scroll position. Driving one scalar
    // and painting from its `onUpdate` is what makes SCRUB mean what it says.
    //
    // The door deliberately does *not* read this. Its floor has to be the real scroll
    // position, because the pin releases on the real scroll: bounding it with a value that
    // is up to a second behind would let a fast reader out of the section with the guarantee
    // still catching up. `advance` is called from the trigger's own `onUpdate`, which
    // receives raw progress.
    //
    // It also rules out `invalidateOnRefresh`, which would be wrong here rather than merely
    // unnecessary: invalidating re-records a tween's start value from wherever the target
    // currently is, so a refresh at half-scroll would leave this running 0.5 → 1 over the
    // whole pin. Nothing here is a function-based tween value — the measurements are re-read
    // in `onRefreshInit`, and the pin's length is a function in `end`, which is re-evaluated
    // on every refresh regardless.
    const proxy = { p: 0 };
    const driver = gsap.to(proxy, {
      p: 1,
      duration: 1,
      ease: "none",
      paused: true,
      onUpdate: () => {
        traverse = clamp01(proxy.p / traverseFrac());
        paint();
      },
    });

    // The approach. Ends exactly where the pin begins, and scrubbed rather than cued so it
    // cannot be caught half-played by a fast scroll.
    ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      end: "top top",
      scrub: true,
      onUpdate(self) {
        approach = self.progress;
        paint();
      },
      // `onUpdate` does not fire once the reader is past the window, so the terminal values
      // are written here. Without these the row would hold its last in-window pose for the
      // whole of the traverse.
      onLeave() {
        approach = 1;
        paint();
      },
      onLeaveBack() {
        approach = 0;
        paint();
      },
    });

    if (m.distance > 0) {
      ScrollTrigger.create({
        trigger: stage,
        start: "top top",
        // The traverse's own length — the track's overflow divided by the pace — and then
        // the door's floor. Reserve less scroll than the track has travel and each px of
        // scrolling moves the track TRAVEL_PER_SCROLL px. At 1 that is the reference's own
        // relation, px for px; it ships at 1.5. That is the whole of the speed control, and
        // it is the only thing it touches: `traverse` is still 0→1 across the first part of
        // the pin, so the paint above is unchanged.
        //
        // A function, so a resize, a rotation or a collapsing mobile URL bar reserves the
        // right distance on the next refresh; `onRefreshInit` below re-reads `m` before
        // ScrollTrigger evaluates this.
        end: () => `+=${pinPx()}`,
        pin: true,
        pinSpacing: true,
        scrub: SCRUB,
        // Engages the pin a frame early, which stops a smooth-scrolled page showing a
        // one-frame jump as the stage changes over to being pinned.
        anticipatePin: 1,
        animation: driver,
        // Every figure the paint uses is viewport-relative, so a resize invalidates all of
        // them — and a refresh does not imply a scroll event, so without the repaint the
        // track would hold its pre-resize geometry until the reader next moved.
        onRefreshInit() {
          m = measureCases(refs);
        },
        onRefresh(self) {
          traverse = clamp01(driver.progress() / traverseFrac());
          advance(self.progress);
        },
        onUpdate(self) {
          advance(self.progress);
        },
        onLeave() {
          advance(1);
        },
        onLeaveBack() {
          advance(0);
        },
      });
    }

    // The first frame, so the resting composition is correct before any scrolling.
    paint();

    // The cue's tween is created later, from a callback, so the matchMedia context never
    // collected it — same reason `hero/sequence` kills its two by hand.
    return () => door.kill();
  });

  // Reverts every breakpoint's tweens and start states and disconnects the media queries.
  // The whole cleanup.
  return () => mm.kill(true);
}
