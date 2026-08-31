import type { RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import {
  DOOR_REST_Y,
  DOOR_SEALED_AT,
  doorDrift,
  doorsFor,
  holeClip,
} from "./doors";
import { BAND_CLOSED, BAND_FULL, BAND_UNDRAWN, bandClip } from "./band";
import { BACKGROUND_VISIBLE_AT_DOOR } from "./footage";
import { createFlooredCue } from "./flooredCue";
import { heroWash } from "./handoff";
import { STACK_IN, STACK_OUT, leadSeat, leapSeat, stackSeat } from "./seats";
import {
  // ── RESTORE THE WAVE — step 5 of 5 ── uncomment with `bandClear` below.
  // BAND_CLEAR_AT,
  BAND_CLOSE_AT,
  BAND_DRAW_AT,
  BAND_DRAW_SECONDS,
  BAND_HIDE_SECONDS,
  BAND_REVERSE_SPEED,
  BAND_UNDRAW_AT,
  CLOSE_END,
  CLOSE_REVERSE_SPEED,
  CLOSE_SPAN,
  CLOSE_SEALED_P,
  CLOSE_SECONDS,
  DOOR_CLOSE_AT,
  DOOR_OPEN_AT,
  GAP_LINES,
  LEAP_AT,
  LEAP_IN_VH,
  OPEN_REVERSE_SPEED,
  OPEN_SECONDS,
  OPEN_SPAN,
  PIN_VH,
  SEAL_AT,
  SEAL_OVERSHOOT,
  ramp,
} from "./timeline";

/**
 * Everything the sequence drives, as refs rather than resolved elements — the ribbon and
 * closing line mount after the stage is measured, so both may still be null when this
 * runs. The last three are latches, not elements.
 */
export type SequenceRefs = {
  stage: RefObject<HTMLDivElement | null>;
  headline: RefObject<HTMLParagraphElement | null>;
  panelLeft: RefObject<HTMLDivElement | null>;
  panelRight: RefObject<HTMLDivElement | null>;
  content: RefObject<HTMLDivElement | null>;
  gapLines: RefObject<(HTMLParagraphElement | null)[]>;
  ribbon: RefObject<HTMLDivElement | null>;
  leap: RefObject<HTMLDivElement | null>;
  gray: RefObject<HTMLDivElement | null>;
  bgVideo: RefObject<HTMLVideoElement | null>;
  clipVideo: RefObject<HTMLVideoElement | null>;
  /** Latched because play() is asynchronous: `paused` still reads stale next frame. */
  bgCovered: RefObject<boolean>;
  /** Latched for the same reason as bgCovered. */
  clipSealed: RefObject<boolean>;
  /** False until the load timeline has finished, which gates every phase here. */
  introDone: RefObject<boolean>;
  /**
   * Written by this module, called by the load timeline the instant it lands — the
   * entrance and the scroll sequence run on two clocks that can't see each other, and a
   * scroll event can't be relied on to arrive right after the entrance finishes.
   */
  catchUp: RefObject<(() => void) | null>;
  /**
   * The other direction of that hand-off: written by the load timeline, called from here
   * once the reader scrolls past the opening's first mark. The stage is frozen until the
   * entrance lands, so scroll piles up underneath it — and a scrubbed opening reads from
   * position rather than playing from the start, so without this the hand-off paints the
   * doors wherever the reader has already reached.
   */
  hurryIntro: RefObject<(() => void) | null>;
};

/**
 * The one scroll-driven sequence: one stage, one ScrollTrigger, so scrolling back up
 * reverses every phase. Beat-by-beat map in ./timeline.
 *
 * Cued and scrubbed beats are mixed here: each cue drives a tween over a plain number,
 * scrolling advances `lastVh`, and `paintStage` is the only thing that reads either — so
 * every frame is rendered from whichever moved. Cues are confined to the tail (ribbon,
 * door close, wash); the front of the section is scrubbed, because a cue lands at a
 * different mark on every pass and anything measured from that landing inherits the
 * reader's speed (the opening used to be cued — see ./timeline for what that broke).
 *
 * A plain function, not a hook — the caller owns the effect; everything created here is
 * collected by the returned context.
 */
export function createHeroSequence(
  section: HTMLElement,
  box: HTMLDivElement,
  refs: SequenceRefs,
) {
  return gsap.context(() => {
    // Tells DefinitionSection's statement to arrive on this section's wash — see ./handoff.
    heroWash.active = true;

    /**
     * Below `md`, the doors' floored cues read scroll position through this rather than
     * raw `vh`. There's no ScrollSmoother easing below that breakpoint (see
     * SmoothScrollProvider), so a real touch swipe — especially momentum after the finger
     * lifts — delivers `vh` with only one damping stage instead of two, moving through the
     * doors' span fast enough that the swing that reads as a swing on desktop reads as an
     * instant snap on a phone.
     *
     * A plain exponential toward `vh`, not a hard cap: it decays back onto the raw value
     * once the reader holds still, at the rate it fell behind, rather than leaving the
     * doors permanently offset after a long fast scroll.
     *
     * DOOR_SMOOTH_TAU is a starting figure, not a measured one — no synthetic input
     * reproduces a phone's native fling closely enough to tune it properly. Raise it if
     * the doors still snap open; lower it if the swing reads as sluggish.
     */
    const doorVhSmoothing = window.matchMedia("(max-width: 767.98px)").matches;
    const DOOR_SMOOTH_TAU = 0.4;
    let doorVh = 0;
    let doorVhTime = gsap.ticker.time;
    function readDoorVh(vh: number) {
      if (!doorVhSmoothing) return vh;
      const dt = Math.max(0, gsap.ticker.time - doorVhTime);
      doorVhTime = gsap.ticker.time;
      doorVh += (vh - doorVh) * (1 - Math.exp(-dt / DOOR_SMOOTH_TAU));
      return doorVh;
    }

    // The ribbon, kept off the scrub entirely (see BAND_DRAW_AT), driven as one number
    // sweeping BAND_UNDRAWN → BAND_FULL → BAND_CLOSED (see bandClip).
    //
    // Interruptible and continuous rather than three discrete tweened states: a scroll
    // fast enough to cross both marks inside one tween used to retarget a half-drawn wave
    // at the opposite pinch, jumping it across the screen. An uninterruptible queue fixed
    // that but could leave a move still playing 1.4s after the reader had passed it.
    const band = { w: BAND_UNDRAWN };
    let bandTo: number = BAND_UNDRAWN;
    let bandTween: gsap.core.Tween | null = null;

    // The two legs run at different speeds, so a sweep spanning both costs the sum of
    // what it covers in each — and reversing is quicker than either (see
    // BAND_REVERSE_SPEED). Proportional to ground left, so a reversal runs back at the
    // rate it came out at.
    const sweepSeconds = (from: number, to: number) => {
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      const drawing = Math.max(0, Math.min(hi, 0) - Math.min(lo, 0));
      const closing = Math.max(0, Math.max(hi, 0) - Math.max(lo, 0));
      const secs = drawing * BAND_DRAW_SECONDS + closing * BAND_HIDE_SECONDS;
      return to < from ? secs / BAND_REVERSE_SPEED : secs;
    };

    function sweepBand(to: number) {
      if (to === bandTo) return;
      bandTo = to;
      bandTween?.kill();
      bandTween = gsap.to(band, {
        w: to,
        duration: sweepSeconds(band.w, to),
        // Ease applied on read, not here — an eased tween retargeted mid-flight re-eases
        // from its new start, which would stutter on interruption.
        ease: "none",
        onUpdate: paintStage,
        overwrite: "auto",
      });
    }

    // Applied on read, so the wipe eases out as it lands and in as it leaves, same as the
    // two separate tweens it replaced.
    const BAND_IN = gsap.parseEase("power2.out");
    const BAND_OUT = gsap.parseEase("power2.in");

    /**
     * The orange→gray turn-over. Read straight off the close's own progress, not a clock
     * of its own — the wash sits at z-25 over the doors at z-10, so as a separate cue any
     * door travel while it was still opaque was invisible, and which of the two clocks won
     * depended on scroll speed (hiding half the opening at a reading pace, all of it at
     * 120vh/s).
     *
     * Tied to `closeP`, the gray is at zero exactly when the panels part and at one
     * exactly when they meet, at every speed and in both directions — one clock can't
     * drift against itself. `sine.inOut` on the read, since a full-screen colour change
     * has to leave and arrive at zero velocity.
     */
    const GRAY_EASE = gsap.parseEase("sine.inOut");

    // The doors' return, cued (DOOR_CLOSE_AT) where the opening is scrubbed — deliberate
    // asymmetry: a cue lands at a scroll-speed-dependent mark, which is ruinous when
    // something downstream is measured from it and free here, since the close is the last
    // thing in the section and the wash rides its progress directly (CLOSE_SEALED_P)
    // rather than a mark of its own.
    //
    // One cue, not two — splitting it across two scrolls was tried and reverted: the marks
    // sit about a notch apart, well inside the first leg's own duration, so the second
    // gesture retargeted a tween still in flight and skipped the end of the travel.
    //
    // `power2.inOut` applied on read (CLOSE_EASE below), not on the tween, so the clock
    // and the scroll floor compare on the same raw progress and an interrupted run doesn't
    // re-ease from wherever it was caught. Floored against CLOSE_SPAN rather than left as a
    // bare cue — a bare cue costs no designed scroll, so the close was reliably cut off
    // (1.15s of move with 4vh behind it). See CLOSE_VH.
    const close = createFlooredCue({
      span: CLOSE_SPAN,
      seconds: CLOSE_SECONDS,
      reverseSpeed: CLOSE_REVERSE_SPEED,
      onUpdate: () => paintStage(),
    });

    // --- The opening: one path, a clock on it, and a floor under it ---
    // `cue.p` is the timed half: crossing SEAL_AT sends it to 1 over OPEN_SECONDS, so one
    // scroll of any size plays the whole opening. paintStage takes
    // `max(cue.p, ramp(vh, OPEN_SPAN))`, so the move may run ahead of the scroll and never
    // behind it — the doors are open by DOOR_OPEN_AT whatever the reader does. See OPEN_VH.
    const opening = createFlooredCue({
      span: OPEN_SPAN,
      seconds: OPEN_SECONDS,
      reverseSpeed: OPEN_REVERSE_SPEED,
      onUpdate: () => paintStage(),
    });

    let lastVh = 0;
    /**
     * Which way the reader is going: 1 down, −1 up. Stored rather than read off
     * `self.direction`, which flips on a single frame's delta — under ScrollSmoother that
     * sign wobbles for about a second after a gesture ends, and each flicker used to
     * retarget the opening's cue before it had barely started, so the doors never got to
     * close and instead jittered until the scroll ceiling snapped them shut in one frame.
     *
     * A Schmitt trigger on travel instead: direction only flips once the scroll has
     * actually moved DIR_FLIP_VH against it, measured from the turn rather than from
     * wherever the last event landed.
     */
    let scrollDir = 1;
    let dirPeak = 0;
    /** Reversal threshold, in vh — above a wheel notch, above the smoother's settling wobble. */
    const DIR_FLIP_VH = 3;

    /**
     * A reversal re-anchors both cues on what is currently on screen, so the swap from
     * floor to ceiling inside each cannot move anything (see createFlooredCue). Both, not
     * just one — a reader coming back up out of DefinitionSection crosses the close's
     * reversal while the opening is still parked wide open, so rebasing only one leaves
     * the other holding a stale offset.
     */
    function trackDirection(vh: number) {
      if (scrollDir > 0) {
        if (vh > dirPeak) dirPeak = vh;
        else if (vh < dirPeak - DIR_FLIP_VH) {
          scrollDir = -1;
          dirPeak = vh;
          // The smoothed value, not raw `vh` — `.read()` goes on computing its ramp from
          // the smoothed value from here on (see readDoorVh), so rebasing against raw vh
          // would reopen the one-frame jump `offset` exists to prevent.
          opening.rebase(readDoorVh(vh));
          close.rebase(readDoorVh(vh));
        }
      } else {
        if (vh < dirPeak) dirPeak = vh;
        else if (vh > dirPeak + DIR_FLIP_VH) {
          scrollDir = 1;
          dirPeak = vh;
          opening.rebase(readDoorVh(vh));
          close.rebase(readDoorVh(vh));
        }
      }
    }

    /**
     * The ease both legs of the opening are shaped by, so each leaves and arrives at
     * rest. Parsed once — paintStage calls it twice a frame. Per leg, not across the
     * pair: the seal has to stop before the panels start, or the footage would still be
     * closing as the orange parted over it.
     */
    const LEG_EASE = gsap.parseEase("power2.inOut");

    /**
     * The close's own shape. Applied on read, not on the tween — the floor under the
     * close is linear in scroll, so easing the tween alone would shape the clock and
     * leave the floor unshaped, making which one was leading visible as a speed change.
     */
    const CLOSE_EASE = gsap.parseEase("power2.inOut");

    /**
     * The close's raw progress at which the panels meet — CLOSE_SEALED_P run back through
     * CLOSE_EASE. The wash spans against this rather than the eased position: against the
     * eased value it inherits the close's curve *and* stacks its own on top, which
     * stretched the last 1% of the gray across 5.3vh — long enough to look finished while
     * the next section's statement was still uncued. Against raw progress that stretch is
     * 1.3vh, with the arrival still at zero velocity from the sine.
     *
     * Solved by bisection rather than inverted in closed form, so it tracks CLOSE_EASE
     * rather than going stale beside it.
     */
    const CLOSE_SEALED_RAW = (() => {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (CLOSE_EASE(mid) < CLOSE_SEALED_P) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    })();

    /**
     * The path fraction at which a gap first appears between the panels. They overlap
     * until DOOR_SEALED_AT of their travel, so the hole's closing has to be timed against
     * that mark rather than the leg's start, or the two are half a second apart with
     * nothing on screen between them (see SEAL_OVERSHOOT).
     *
     * Solved by bisection rather than inverting `power2.inOut` in closed form, so it
     * follows LEG_EASE rather than going stale beside it.
     */
    const APERTURE_AT = (() => {
      let lo = 0;
      let hi = 1;
      for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (LEG_EASE(mid) < DOOR_SEALED_AT) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    })();

    /** Where the hole finishes closing: just past the gap opening, never before it. */
    const SEAL_END = Math.min(1, APERTURE_AT * (1 + SEAL_OVERSHOOT));

    /**
     * The viewport, cached rather than read per paint. `paintStage` runs on every scroll
     * event and every frame of up to five tweens, and `clientWidth`/`innerHeight` can each
     * force a synchronous layout — reading them per paint charged a layout exactly when
     * frames are scarcest. Re-read on ScrollTrigger's own refresh, which a resize already
     * fires.
     */
    let W = document.documentElement.clientWidth;
    let H = window.innerHeight;

    function paintStage() {
      const vh = lastVh;

      // Where the opening has got to: the timed move or the scroll, whichever is further
      // on in the direction being travelled. The clock leads at ordinary speeds, the
      // scroll leads once outrun, and the two are continuous since both head for the same
      // end. See OPEN_VH.
      //
      // Direction is why this isn't a plain `max`: a floor can only push the path further
      // open, so without direction the way back up scrubbed across the whole 52vh span —
      // five notches to shut a door that took one to open. Going up, the same ramp has to
      // act as a ceiling instead.
      //
      // The offset inside the cue holds the ramp on the doors' own position across a
      // reversal and bleeds off as the reader commits — without it the swap pays the
      // clock/scroll gap in a single frame.
      const pathP = opening.read(readDoorVh(vh), scrollDir);

      // The two legs of that one path, overlapping rather than sequential: the panels run
      // the whole path, the hole closes across the part that ends as the aperture appears,
      // so the footage hands over with no bare orange in between (see SEAL_OVERSHOOT).
      const sealP = LEG_EASE(gsap.utils.clamp(0, 1, pathP / SEAL_END));
      const openP = LEG_EASE(pathP);

      // --- Phase 1: the hole seals over the footage (the first 28% of the path) ---
      // Only the window closes, in width — the box itself is neither scaled nor moved. A
      // clip costs no layout work, and this owns it outright; the load timeline animates
      // opacity only and leaves the hole open, so sealP = 0 is the entrance's own state.
      // `visibility` alongside the clip because a zero-width `inset()` isn't reliably zero
      // pixels — the box is sized in vw, so the two halves can round apart and paint a
      // one-pixel column of footage over the panels. See holeClip for why closing the hole
      // past centre isn't available instead.
      gsap.set(box, {
        clipPath: holeClip(sealP),
        visibility: sealP >= 1 ? "hidden" : "visible",
      });

      // Same driver rather than its own window, so the copy is gone the exact moment the
      // hole seals.
      gsap.set(refs.headline.current, { opacity: 1 - sealP });

      // Nothing of this footage is on screen for the remaining nine-plus viewports of the
      // pin.
      const clip = refs.clipVideo.current;
      if (clip) {
        const shut = sealP >= 1;
        if (shut !== refs.clipSealed.current) {
          refs.clipSealed.current = shut;
          if (shut) clip.pause();
          else void clip.play().catch(() => { });
        }
      }

      // --- Phase 3: the doors, and the copy they hand over to ---
      // How far open they are — one number off one span, no resting place partway (see
      // OPEN_VH for why that went).
      const doorP = openP;

      // The aperture, not the panels: they're DOOR_PANEL_W wide each, so they overlap
      // until DOOR_SEALED_AT and nothing has opened before that. 0 the instant a gap
      // appears, 1 when the doors come to rest — the exact span the lead line grows across
      // (see leadSeat). Derived from the same `doorP` the panels use, so whatever drives
      // them drives the line identically.
      const gapP = ramp(doorP, [DOOR_SEALED_AT, 1]);

      // Every line passes through the same centre seat, rising as the one before leaves
      // (see stackSeat) — except the lead line, which grows into it with the doors. Driven
      // straight off GAP_LINES so the choreography is identical across all of them.
      //
      // Read off raw `vh` rather than a clock of its own — the old shape measured the
      // copy's window from wherever a cued opening had come to rest, which drifted with
      // scroll speed and, squeezed past its compression cap, let lines begin arriving
      // before the doors had even stopped. Now the doors rest at a fixed mark (see the
      // scrubbing note in ./timeline), so these windows hold at any scroll speed.
      for (let i = 0; i < GAP_LINES.length; i++) {
        const line = GAP_LINES[i];
        const outP = STACK_OUT(ramp(vh, line.out));
        gsap.set(
          refs.gapLines.current[i],
          line.in
            ? stackSeat(H, STACK_IN(ramp(vh, line.in)), outP)
            : leadSeat(H, gapP, outP),
        );
      }

      // Each line owns its own opacity, so the container's only job is to stay hidden
      // until the first paint has seated them.
      gsap.set(refs.content.current, { opacity: 1 });

      // --- Phase 4: the ribbon draws in, holds, and clears ---
      // Not scrubbed: each end of the span fires a tween that runs to completion on its
      // own clock, so the wedges are always at rest before it starts and can't be left
      // frozen half-drawn.
      //
      // Two marks, picked by travel direction: the wave commits at BAND_DRAW_AT going down
      // and lets go at the higher BAND_UNDRAW_AT coming back up — one mark can't do both
      // (see BAND_UNDRAW_AT).
      //
      // Keyed to `scrollDir`, not to the latch — keying to `bandTo` looks like hysteresis
      // and is its inverse, since the release mark sits above the commit mark: un-drawing
      // would drop the test below the commit mark, redrawing every frame. Direction is
      // stable across a stopped scroll, so this can't oscillate.
      sweepBand(
        vh >= BAND_CLOSE_AT
          ? BAND_CLOSED
          : vh >= (scrollDir < 0 ? BAND_UNDRAW_AT : BAND_DRAW_AT)
            ? BAND_FULL
            : BAND_UNDRAWN,
      );

      // The wipe, eased, and how much ribbon that leaves on screen.
      //
      // ── RESTORE THE WAVE — step 5 of 5 ── uncomment `bandVis` here and the
      // `bandClear` gate further down, and put `bandClear` back inside the `Math.min`
      // on the closing line's arrival. While the ribbon is commented out there is no
      // wave in that seat to keep the line off, and the gate would only hold it back.
      const wipe = band.w < 0 ? BAND_IN(1 + band.w) - 1 : BAND_OUT(band.w);
      // const bandVis = 1 - Math.abs(wipe);
      if (refs.ribbon.current) {
        gsap.set(refs.ribbon.current, { clipPath: bandClip(wipe) });
      }

      // The panels, on `doorP` going out and closing again on scroll at the end. Each
      // slides out while drifting vertically, the drift finishing ahead of the slide
      // (hence `/0.7`).
      //
      // The close is not a second animation: `doorNow` is the opening's own progress
      // scaled back to zero, so the panels retrace the exact path they came out on. The
      // copy rides `doorP`, not this — it must stay gone while the doors return, not play
      // itself backwards.
      //
      // Eased on read, same reasoning as the opening. Both forms are needed: the eased one
      // is where the panels are, the raw one is linear in scroll and is what the wash
      // spans against (see CLOSE_SEALED_RAW).
      const closeRaw = close.read(readDoorVh(vh), scrollDir);
      const closeP = CLOSE_EASE(closeRaw);
      const doorNow = doorP * (1 - closeP);
      // Shaped, not linear, so a panel's short edge can't climb into frame while the two
      // are still overlapped — see doorDrift.
      const drift = doorDrift(doorNow);
      // Read per frame off the measured width: below DOOR_NARROW_MAX_W the panels travel
      // further, but DOOR_SEALED_AT is held across both geometries by construction (see
      // doorsForAperture), so doorP/drift and everything keyed to them are the same
      // numbers at every width.
      const doors = doorsFor(W);
      gsap.set(refs.panelLeft.current, {
        x: -doorNow * W * doors.restX,
        y: drift * H * DOOR_REST_Y,
      });
      gsap.set(refs.panelRight.current, {
        x: doorNow * W * doors.restX,
        y: -drift * H * DOOR_REST_Y,
      });

      // --- Phase 5: the closing line, arriving on scroll and leaving with the doors ---
      // Seated where the ribbon was, not below it, so the wave resolves into the words. It
      // arrives like the gap copy but recedes instead of fading (see leapSeat), scaling to
      // nothing as the panels shut so it reads as being drawn back through the closing gap.
      //
      // The exit is the close's own progress rescaled to reach 1 at the seal — no
      // STACK_OUT, no window of its own in vh, since a scroll window would come unstuck
      // from a close that no longer costs scroll.
      //
      // Its arrival is the lesser of the scroll's ramp and how far the ribbon has actually
      // gone — the second term keeps them off each other at speed, since a ramp alone
      // (tuned against the close's 0.5s clock) left the line fully seated at 90vh/s while
      // the wave was still closing through the same seat. Reading the wave directly holds
      // the hand-over at every speed, in both directions.
      //
      // `BAND_CLEAR_AT` rather than `1 - bandVis` because they share one seat: a line at
      // half strength under a half-gone wave is still two things in one place. The gate
      // stays shut until the wave is most of the way out, then opens quickly.
      //
      // ── RESTORE THE WAVE — step 5 of 5 ── uncomment `bandClear` and wrap the
      // arrival back in `Math.min(..., bandClear)`. Everything the two paragraphs
      // above describe is about sharing the seat with a wave; with the ribbon
      // commented out the seat is the line's alone, and the arrival is now the copy
      // family's own (see LEAP_AT). The exit below is untouched either way.
      // const bandClear = ramp(1 - bandVis, BAND_CLEAR_AT);
      gsap.set(
        refs.leap.current,
        leapSeat(
          H,
          STACK_IN(ramp(vh, [LEAP_AT, LEAP_AT + LEAP_IN_VH])),
          gsap.utils.clamp(0, 1, closeP / CLOSE_SEALED_P),
        ),
      );

      // --- Phase 6: orange turns over to gray, on the close's own progress ---
      // Spanning exactly the stretch where the panels are overlapped, so the gray arrives
      // where there's nothing else to look at and is gone the instant there is — what
      // keeps the reopening visible at every scroll speed (see GRAY_EASE).
      //
      // Against `closeRaw`, not `closeP` — easing on top of the close's own curve
      // stretched the last percent of the gray across 5.3vh, long enough to look finished
      // before the next section's statement was cued. See CLOSE_SEALED_RAW.
      const washP = GRAY_EASE(ramp(closeRaw, [CLOSE_SEALED_RAW, 1]));
      // Published so DefinitionSection's statement can arrive on this clock rather than on
      // a scroll mark the clock is free to outrun — see ./handoff.
      heroWash.p = washP;
      gsap.set(refs.gray.current, {
        opacity: washP,
      });

      // A 1080p decode isn't free, so the footage only runs while some of it can be seen —
      // covers both ends of the sequence.
      const bg = refs.bgVideo.current;
      if (bg) {
        const covered = doorNow < BACKGROUND_VISIBLE_AT_DOOR;
        if (covered !== refs.bgCovered.current) {
          refs.bgCovered.current = covered;
          if (covered) bg.pause();
          // Rejects if the browser declines to autoplay — not something to act on, since
          // the still underneath is the fallback.
          else void bg.play().catch(() => { });
        }
      }
    }

    /**
     * One frame of the sequence, from whatever `lastVh` currently says. Split out of
     * `onUpdate` so it has two callers: the ordinary scroll, and the load timeline landing
     * (see refs.catchUp) — without the second, the hand-off between the two clocks could
     * be dropped entirely.
     *
     * Short now — the opening used to be three cued stops along a timed path dispatched
     * from here; `paintStage` reads all three legs straight off the scroll now, so the
     * only thing left to dispatch is the tail's cues.
     */
    function advance() {
      const vh = lastVh;

      // The opening's clock, the one cue at this end of the section. Held at 0 until the
      // reader has actually scrolled — `advance` also runs at creation and on every
      // refresh, and firing there would play the whole opening at scroll zero.
      //
      // Direction decides it only inside the opening's own span: past DOOR_OPEN_AT the
      // doors are simply open (a reversal there shouldn't start shutting them mid-section);
      // below SEAL_AT they're simply shut. Only between the two does a reversal mean the
      // reader is walking the opening backwards.
      opening.aim(
        vh >= DOOR_OPEN_AT ? 1 : vh < SEAL_AT || scrollDir < 0 ? 0 : 1,
      );

      // The logo would end up over the revealed background, so this took it ink → white
      // straddling the seal. Disabled for now: the logo stays ink for the whole scroll.
      // Uncomment to restore the color swap.
      // gsap.set(logoEl, {
      //   backgroundColor: gsap.utils.interpolate(
      //     "#390303",
      //     "#ffffff",
      //     ramp(vh, [SEAL_AT, SEAL_AT + 30]),
      //   ),
      // });

      // Phases 1–3 in full — the opening's legs and the gap copy, read straight off the
      // scroll — plus whatever the tail's cued tweens currently say.
      paintStage();

      // --- Phase 4: the ribbon — cued in paintStage, off the scroll.
      // --- Phase 5/6: the closing line and the wash — both painted in paintStage, off
      // the close's progress rather than scroll.

      // --- the doors close (cued, with a floor under it) ---
      // A threshold crossed in either direction, so scrolling back up parts them again on
      // the same move played backwards. Below the crossover the clock plays the whole
      // 1.15s; above it the scroll finishes the job — but the panels are shut by the end
      // of CLOSE_SPAN either way.
      //
      // The wash rides this rather than a mark of its own, so the gray follows the panels
      // meeting at every speed — also why it's a layer over the top rather than a
      // background-colour tween, since the orange is painted by three separate elements
      // (the section and both panels).
      //
      // The direction term makes the reverse one gesture too: without it the clock stays
      // aimed at 1 for the whole way back up until vh drops below DOOR_CLOSE_AT, past the
      // far end of the span, so `min(clock, bound)` left the bound in sole charge and the
      // doors reopened by scrubbing across all of CLOSE_VH — five notches to undo what one
      // notch did.
      close.aim(
        vh >= CLOSE_END ? 1 : vh < DOOR_CLOSE_AT ? 0 : scrollDir < 0 ? 0 : 1,
      );

      // --- a short guard on flat gray — already the next section's colour, so the pin
      // releasing is invisible.
    }

    // Published for the load timeline, which is the only thing that can tell this
    // sequence the entrance has released the stage.
    refs.catchUp.current = advance;

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
      // CSS `sticky` doesn't work here: ScrollSmoother fakes scrolling with a transform
      // on #smooth-content, so `sticky` never engages. GSAP's pin sets position:fixed via
      // JS instead.
      pin: refs.stage.current,
      pinSpacing: false,
      // Every transform here is a fraction of the viewport, so a resize invalidates all of
      // them, and a refresh doesn't imply a scroll event — without this the panels, seats
      // and closing line held their pre-resize geometry until the reader next moved.
      onRefresh() {
        W = document.documentElement.clientWidth;
        H = window.innerHeight;
        if (refs.introDone.current) paintStage();
      },
      onUpdate(self) {
        // Progress as real scroll distance through the pin, in vh.
        //
        // Recorded before the entrance gate, not after — a reader who scrolled during the
        // ~1.5s entrance used to have every one of those events discarded (the gate
        // returned early from the whole handler), so `lastVh` jumped from 0 to wherever
        // the reader now was once a later event arrived, and the opening could fire as one
        // continuous move that closed the doors in the same frame it opened them. Tracking
        // the position costs nothing visual — `paintStage` is what writes to the DOM, and
        // that still waits.
        lastVh = self.progress * PIN_VH;
        trackDirection(lastVh);

        // The entrance owns the stage until it lands — it's time-driven and must play at
        // its designed duration regardless of scroll speed. ScrollTrigger also fires an
        // onUpdate at creation, which without this gate would snap the clip and headline
        // to their resting state on frame one.
        //
        // `refs.catchUp` closes the gate safely — a scroll event isn't guaranteed to
        // arrive right after the entrance finishes, so waiting for one could leave the
        // stage frozen. `refs.hurryIntro` keeps the gate short: waiting out the full fade
        // while scroll runs on hands over at 36–144vh against a 20vh-long opening, so a
        // reader who scrolls early would skip the doors, the hole and the lead line
        // entirely. Idempotent, and nulls itself once landed.
        if (!refs.introDone.current) {
          if (lastVh > SEAL_AT) refs.hurryIntro.current?.();
          return;
        }

        advance();
      },
    });

    return () => {
      heroWash.active = false;
      refs.catchUp.current = null;
      refs.hurryIntro.current = null;
      // Created inside onUpdate, so the context never collected them.
      bandTween?.kill();
      close.kill();
      opening.kill();
      trigger.kill();
    };
  }, section);
}
