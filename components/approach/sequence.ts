import { gsap, ScrollTrigger } from "@/lib/gsap";
import { approachContentClip, POP_OVERHANG_RATIO } from "./ApproachLayers";
import { createStepper } from "./stepper";
import {
  assertApproachGeometry,
  measureApproach,
  reachTotal,
  stopsFor,
  totalVh,
  trackXFor,
  type ApproachMeasure,
  type ApproachRefs,
} from "./measure";
import {
  BOUNCE_AT_COVERAGE,
  BOUNCE_AMP,
  BOUNCE_EASE,
  BOUNCE_SECONDS,
  BOUNDARY_HYST_VH,
  MAX_CATCH_UP,
  MQ,
  REVEAL_END_PCT,
  REVEAL_REVERSE_SPEED,
  REVEAL_VH,
  STEP_EASE,
  STEP_SECONDS,
  TAIL_VH,
} from "./timeline";

/**
 * The approach section's scroll work: one number, `reach`, and everything else read off it.
 *
 * `reach` is how far along the rail the fill has got, in px of track. The bar's clip, every
 * dot's own clip, and the track's translation are all pure functions of it, so **there is one
 * clock here and nothing that can drift** — which matters more than usual, because the fill
 * and the traverse share every moment they both exist in. Two clocks over one shared moment is
 * this repo's most expensive recurring bug (the hero's wash, its door close,
 * DefinitionSection's wordmark slide); the one exception here is the dots' bounce, and
 * ./timeline's BOUNCE_AMP sets out why it is safe.
 *
 * `reach` comes from ./stepper rather than a scrub, and it is **stepped**: one scroll gesture
 * runs the line to the next dot and stops there, the next takes it to the one after.
 * ./timeline's STEP_SECONDS has the brief; ./measure's `stopsFor` has the resting places;
 * ./stepper has the argument for why this section owns its clock instead of borrowing
 * `hero/flooredCue`, which it did first and which could not draw a reverse at all.
 *
 * What is left here is the small part: **turning one scroll position into one index.**
 *
 *   - The stops' boundaries are spread **evenly** across the span, so every gesture is worth
 *     the same amount however long the step it buys. ./timeline's `segmentVh` has why.
 *   - `goalIdx` is the last boundary the reader has crossed, with a deadband on the way back
 *     (BOUNDARY_HYST_VH). It is handed to the stepper, which walks there one dot at a time —
 *     so a gesture big enough to cross two boundaries draws two steps rather than jumping the
 *     pair, which is the whole of the defect this replaced.
 *
 * Two triggers, and they are two **positions feeding one number** rather than two clocks: the
 * approach spans the reveal (it runs before any pin could), the pin spans the traverse **and
 * the hold after it**, and the index is read off their sum.
 *
 * The hold is ./timeline's TAIL_VH and it is the last thing the run does. Every boundary still
 * falls inside `spanVh`, so the last stop is earned TAIL_VH of pinned scroll before the pin
 * lets go and the final step is drawn with the row still held — which it was not before, and
 * which is what made the section read as stopping at 82% and handing the reader to the footer.
 */
