import type { RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import {
  CLIMB_EASE,
  CLIMB_VH,
  HEADER_EXIT,
  HEADER_EXIT_EASE,
  PIN_VH,
} from "./timeline";

export type SequenceEls = {
  /** Pinned by the ScrollTrigger: one viewport, holding every layer. */
  stage: HTMLDivElement;
};

export type SequenceRefs = {
  /** The copy block. */
  copy: RefObject<HTMLDivElement | null>;
  /** The header lockup, which leaves with it — see HEADER_EXIT. */
  header: RefObject<HTMLElement | null>;
};

/**
 * The section's one scroll-driven sequence: a pin, and a single per-frame paint that places
 * the copy. Beat map in ./timeline.
 *
 * A plain function, not a hook — the caller owns the effect, and everything created here is
 * collected by the returned context.
 *
 * There is only one clock, which is worth saying out loud because this repo's most expensive
 * recurring bug is two of them over one shared moment. The copy and the header both hang off
 * this one, so they cannot drift apart however fast the reader scrolls. The river does not
 * move at all (it is measured stationary in the viewport across the whole reference clip) and
 * its marquee is deliberately independent of scroll, so there is no moment left for a second
 * clock to drift against.
 */
export function createPlaygroundSequence(
  section: HTMLElement,
  els: SequenceEls,
  refs: SequenceRefs,
) {
  const { stage } = els;

  return gsap.context(() => {
    /**
     * Where the block rests and how far it has to come, both measured rather than stated.
     *
     * `restY` is what makes the block centred: it is laid out at the stage's top edge (see
     * PlaygroundCopy for why it cannot centre itself), so half the leftover height is the
     * offset that centres it. `travel` follows from it — the block starts with its top edge
     * on the fold, i.e. a full stage height down.
     *
     * Read once per refresh rather than per frame: this paints on every scroll event and
     * ticker tick, and on a phone the address bar collapsing changes `stage.offsetHeight`
     * mid-scroll, so a live read would multiply a moving progress by a moving height and
     * show as flicker. Same reasoning as `definition/measure`'s `statementLiftPx`.
     */
    const m = { restY: 0, travel: 0, headerTravel: 0 };
    const measure = () => {
      const copy = refs.copy.current;
      const stageH = stage.offsetHeight;
      const blockH = copy?.offsetHeight ?? 0;
      m.restY = (stageH - blockH) / 2;
      m.travel = stageH - m.restY;
      // Far enough that the lockup's last pixel clears the top edge, not just its first.
      // `offsetHeight` already includes the header's own top padding, so this is the whole
      // distance from the viewport's top edge to the bottom of the descriptor.
      m.headerTravel = refs.header.current?.offsetHeight ?? 0;

      if (process.env.NODE_ENV !== "production") {
        // A block taller than the stage cannot be centred — it would be clipped at both ends
        // with no reading. It is a real possibility on a short wide window, where the column
        // is narrow and the type is still sized off the width.
        if (blockH > stageH) {
          console.error(
            `[Playground] the copy is ${Math.round(blockH)}px tall against a ` +
            `${Math.round(stageH)}px stage, so centring it clips both ends. Shorten the ` +
            "copy, or cap its size against the height the way CARD_MAX_VH does.",
          );
        }
      }
    };
    measure();

    /** One frame, from the pin's progress. Named so a re-measure can repaint at it too. */
    const render = (progress: number) => {
      // Progress as real scroll distance through the pin, in vh — the pin runs
      // `top top → bottom bottom`, so progress 0→1 covers `height − 100vh`.
      const vh = progress * PIN_VH;
      const climbRaw = gsap.utils.clamp(0, 1, vh / CLIMB_VH);
      const climbP = CLIMB_EASE(climbRaw);
      gsap.set(refs.copy.current, {
        y: m.restY + (1 - climbP) * m.travel,
        // The block ships hidden (see PlaygroundCopy) and is lit here rather than in its own
        // effect, so it becomes visible on the same write that first puts it somewhere — there
        // is no frame where it is both shown and unplaced.
        opacity: 1,
        force3D: true,
      });

      // The header rides the same clock over a window near the end of the climb, so the two
      // are one coupled gesture in both directions — see HEADER_EXIT. Off the *raw* climb
      // rather than the eased one: the window is a position in the copy's travel, and easing
      // it twice would move where it fires.
      const [from, to] = HEADER_EXIT;
      const headerP = HEADER_EXIT_EASE(
        gsap.utils.clamp(0, 1, (climbRaw - from) / (to - from)),
      );
      gsap.set(refs.header.current, {
        y: -headerP * m.headerTravel,
        force3D: true,
      });
    };

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      /**
       * **`true`, not a number, and that is load-bearing here rather than a taste.**
       *
       * A numeric `scrub` eases `self.progress` toward the scroll over that many seconds, so
       * the painted climb lags the scroll — but the *pin* is not scrubbed, it tracks the raw
       * scroll and releases the instant the section's bottom edge reaches the fold. Two clocks
       * over one moment, which is this repo's most expensive recurring bug (the hero's wash,
       * its door close, DefinitionSection's wordmark slide), and it drifts by exactly the
       * reader's speed.
       *
       * It cost the whole point of the section. Measured through one continuous flick at
       * 1440x900, the copy was still at 335 — a viewport's own height short of its resting 289
       * — on the frame the pin let go, and was then carried past centre and off the top at page
       * speed. The composition never assembled; what the reader saw was the section being
       * taken away mid-climb while the next one rose over it. Slow, stepped scrolling hid it
       * completely, because the lag has time to settle between notches.
       *
       * `scrub: true` puts both on one clock, so the copy parks exactly as the section begins
       * to leave at every scroll rate. Nothing is lost in smoothness: ScrollSmoother already
       * eases the scroll position ScrollTrigger reads (`smooth: 1.2`), so the input to this is
       * a smoothed value, not raw wheel steps — a second ease on top of it only buys lag.
       */
      scrub: true,
      pin: stage,
      // The section states its own height (SECTION_VH), so ScrollTrigger must not reserve a
      // second copy of it — same as the hero's and DefinitionSection's pins, and unlike
      // CaseStudies', whose length is measured rather than designed.
      pinSpacing: false,
      onUpdate: (self) => render(self.progress),
      onRefresh: (self) => {
        measure();
        render(self.progress);
      },
    });

    // The webfont landing reflows the copy and changes its height, which moves both figures
    // above. Nothing else would put the block back in register — a scrub does not paint until
    // the reader moves.
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      measure();
      render(trigger.progress);
    });

    // Resting state for a restored scroll position, for the same reason.
    render(trigger.progress);

    return () => {
      cancelled = true;
    };
  });
}
