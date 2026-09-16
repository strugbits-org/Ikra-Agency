import { gsap, ScrollTrigger } from "@/lib/gsap";
import { createFlooredCue } from "@/components/hero/flooredCue";
import {
  assertApproachGeometry,
  measureApproach,
  reachTotal,
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
  REVEAL_EASE,
  REVEAL_REVERSE_SPEED,
  REVEAL_SECONDS,
  REVEAL_VH,
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
 * `reach` comes from a floored cue rather than a plain scrub: the reference's is scrubbed and
 * can be flicked past, and the brief is that the whole gesture plays at any scroll rate. Below
 * the crossover the clock leads and one gesture draws the line; above it the scroll leads and
 * the line still finishes inside the span. See hero/flooredCue, imported rather than
 * reimplemented because its rebase-on-reversal is subtle enough that a second copy would be a
 * second set of bugs.
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

    const cue = createFlooredCue({
      span: [0, spanVh] as const,
      /**
       * **The clock scales with the run, and that is the whole point.** The pace is then one
       * screen-width of rail per REVEAL_SECONDS however many cells there are, and the
       * crossover speed — `span / seconds` — stays put at REVEAL_VH / REVEAL_SECONDS, so a
       * six-cell track hands over from clock to scroll at the same reader speed a three-cell
       * one does. Passing REVEAL_SECONDS flat instead draws six cells in the time three take,
       * i.e. at twice the speed, which is what this shipped as until the dots' firing
       * intervals were measured (465ms apart at three cells; they would have been 233 at six).
       */
      seconds: (REVEAL_SECONDS * spanVh) / REVEAL_VH,
      reverseSpeed: REVEAL_REVERSE_SPEED,
      onUpdate: () => paint(),
    });

    /** The reader's vh through the run. The two triggers are consecutive, so this is a sum. */
    const cueVh = () => revealVh + traverseVh;

    /**
     * Which way the reader is going: 1 down, −1 up. A Schmitt trigger on travel rather than
     * one frame's delta — see DIR_FLIP_VH — and the reversal re-anchors the cue on what is on
     * screen, or the clock/floor swap pays the whole gap between them in a single frame.
     */
    let scrollDir = 1;
    let dirPeak = 0;

    const trackDirection = (vh: number) => {
      if (scrollDir > 0) {
        if (vh > dirPeak) dirPeak = vh;
        else if (vh < dirPeak - DIR_FLIP_VH) {
          scrollDir = -1;
          dirPeak = vh;
          cue.rebase(vh);
        }
      } else {
        if (vh < dirPeak) dirPeak = vh;
        else if (vh > dirPeak + DIR_FLIP_VH) {
          scrollDir = 1;
          dirPeak = vh;
          cue.rebase(vh);
        }
      }
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
      const reach = REVEAL_EASE(cue.read(cueVh(), scrollDir)) * total;

      // The bar: one clip, from the left. A clip rather than a width so the reveal costs a
      // paint on a 16px strip rather than a layout on the whole row every frame.
      const barPct = total > 0 ? 100 * (1 - reach / total) : 100;
      gsap.set(fillBar, { clipPath: `inset(0% ${barPct.toFixed(3)}% 0% 0%)` });

      gsap.set(track, { x: trackXFor(m, reach), force3D: true });

      for (let i = 0; i < m.dotX.length; i++) {
        const el = refs.dots.current?.[i];
        if (!el) continue;
        const r = el.offsetWidth / 2;
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
          if (covered) bounces[i]?.restart();
          // Uncovering does not rewind the pop — it is an event, not a pose, and a reader
          // scrubbing back over a dot should see it un-fill, not bounce in reverse. The tween
          // ends at scale 1, so leaving it played is already the correct resting state.
          else bounces[i]?.pause(0);
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
          m = measureApproach(refs);
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
      trackDirection(vh);
      // Past the far end it must be complete whichever way the reader is going; before the
      // near end, empty. Between the two, direction decides — which is what makes the rewind
      // its own gesture rather than a bound the clock is never allowed to lead.
      cue.aim(vh >= spanVh ? 1 : vh <= 0 || scrollDir < 0 ? 0 : 1);
      paint();
    }

    // A refresh re-reads the boxes but does not imply a scroll event, so the rail would hold
    // geometry measured against the previous layout.
    const onRefresh = () => {
      m = measureApproach(refs);
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