export function createApproachSequence(refs: ApproachRefs) {
  const mm = gsap.matchMedia();

  // Below `lg` the section renders the stacked composition and this is never built — see MQ.
  // A matchMedia rather than a plain `if` so a resize across the breakpoint tears the pin
  // down cleanly instead of leaving it pinned against a stale layout.
  mm.add(MQ.isRow, () => {
    const stage = refs.stage.current;
    const track = refs.track.current;
    const rail = refs.rail.current;
    if (!stage || !track || !rail) return;

    let m: ApproachMeasure = measureApproach(refs);
    if (process.env.NODE_ENV !== "production") assertApproachGeometry(m);

    /** Scroll through the reveal, in vh. 0 as the rail's centre crosses the fold. */
    let revealVh = 0;
    /** Scroll through the pin, in vh — the traverse and then the hold. */
    let traverseVh = 0;

    /**
     * The whole run: the reveal, plus however much traverse the cell count adds. Read once
     * here rather than per frame, which is only safe because the viewport cancels out of it —
     * see `totalVh`, where the algebra is. At three cells it is exactly REVEAL_VH.
     */
    const spanVh = Math.max(REVEAL_VH, totalVh(m));

    /** Where the line may rest. */
    let stops = stopsFor(m);

    /**
     * The scroll that earns each stop: an even share of the span apiece, so one gesture is
     * worth one step whether that step is the 146px lead-in or a whole cell. `bounds[i]` is
     * where stop `i` is paid for, and the last of them is the span's own end.
     *
     * **The pin runs TAIL_VH past that**, so the last of these is not the last of the scroll —
     * which is the whole of the hold. Spread over `spanVh` and not over the pin, deliberately:
     * the hold is added to the run rather than taken out of it, so a step costs what it always
     * did and the cadence is untouched.
     */
    let bounds = stops.map((_, i) => ((i + 1) / stops.length) * spanVh);

    /**
     * A refresh re-reads the boxes. `spanVh` is deliberately *not* re-read with them: the
     * viewport cancels out of `totalVh` (the algebra is there), so it only moves if the point
     * count does, and that cannot happen without remounting the effect.
     */
    const remeasure = () => {
      m = measureApproach(refs);
      stops = stopsFor(m);
      bounds = stops.map((_, i) => ((i + 1) / stops.length) * spanVh);
      stepper.retable(stops);
    };

    const stepper = createStepper({
      stops,
      seconds: STEP_SECONDS,
      ease: STEP_EASE,
      reverseSpeed: REVEAL_REVERSE_SPEED,
      maxCatchUp: MAX_CATCH_UP,
      onUpdate: () => paint(),
    });

    /** The reader's vh through the run. The two triggers are consecutive, so this is a sum. */
    const cueVh = () => revealVh + traverseVh;

    /** The last stop the reader's own scroll has paid for. −1 is the rail's start. */
    let goalIdx = -1;

    /**
     * One bounce per dot: a paused timeline restarted whenever the fill crosses that dot's
     * coverage point, in either direction. The same played-off-a-position arrangement as
     * `growth/sequence`'s bars.
     *
     * Built here rather than in the paint so each dot's tween exists once; `gsap.context`
     * collects them, and the matchMedia rebuilds them on a breakpoint change.
     */
    const bounces = (refs.dots.current ?? []).map((el) => {
      if (!el) return null;
      // Out fast, back elastic. The overshoot has to be on the *return* — a single
      // `elastic.out` to 1.28 leaves the dot permanently enlarged, and an `elastic` on the way
      // out rings before the dot has arrived, which reads as a stutter rather than a hit.
      return gsap
        .timeline({ paused: true })
        .to(el, {
          scale: 1 + BOUNCE_AMP,
          duration: BOUNCE_SECONDS * 0.18,
          ease: "power2.out",
        })
        .to(el, {
          scale: 1,
          duration: BOUNCE_SECONDS * 0.82,
          ease: BOUNCE_EASE,
        });
    });
    /** Whether each dot has been popped, so a scrub back and forth does not re-fire it. */
    const popped = bounces.map(() => false);

    // Resolved once: the bar's fill layer never changes identity, and querying it inside the
    // paint would be a DOM read on every frame of the scroll and of the cue's ticker.
    const fillBar = track.querySelector<HTMLElement>("[data-bar-fill]");
    const dotFills = (refs.dots.current ?? []).map(
      (el) => el?.querySelector<HTMLElement>("[data-dot-fill]") ?? null,
    );

    // The dots and the copy, which are clipped at the stage's left edge on their own so that
    // the bar can reach past it into the gutter. See `approachContentClip`, which is also where
    // the reason the two are clipped at *different* marks is.
    const clipDots = track.querySelector<HTMLElement>('[data-approach-clip="dots"]');
    const clipCopy = track.querySelector<HTMLElement>('[data-approach-clip="copy"]');
    /** Last value written, so the clip costs nothing on the frames it does not move. */
    let clipLeft = Number.NaN;

    /** One frame, from `reach` alone. */
    const paint = () => {
      const total = reachTotal(m);
      const reach = stepper.read() * total;

      // The bar: one clip, from the left. A clip rather than a width so the reveal costs a
      // paint on a 16px strip rather than a layout on the whole row every frame.
      const barPct = total > 0 ? 100 * (1 - reach / total) : 100;
      gsap.set(fillBar, { clipPath: `inset(0% ${barPct.toFixed(3)}% 0% 0%)` });

      const x = trackXFor(m, reach);
      gsap.set(track, { x, force3D: true });

      // The stage's left is permanently open for the lead-in, so the row has to clip itself
      // where the stage would have: at the stage's edge, in track coordinates.
      const left = Math.max(0, -x);
      if (left !== clipLeft) {
        clipLeft = left;
        gsap.set(clipCopy, { clipPath: approachContentClip(left) });
        gsap.set(clipDots, {
          clipPath: approachContentClip(left - POP_OVERHANG_RATIO * 2 * m.dotR),
        });
      }

      const r = m.dotR;
      for (let i = 0; i < m.dotX.length; i++) {
        // Each dot's fill is clipped on its own rather than by the bar's clip, so a dot is
        // free to scale past the fill's leading edge while it pops — under one shared clip the
        // pop would be sliced flat down its right-hand side.
        const localP = gsap.utils.clamp(0, 1, (reach - (m.dotX[i] - r)) / (2 * r));
        const fill = dotFills[i];
        if (fill) {
          gsap.set(fill, {
            clipPath: `inset(0% ${(100 * (1 - localP)).toFixed(3)}% 0% 0%)`,
          });
        }

        const covered = localP >= BOUNCE_AT_COVERAGE;
        if (covered !== popped[i]) {
          popped[i] = covered;
          // Both crossings, not just the covering one — the dot answers the line arriving and
          // again as it lets go on the way back up, which is the client's own request and is
          // what makes scrolling up read as a rewind rather than as an erase. Always
          // `restart()`, never a reverse: see ./timeline's BOUNCE_AMP.
          bounces[i]?.restart();
        }
      }
    };

    /**
     * The reveal. `center bottom` → `center ${REVEAL_END_PCT}%` is the measured mapping stated
     * directly: the fill starts as the rail's centre crosses the fold and completes with it
     * REVEAL_END_PCT of the way down the screen. Scrubbed rather than cued because it is a
     * *position* being fed to the cue, not a second animation.
     */
    ScrollTrigger.create({
      trigger: rail,
      start: "center bottom",
      end: `center ${REVEAL_END_PCT}%`,
      scrub: true,
      onUpdate(self) {
        revealVh = self.progress * REVEAL_VH;
        advance();
      },
      // onUpdate stops firing outside the window, so the terminal values are written here or
      // the rail holds its last in-window pose for the whole traverse.
      onLeave() {
        revealVh = REVEAL_VH;
        advance();
      },
      onLeaveBack() {
        revealVh = 0;
        advance();
      },
    });

    /**
     * The traverse, and the hold after it. `start` is the reveal's own end, so the pin engages
     * on the frame the third dot fills — which is the brief's "scroll horizontally after 3 are
     * shown", stated as a position rather than as a second constant.
     *
     * `pin: true` with GSAP's own pinSpacing, like `cases/sequence` and unlike the other two
     * pinned sections: the traverse's length is measured from the track's overflow rather than
     * designed, so letting ScrollTrigger reserve it keeps one source of truth in `end`.
     *
     * **It is built for the hold alone when nothing overflows.** At three points the track fits
     * the stage and there is no traverse, and without this the run's last stop would be earned
     * on the reveal's own final frame with nothing holding the reader at all — the same defect
     * as the one TAIL_VH answers, one section shorter. The whole span is then the hold.
     */
    /** The pin's own length in vh — the traverse, and then the hold. */
    const pinVh = Math.max(0, spanVh - REVEAL_VH) + TAIL_VH;
    if (m.overflow > 0 || TAIL_VH > 0) {
      ScrollTrigger.create({
        trigger: rail,
        start: `center ${REVEAL_END_PCT}%`,
        end: () => `+=${m.overflow / m.pace + (TAIL_VH / 100) * m.viewportH}`,
        pin: stage,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: true,
        onRefreshInit() {
          remeasure();
        },
        onUpdate(self) {
          traverseVh = self.progress * pinVh;
          advance();
        },
        onLeave() {
          traverseVh = pinVh;
          advance();
        },
        onLeaveBack() {
          traverseVh = 0;
          advance();
        },
      });
    }

    /** One scroll position, turned into the one index the stepper needs. */
    function advance() {
      const vh = cueVh();

      // Crossing a boundary earns the stop beyond it at once; giving one up takes a deadband,
      // so a reader parked on a boundary does not walk the same dot back and forth. Written as
      // two walks from the *current* index rather than a count, which is what makes the
      // hysteresis expressible at all — a count has no memory of which side it came from.
      while (goalIdx + 1 < bounds.length && vh >= bounds[goalIdx + 1]) goalIdx++;
      while (goalIdx >= 0 && vh < bounds[goalIdx] - BOUNDARY_HYST_VH) goalIdx--;

      stepper.aim(goalIdx);
      paint();
    }

    // A refresh re-reads the boxes but does not imply a scroll event, so the rail would hold
    // geometry measured against the previous layout.
    const onRefresh = () => {
      remeasure();
      paint();
    };
    ScrollTrigger.addEventListener("refresh", onRefresh);

    // The webfont landing reflows the cells and moves every dot, which moves every figure
    // above. Nothing else would put the rail back in register — a scrub does not paint until
    // the reader moves.
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    // First frame, so the resting composition is right before any scrolling.
    paint();

    return () => {
      cancelled = true;
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      stepper.kill();
      for (const b of bounces) b?.kill();
    };
  });

  return () => mm.kill(true);
}
