import { gsap, ScrollTrigger } from "@/lib/gsap";
import { createFlooredCue } from "@/components/hero/flooredCue";
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
  DIR_FLIP_VH,
  MQ,
  REVEAL_END_PCT,
  REVEAL_REVERSE_SPEED,
  REVEAL_VH,
  STEP_EASE,
  STEP_SECONDS,
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
 * `reach` comes from a floored cue rather than a plain scrub — see hero/flooredCue, imported
 * rather than reimplemented because its rebase-on-reversal is subtle enough that a second copy
 * would be a second set of bugs — and it is **stepped**: one scroll gesture runs the line to
 * the next dot and stops there, the next takes it to the one after. ./timeline's STEP_SECONDS
 * has the brief; ./measure's `stopsFor` has the resting places.
 *
 * Two things make that work, and they are the only real machinery in this file:
 *
 *   - **The aim is a stop, not an end.** Crossing a stop's scroll boundary points the clock one
 *     dot further on, and the clock then has that dot's whole segment of scroll to arrive in.
 *   - **The floor is a staircase, not a ramp.** `flooredCue` derives its bound from the vh it
 *     is handed, so it is handed the *last boundary passed* rather than the live position. A
 *     continuous ramp would creep the line forward between boundaries — which is exactly the
 *     hold the stepping is made of — and at an ordinary reading scroll it would bind, so the
 *     stepping would simply not be visible. The staircase is a looser floor mid-span (the line
 *     may lag by up to one step) and an identical one at the ends, which is where the guarantee
 *     is actually needed: at the far boundary it is 1, so the traverse is always complete
 *     before the pin releases.
 *
 * Two triggers, and they are two **positions feeding one number** rather than two clocks: the
 * approach spans the reveal (it runs before any pin could), the pin spans the traverse, and
 * the cue reads their sum. The pin only exists when there is something to traverse.
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
    /** Scroll through the traverse, in vh. Zero-length when nothing overflows. */
    let traverseVh = 0;

    /**
     * The whole run: the reveal, plus however much traverse the cell count adds. Read once
     * here rather than per frame, which is only safe because the viewport cancels out of it —
     * see `totalVh`, where the algebra is. At three cells it is exactly REVEAL_VH.
     */
    const spanVh = Math.max(REVEAL_VH, totalVh(m));

    /** Where the line may rest, and the scroll position that earns each one. */
    let stops = stopsFor(m);
    let bounds = stops.map((s) => s * spanVh);

    /**
     * A refresh re-reads the boxes. `spanVh` is deliberately *not* re-read with them: the
     * viewport cancels out of `totalVh` (the algebra is there), so it only moves if the point
     * count does, and that cannot happen without remounting the effect.
     */
    const remeasure = () => {
      m = measureApproach(refs);
      stops = stopsFor(m);
      bounds = stops.map((s) => s * spanVh);
    };

    const cue = createFlooredCue({
      span: [0, spanVh] as const,
      /**
       * The cue's `seconds` is the time for a full 0→1, and it charges a partial move
       * pro rata — so stating the whole run as `STEP_SECONDS x the stop count` is what makes
       * **each step** take STEP_SECONDS, at three points and at thirty. Nothing here scales
       * with the viewport or the rail's length; a step is one cell of rail either way.
       */
      seconds: STEP_SECONDS * stops.length,
      ease: STEP_EASE,
      reverseSpeed: REVEAL_REVERSE_SPEED,
      onUpdate: () => paint(),
    });

    /** The reader's vh through the run. The two triggers are consecutive, so this is a sum. */
    const cueVh = () => revealVh + traverseVh;

    /**
     * The staircase floor, in vh: the boundary of the last stop the reader's own scroll has
     * paid for. This and not the live position is what the cue's bound is derived from — see
     * the file's docblock.
     */
    let floorVh = 0;

    /**
     * Which way the reader is going: 1 down, −1 up. A Schmitt trigger on travel rather than
     * one frame's delta — see DIR_FLIP_VH.
     *
     * Reports the flip rather than rebasing on it, because the cue has to be re-anchored on the
     * *staircase* and this runs before this frame's step has been worked out. Rebasing on the
     * raw position instead would hand `flooredCue` a different ramp across the flip from the
     * one it was clamping against the frame before, which is the whole thing its offset exists
     * to prevent.
     */
    let scrollDir = 1;
    let dirPeak = 0;

    const trackDirection = (vh: number) => {
      if (scrollDir > 0) {
        if (vh > dirPeak) dirPeak = vh;
        else if (vh < dirPeak - DIR_FLIP_VH) {
          scrollDir = -1;
          dirPeak = vh;
          return true;
        }
      } else {
        if (vh < dirPeak) dirPeak = vh;
        else if (vh > dirPeak + DIR_FLIP_VH) {
          scrollDir = 1;
          dirPeak = vh;
          return true;
        }
      }
      return false;
    };

    /**
     * One bounce per dot: a paused timeline played when the fill covers that dot and reversed
     * when it uncovers it. The same `play()`/`reverse()`-off-a-position arrangement as
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

    /** One frame, from `reach` alone. */
    const paint = () => {
      const total = reachTotal(m);
      const reach = cue.read(floorVh, scrollDir) * total;

      // The bar: one clip, from the left. A clip rather than a width so the reveal costs a
      // paint on a 16px strip rather than a layout on the whole row every frame.
      const barPct = total > 0 ? 100 * (1 - reach / total) : 100;
      gsap.set(fillBar, { clipPath: `inset(0% ${barPct.toFixed(3)}% 0% 0%)` });

      gsap.set(track, { x: trackXFor(m, reach), force3D: true });

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
     * The traverse, and only when there is one. `start` is the reveal's own end, so the pin
     * engages on the frame the third dot fills — which is the brief's "scroll horizontally
     * after 3 are shown", stated as a position rather than as a second constant.
     *
     * `pin: true` with GSAP's own pinSpacing, like `cases/sequence` and unlike the other two
     * pinned sections: the length here is measured from the track's overflow rather than
     * designed, so letting ScrollTrigger reserve it keeps one source of truth in `end`.
     */
    if (m.overflow > 0) {
      ScrollTrigger.create({
        trigger: rail,
        start: `center ${REVEAL_END_PCT}%`,
        end: () => `+=${m.overflow / m.pace}`,
        pin: stage,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: true,
        onRefreshInit() {
          remeasure();
        },
        onUpdate(self) {
          traverseVh = self.progress * Math.max(0, spanVh - REVEAL_VH);
          advance();
        },
        onLeave() {
          traverseVh = Math.max(0, spanVh - REVEAL_VH);
          advance();
        },
        onLeaveBack() {
          traverseVh = 0;
          advance();
        },
      });
    }

    /** One scroll position, turned into everything the cue needs. */
    function advance() {
      const vh = cueVh();
      const flipped = trackDirection(vh);

      // How many stops the reader's scroll has paid for. The floor is the last of them; the
      // aim is the next one along, in whichever direction they are going. That pair is the
      // whole of the stepping — cross a boundary and the clock is pointed one dot further on,
      // with that dot's entire segment of scroll to arrive in.
      let passed = 0;
      while (passed < bounds.length && vh >= bounds[passed]) passed++;
      floorVh = passed > 0 ? bounds[passed - 1] : 0;

      if (flipped) cue.rebase(floorVh);

      // Before the near end, empty — entering the section is itself the first gesture, so any
      // vh above 0 already aims at the first stop. Otherwise direction decides, which is what
      // makes the rewind its own stepped gesture rather than a bound the clock may never lead.
      cue.aim(
        vh <= 0
          ? 0
          : scrollDir < 0
            ? passed > 0
              ? stops[passed - 1]
              : 0
            : stops[Math.min(passed, stops.length - 1)],
      );
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
      cue.kill();
      for (const b of bounces) b?.kill();
    };
  });

  return () => mm.kill(true);
}
