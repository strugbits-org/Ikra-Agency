import { gsap, ScrollTrigger } from "@/lib/gsap";
import { ROW_MIN_WIDTH } from "./metrics";
import { RADIUS_END, RADIUS_START, radiusPct, type Shape } from "./timeline";

/**
 * The founders section's scroll work: one ScrollTrigger per photograph, each writing that
 * photograph's corner radius. Beat map and the evidence behind the window in ./timeline.
 *
 * A plain function, not a hook — the caller owns the effect, and everything created here is
 * collected by the returned context.
 *
 * **One trigger per photograph, and they are not one clock over one moment.** The repo's
 * recurring bug is two clocks over a *shared* moment; these share nothing. Each photograph's
 * radius is a function of that photograph's own position on the screen and of nothing else —
 * no beat is keyed off where another one landed, so two blocks a screen apart cannot drift
 * against each other in any sense that would show. Writing them from one trigger would mean
 * inventing a driver they all hang off, which is the shape of the bug rather than a guard
 * against it.
 *
 * **Why the trigger is the photograph and not the block.** The window is stated in ./timeline
 * as positions of the photograph's own top edge, so `trigger: el` makes `start`/`end` say
 * exactly that and nothing has to know how tall the block around it is. It also means the
 * flanked block's two photographs, which sit at the same height, get the same progress
 * without being told they are a pair.
 */
export function createAboutSequence(section: HTMLElement) {
  return gsap.context(() => {
    /**
     * **`matchMedia` rather than one pass over every frame in the section, because two of them
     * are never on screen at the same time.** The flanked block ships three photographs — the
     * pair that flanks its column above `lg` and the single one that sits over it below — and
     * whichever pair is not in use is `display: none`, which ScrollTrigger has no way to
     * notice. Measured against a `display: none` element, `start` and `end` both resolve to
     * the top of the document: the trigger sits permanently past its own window, paints a
     * radius onto something nobody can see, and reports a photograph parked at the top of the
     * viewport for the whole page. Harmless to look at and wrong in every trace.
     *
     * GSAP reverts and rebuilds each block's triggers on the breakpoint itself, so a reader
     * who resizes across it gets the right set without this having to listen for anything.
     */
    const mm = gsap.matchMedia();

    const build = (visible: "row" | "stack") => () => {
      const frames = Array.from(
        section.querySelectorAll<HTMLElement>("[data-media-shape]"),
      ).filter((el) => {
        const at = el.dataset.mediaAt;
        return at === "both" || at === visible;
      });

      for (const el of frames) {
        const shape = el.dataset.mediaShape as Shape;
        const paint = (progress: number) => {
          // A percentage rather than a pixel length, so the box's inscribed ellipse is the end
          // of the range whatever shape the box is — a circle on the square media-left
          // photographs and an ellipse on the landscape flanked pair, which is what the
          // reference shows in both. A px radius would need the box's own size and would go
          // wrong the moment `fluid()` scaled it.
          gsap.set(el, { borderRadius: `${radiusPct(shape, progress).toFixed(2)}%` });
        };

        ScrollTrigger.create({
          trigger: el,
          start: RADIUS_START,
          end: RADIUS_END,
          // `true`, not a number, for the reason `playground/sequence` gives at length: a
          // numeric scrub eases the painted progress behind the scroll, and ScrollSmoother has
          // already smoothed the position ScrollTrigger reads, so a second ease on top buys
          // lag and nothing else. The reference's own radius is lagged — it keeps moving
          // through frames where the scroll does not — and that is the one thing about it not
          // worth reproducing.
          scrub: true,
          onUpdate: (self) => paint(self.progress),
          // A scrub paints on movement, so nothing would place a photograph that is already
          // past its window when the page loads at a restored scroll position, or when a
          // webfont reflow moves the block under it.
          onRefresh: (self) => paint(self.progress),
        });
      }
    };

    mm.add(`(min-width: ${ROW_MIN_WIDTH}px)`, build("row"));
    mm.add(`(max-width: ${ROW_MIN_WIDTH - 0.02}px)`, build("stack"));

    // The display italic is `display: swap` and is not preloaded (see app/fonts), so the
    // quotes reflow when it lands and every block below the first one moves — which moves the
    // start and end this section's triggers were measured against. ScrollTrigger refreshes on
    // resize and on load, and neither of those is a webfont arriving late.
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      mm.revert();
    };
  });
}
