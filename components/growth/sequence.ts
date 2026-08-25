import { gsap, ScrollTrigger } from "@/lib/gsap";
import {
  BAR_GROW_EASE,
  BAR_GROW_SECONDS,
  CAP_AT,
  CAP_SECONDS,
  ROW_START,
  STAGGER_SPAN,
} from "./timeline";

/**
 * The bars' entrance: one paused timeline per row, played and reversed by one trigger each.
 *
 * A plain function rather than a hook, so the caller keeps ownership of the effect — the same
 * shape as `createHeroSequence` and `createDefinitionSequence`. Returns the `gsap.context` for
 * the effect to revert.
 *
 * ## A cue, not a scrub, and that is the one deliberate departure from the reference
 *
 * The recording's bars are scrubbed (see ./timeline). These are `play()`/`reverse()` on a
 * paused timeline, so a row completes on its own clock however fast the reader is moving and
 * never parks half-built — and it unwinds the same way, in the same order, on the way back up.
 * That also makes it *more* speed-independent than a scrub rather than less: a scrub crossed
 * quickly skips the frames in between, while a timeline plays all of them.
 *
 * ## One timeline per row, because the rows are a screen apart
 *
 * The band is taller than the viewport, so its second row arrives long after the first has
 * finished — in the reference the first row was done at t≈3.5 and the second did not start
 * until t≈4.7. A single timeline over all ten bars would run the second row while it was
 * still below the fold. Each row therefore carries its own trigger, keyed to its own bottom
 * edge, and the stagger runs inside a row rather than across the band.
 *
 * ## Why the DOM is read rather than passed in as refs
 *
 * The bars are a nested list — rows of cells, each cell two elements — and threading that as
 * ref arrays costs more than it explains. The context is scoped to `root`, so the selectors
 * below cannot escape this component, and each fill carries its own value as a data attribute
 * so the stagger has everything it needs from the markup.
 */
export function createGrowthSequence(root: HTMLElement) {
  return gsap.context(() => {
    for (const row of gsap.utils.toArray<HTMLElement>("[data-growth-row]", root)) {
      const fills = gsap.utils.toArray<HTMLElement>("[data-growth-fill]", row);
      const caps = gsap.utils.toArray<HTMLElement>("[data-growth-cap]", row);
      if (!fills.length) continue;

      const values = fills.map((fill) => Number(fill.dataset.growthValue) || 0);
      // The row's own tallest bar, not a fixed 100 — see STAGGER_SPAN.
      const peak = Math.max(...values);

      const tl = gsap.timeline({ paused: true });
      fills.forEach((fill, i) => {
        const at = peak > 0 ? STAGGER_SPAN * (1 - values[i] / peak) : 0;

        // `fromTo` renders its start state on creation, which is what takes the markup from
        // the finished chart it ships as down to an empty one. Without that the component
        // would need a separate `set` pass and a reason not to flash.
        tl.fromTo(
          fill,
          { "--grow": 0 },
          { "--grow": 1, duration: BAR_GROW_SECONDS, ease: BAR_GROW_EASE },
          at,
        );

        // The cap waits at the bar's target and fades in as the fill climbs to it; it is
        // positioned by CSS and never moves, so only its opacity is written here.
        if (caps[i]) {
          tl.fromTo(
            caps[i],
            { opacity: 0 },
            { opacity: 1, duration: CAP_SECONDS, ease: "none" },
            at + BAR_GROW_SECONDS * CAP_AT,
          );
        }
      });

      const trigger = ScrollTrigger.create({
        trigger: row,
        start: ROW_START,
        onEnter: () => tl.play(),
        onLeaveBack: () => tl.reverse(),
      });

      // A reload halfway down the page lands past the mark without ever crossing it, and
      // `onEnter` only fires on a crossing — so the row would sit empty for as long as the
      // reader stayed below it. Seeding the end state is what makes the deep link correct.
      if (trigger.scroll() >= trigger.start) tl.progress(1);
    }
  }, root);
}
