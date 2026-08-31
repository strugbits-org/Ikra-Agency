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
 * Pinned with ScrollTrigger's own `pin` (not CSS `sticky`/`fixed`, which don't work under
 * ScrollSmoother's transform-based scroll) — and `pin: true` with GSAP's own pinSpacing
 * rather than a hand-written section height, because the pin's length here is measured
 * (track overflow / TRAVEL_PER_SCROLL, plus the door's floor) rather than designed.
 *
 * Two triggers feed one paint: the pin drives the traverse, a second smaller trigger drives
 * the section's vertical approach (it runs before the pin engages). The rise reads the
 * lesser of the two, so whichever is behind is in charge and they can't drift apart.
 *
 * The door is the one thing on a clock rather than a scrubbed position — see DOOR_SECONDS
 * in ./timeline for why, and hero/flooredCue for the shape. It starts only after the
 * traverse ends, so it's a clock over a separate moment, not the same one.
 *
 * Deliberately absent (measured out of the reference, not left out — see ./timeline): inner
 * parallax, card scale, scrim, per-line stagger, exit animation on cells; on the door, no
 * crossfade, scale or drift on the panel behind it.
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

  // Below `md`, CaseStudies.tsx never calls this — it renders the static column reduced
  // motion also uses. Kept as a matchMedia (not a plain `if`) so a resize into that range
  // tears the pin down cleanly instead of leaving it pinned against a stale layout.
  mm.add(MQ.isWide, () => {
    const stage = refs.stage.current;
    const track = refs.track.current;
    const section = refs.section.current;
    const revealWindow = refs.revealWindow.current;
    const revealPanel = refs.revealPanel.current;
    if (!stage || !track || !section || !revealWindow || !revealPanel) return;

    const contents = refs.contents.current;
    const rise = gsap.parseEase(RISE_EASE);
    // Parsed once — the paint calls it every frame.
    const doorCurve = gsap.parseEase(DOOR_EASE);

    let m: CaseMeasure = measureCases(refs);
    // 0 a screen below, 1 when the section's top edge reaches the viewport top — the same
    // instant the pin engages.
    let approach = 0;
    // 0 when the pin engages, 1 when the track's right edge reaches the viewport's right edge.
    let traverse = 0;
    /**
     * How far past the traverse's end the reader has scrolled, in vh. Not clamped at zero:
     * negative still lets the cue measure distance since the last direction flip, which it
     * needs to bleed off its rebase offset.
     */
    let doorVh = 0;

    /** The pin's whole length in px: the traverse, then the door's floor. */
    const traversePx = () => m.distance / TRAVEL_PER_SCROLL;
    const pinPx = () => traversePx() + (DOOR_VH / 100) * m.viewportH;
    /**
     * Where the traverse ends, as a fraction of the pin. The pin is now longer than the
     * traverse, so the driver's 0→1 must be rescaled against this to land on the same marks
     * the old, doorless pin did.
     */
    const traverseFrac = () => {
      const total = pinPx();
      return total > 0 ? traversePx() / total : 1;
    };
    /** The pin's progress, restated as the door's own position. */
    const doorVhAt = (p: number) =>
      ((p * pinPx() - traversePx()) / m.viewportH) * 100;

    /**
     * The exit: a clock bounded by the scroll. Below the crossover (DOOR_VH / DOOR_SECONDS)
     * the clock leads and one scroll plays the whole slide; above it the floor leads and it
     * finishes in whatever distance is left — either way done by the end of DOOR_SPAN. See
     * hero/flooredCue, imported rather than reimplemented since its rebase-on-reversal is
     * easy to get wrong twice.
     */
    const door = createFlooredCue({
      span: DOOR_SPAN,
      seconds: DOOR_SECONDS,
      reverseSpeed: DOOR_REVERSE_SPEED,
      onUpdate: () => paint(),
    });

    /**
     * Which way the reader is going: 1 down, −1 up. A Schmitt trigger on travel rather than
     * one frame's delta — see DIR_FLIP_VH. `dirPeak` tracks the furthest point since the
     * last flip. The reversal re-anchors the cue on what's on screen, or the clock/floor
     * swap would pay the whole gap between them in one frame.
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

    // Normalised so every cell still reaches 1 by the end of the approach — only the order
    // is staggered.
    const spread = 1 + PRE_STAGGER * Math.max(0, m.cellLeft.length - 1);

    /** One frame, from the three positions. */
    const paint = () => {
      const V = m.viewportW;
      const d = traverse * m.distance;

      /**
       * How far the case-studies layer has slid left, in px. `read` is safe to call more
       * than once a frame (no-op the second time). The ease is applied here, not on the
       * cue's tween — createFlooredCue's contract, since the clock/floor comparison needs
       * raw progress.
       */
      const doorX = doorCurve(door.read(doorVh, scrollDir)) * DOOR_TRAVEL_FRAC * V;

      gsap.set(track, { x: -(d + doorX), force3D: true });

      /**
       * The reveal: a window and a counter-translate, not a clip. The window starts one
       * viewport right and slides left, clipping its contents to exactly the strip the door
       * has vacated; the panel inside is translated back by the same amount so it holds
       * still on screen — matches the reference to the pixel in both directions.
       *
       * Two transforms rather than an animated `clip-path`, which isn't composited and
       * would repaint a full screen of type every frame — same trick as placePhoto's
       * counter-scale.
       *
       * The field itself never moves — it's the section's own vertical-gradient
       * background, so sliding it would be invisible. See ./timeline on why neither edge
       * needs a seam bleed.
       */
      gsap.set(revealWindow, { x: V - doorX, force3D: true });
      gsap.set(revealPanel, { x: doorX - V, force3D: true });

      // Off-screen isn't out of the tab order: while the door is shut, the panel's form sits
      // a viewport to the right, invisible but still tabbable. `inert` removes the whole
      // subtree from focus, hit-testing and the accessibility tree at once.
      //
      // Set here rather than in markup, so a JS failure leaves the form reachable rather
      // than permanently disabled. Guarded to avoid touching the DOM every scroll frame.
      const shut = doorX <= 0;
      if (revealPanel.inert !== shut) revealPanel.inert = shut;

      // The layer in front must stop taking clicks once it's gone. The track paints above
      // the reveal and is transparent past the last cell, so without this a click meant for
      // the form would hit a case-study cell instead.
      const gone = doorX > 0;
      const pe = gone ? "none" : "";
      if (track.style.pointerEvents !== pe) track.style.pointerEvents = pe;

      for (let i = 0; i < m.cellLeft.length; i++) {
        // `d`, not `d + doorX`: the rise is keyed to where a cell sits during the traverse,
        // and the door happens after every cell has already settled.
        const left = m.cellLeft[i] - d;

        // Horizontal approach: starts as the cell's left edge crosses the viewport's right
        // edge, finishes at RISE_END_VW. Clamped so a cell outside its window holds the
        // endpoint pose.
        const horizontal = clamp01((V - left) / (V * (1 - RISE_END_VW)));
        // Vertical approach, staggered by cell — see PRE_STAGGER.
        const vertical = clamp01(approach * spread - i * PRE_STAGGER);

        // The lesser of the two is in charge: before the pin, cells on screen would
        // otherwise read a finished horizontal approach with no entrance; after it,
        // `vertical` is 1 and the traverse has sole charge.
        //
        // Plain `y`, not `yPercent` — GSAP 3.15 drops a percentage translate when it's the
        // only transform on the element, so `yPercent` silently no-oped here. See
        // CaseMeasure.contentH.
        gsap.set(contents[i], {
          y: RISE_FRAC * m.contentH[i] * (1 - rise(Math.min(horizontal, vertical))),
          force3D: true,
        });
      }
    };

    /**
     * One scroll position, turned into everything the door needs. Split out of `onUpdate`
     * because it has four callers: the scroll, a refresh, and the two edges — a pinned
     * trigger stops firing `onUpdate` once past it, so without the edges the door would
     * hold its last pose.
     */
    const advance = (p: number) => {
      doorVh = doorVhAt(p);
      trackDirection(doorVh);
      // Past the far end it must be open regardless of direction; before the near end,
      // shut. Between the two, direction decides — what makes the reverse its own gesture.
      door.aim(doorVh >= DOOR_VH ? 1 : doorVh <= 0 || scrollDir < 0 ? 0 : 1);
      paint();
    };

    // A proxy tween: numeric `scrub` only smooths an *animation's* progress, so a trigger
    // with just an `onUpdate` gets the raw stepped scroll. Driving this scalar and painting
    // from its onUpdate is what makes SCRUB mean what it says.
    //
    // The door deliberately does not read this — its floor has to be the real scroll
    // position, since the pin releases on real scroll and a value up to a second behind
    // would let a fast reader out before the guarantee catches up. `advance` reads the
    // trigger's own raw progress.
    //
    // Also rules out `invalidateOnRefresh`: it re-records a tween's start from wherever the
    // target currently is, so a mid-scroll refresh would leave this running 0.5→1 over the
    // whole pin. Nothing here needs it — measurements re-read in onRefreshInit, and `end`
    // is itself a function re-evaluated on every refresh.
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

    // The approach: ends exactly where the pin begins, scrubbed rather than cued so a fast
    // scroll can't catch it half-played.
    ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      end: "top top",
      scrub: true,
      onUpdate(self) {
        approach = self.progress;
        paint();
      },
      // onUpdate doesn't fire past the window, so the terminal values are written here —
      // otherwise the row holds its last in-window pose through the whole traverse.
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
        // Traverse length (track overflow / pace) plus the door's floor. A function, so a
        // resize, rotation, or collapsing mobile URL bar reserves the right distance on the
        // next refresh — onRefreshInit below re-reads `m` before this is evaluated.
        end: () => `+=${pinPx()}`,
        pin: true,
        pinSpacing: true,
        scrub: SCRUB,
        // Engages a frame early, so a smooth-scrolled page doesn't show a jump as the stage
        // pins.
        anticipatePin: 1,
        animation: driver,
        // Every figure the paint uses is viewport-relative, so a resize invalidates all of
        // them; a refresh doesn't imply a scroll event, so without this the track holds
        // stale geometry.
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

    // First frame, so the resting composition is correct before any scrolling.
    paint();

    // The cue's tween is created in a callback, so the matchMedia context never collected it.
    return () => door.kill();
  });

  // Reverts every breakpoint's tweens/start states and disconnects the media queries.
  return () => mm.kill(true);
}
