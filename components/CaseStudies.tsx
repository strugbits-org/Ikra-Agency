"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { CaseTrack } from "./cases/CaseLayers";
import RevealPanel from "./cases/RevealPanel";
import { createCaseSequence } from "./cases/sequence";
import { MQ } from "./cases/timeline";

/**
 * The case studies: a pinned stage across which a horizontal track travels right-to-left as
 * the reader scrolls down. The track is the heading, one cell per project, and a closing
 * call-to-action — all the same width, all sliding together. When it runs out, the whole
 * layer slides off to the left and uncovers the panel that has been standing behind it.
 *
 * Assembled from six parts, so only one of them knows about position:
 *
 *   ./cases/projects    the typed content, and the only file to edit for it
 *   ./cases/timeline    every number, each one measured off a reference recording
 *   ./cases/measure     the layout figures every frame is computed against
 *   ./cases/sequence    the matchMedia, the pin, the approach, the door and the one paint
 *   ./cases/CaseLayers  the track and its cells, driven purely through refs
 *   ./cases/RevealPanel the panel behind the door, which never moves
 *
 * This file is only refs, effects and markup: no timing and no math.
 *
 * **Nothing here touches the hero or the definition section.** It is a sibling in
 * `app/page.tsx` with its own triggers and its own pin, so the existing sequences are
 * untouched by construction rather than by care. The one thing it borrows from the hero is
 * `hero/flooredCue`, which is pure — see the note where the sequence calls it.
 *
 * Reduced motion builds no ScrollTrigger and renders a static end state: the heading, the
 * projects and the closing panel as one plain vertical column with the reveal panel below
 * them, and no pin to reserve distance for.
 *
 * **Below `md` this renders the same static end state, unconditionally of the motion
 * preference.** A pinned stage whose whole premise is translating a full-viewport track
 * sideways off *vertical* touch scroll does not survive a real phone: the pin's length is a
 * function of `innerHeight`, which iOS/Android change mid-scroll as the address bar
 * collapses, and the door's floored cue is tuned against wheel-notch scroll deltas that
 * touch scrolling doesn't produce the same way. There is no reference recording for a phone
 * version of this section to transcribe numbers from, unlike everything else in
 * `components/cases/`, so rather than invent a second choreography this reuses the
 * accessible fallback: the reveal panel simply becomes the next block down the page, which
 * is "the door opening from below" without there being a door. `isMobile` is read
 * independently of `reducedMotion` — a desktop reader with reduced motion on gets this same
 * static column on a wide screen, and a phone reader with no motion preference set still
 * doesn't get the pin.
 */

/**
 * `useLayoutEffect` where it exists, `useEffect` on the server.
 *
 * GSAP wants the layout effect, and here it is what removes the need for any start state in
 * the markup: the sequence paints its resting frame before the browser paints at all, so
 * there is never a commit showing the cells untransformed. In a passive effect that frame
 * would be visible. React warns about `useLayoutEffect` during SSR, hence the swap rather
 * than a bare import.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * The motion preference, read as an external store rather than into state from an effect.
 *
 * The other two sections do the latter, and it is the one convention here worth breaking: a
 * `setState` in an effect body is what `react-hooks/set-state-in-effect` objects to — those
 * call sites are the whole of this repo's lint error count — and it needs a second `mounted`
 * flag to paper over the commit where the value is still wrong. This is correct on the first
 * render after hydration and tracks a visitor changing the setting.
 *
 * Module scope because both callbacks must be referentially stable, or the store resubscribes
 * on every render.
 */
const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const readMotion = () => window.matchMedia(REDUCED).matches;
// No `window` on the server, and the animated path is the honest default there.
const readMotionOnServer = () => false;

/**
 * The viewport breakpoint, read the same way and for the same reason as the motion
 * preference above — this too has to be correct on first render after hydration and track a
 * resize or a rotation, not just the value at mount. Shares `MQ.isMobile` with
 * `cases/sequence.ts`'s own matchMedia so the two can never disagree about where the pin
 * starts and stops applying.
 */
const subscribeViewport = (onChange: () => void) => {
  const mq = window.matchMedia(MQ.isMobile);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const readIsMobile = () => window.matchMedia(MQ.isMobile).matches;
const readIsMobileOnServer = () => false;

export default function CaseStudies() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLElement | null)[]>([]);
  const contentRefs = useRef<(HTMLElement | null)[]>([]);
  const revealWindowRef = useRef<HTMLDivElement>(null);
  const revealPanelRef = useRef<HTMLDivElement>(null);

  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    readMotion,
    readMotionOnServer,
  );
  const isMobile = useSyncExternalStore(
    subscribeViewport,
    readIsMobile,
    readIsMobileOnServer,
  );
  // Either one alone is enough to skip the pinned track — see the docblock above. Combined
  // once here so the render logic below has a single flag to branch on rather than repeating
  // the `||` at every call site.
  const staticLayout = reducedMotion || isMobile;

  useIsomorphicLayoutEffect(() => {
    if (staticLayout) return;
    // Cleanup is `mm.kill(true)`: it reverts every breakpoint's tweens and start states and
    // disconnects the media queries, so an unmount or a Fast Refresh cannot leave a duplicate
    // ScrollTrigger behind. Returned rather than a context because matchMedia already *is* a
    // set of contexts — see createCaseSequence.
    return createCaseSequence({
      section: sectionRef,
      stage: stageRef,
      track: trackRef,
      cells: cellRefs,
      contents: contentRefs,
      revealWindow: revealWindowRef,
      revealPanel: revealPanelRef,
    });
  }, [staticLayout]);

  // The two writers handed down to the cells. Stable, so a cell's `ref` callback is not a new
  // function on every render — React would otherwise detach and reattach every one of them.
  // Declared here because this is where the arrays are declared: writing to a ref that arrived
  // as a prop is what `react-hooks/immutability` objects to, and rightly.
  const registerCell = useCallback((i: number, el: HTMLElement | null) => {
    cellRefs.current[i] = el;
  }, []);
  const registerContent = useCallback((i: number, el: HTMLElement | null) => {
    contentRefs.current[i] = el;
  }, []);

  const track = (
    <CaseTrack
      trackRef={trackRef}
      registerCell={registerCell}
      registerContent={registerContent}
      // `CaseTrack`'s prop is named for the accessibility fallback it was built for — the
      // stacked, un-pinned column it renders is exactly what a phone wants too, so mobile
      // reuses it under the same flag rather than earning a second layout.
      reducedMotion={staticLayout}
    />
  );

  /* The reference's stage is a light field with a faint top-to-bottom gradient. Its exact
     range (#fcfcfc → #d5d5d5) is not usable verbatim here: the definition section above ends
     on this site's flat `--color-gray`, so opening at near-white would put a hard band across
     the seam. The gradient keeps the reference's direction and its subtlety, anchored to the
     token the previous section ends on so the boundary stays invisible.

     It stays on the *section*, and it stays purely vertical, and both of those are now
     load-bearing rather than incidental — the door works by never moving this at all. See the
     note on seams in ./cases/timeline. */
  const field = "bg-linear-to-b from-gray to-[#cfcece]";

  if (staticLayout) {
    return (
      <section ref={sectionRef} className={`relative w-full ${field}`}>
        {track}
        {/* No door to open, so the panel behind it is simply the next thing down the page —
            on a phone this is the "door opening from below" the pinned version does with a
            horizontal slide: scrolling past the cards is all it takes to arrive at it.

            `min-h-[80vh]` is `md:`-only. It was written for the accessibility fallback,
            which only ever showed on a wide screen with reduced motion set — there,
            approximating the pinned version's one-viewport stage reads as intentional
            breathing room. `RevealPanel` doesn't actually fill or centre in that box (a
            plain `min-height` doesn't give a percentage-height child anything to resolve
            against), so on a phone, where this same branch is now everyone's default, the
            floor was just dead gray above and below a form three fields tall. Dropping it
            below `md` lets the block hug `RevealPanel`'s own height instead.

            `bg-cream` here too, below `md` only. `RevealPanel` paints its own field, but
            only across its own box — which this branch leaves it to size itself, since the
            `h-full` it centres its content with never resolves against a plain
            `min-height`/auto-height parent (see above). So this wrapper's padding was
            showing the *section's* gray field, not the panel's cream one: a hard edge
            where the heading meets cream with nothing above it, and on the way out a
            cream → gray → dark-footer double seam that reads as an unstyled gap rather
            than a margin. Painting the wrapper cream too makes its padding read as the
            panel's own, since the two fields are the same colour with nothing to bleed
            between them — no seam to close, unlike the transformed layers elsewhere in
            this repo that need one. */}
        <div className="w-full bg-cream py-16 md:min-h-[80vh] md:bg-transparent md:py-24">
          <RevealPanel />
        </div>
      </section>
    );
  }

  return (
    /* No height of its own: the pin reserves its own distance (`pinSpacing: true`), and that
       distance is the track's measured overflow plus the door's floor. Writing a height here
       as well would split one source of truth across two files — the opposite trade to the two
       existing sections, which need `pinSpacing: false` against a stated height.

       No `overflow` here either, deliberately. The clipping the track needs is on the stage
       below; putting `overflow-hidden`/`clip` on this element instead risks making it a scroll
       container, which is not something to hand a pinned subtree under ScrollSmoother. */
    <section ref={sectionRef} className={`relative w-full ${field}`}>
      {/* The element GSAP pins: exactly one viewport. `overflow-hidden` is load-bearing rather
          than decorative — it is the frame the track travels across, and what hides every cell
          not yet arrived, every cell already gone, and the reveal window while it is still
          parked off the right edge. */}
      <div
        ref={stageRef}
        className="relative h-screen w-full overflow-hidden"
      >
        {/* The reveal, and it comes *first* on purpose.

            Both this and the track are positioned with no `z-index`, so tree order decides
            which paints on top — the same rule as the stacked composition in
            `DefinitionSection` and the testimonial's copy block. First means behind, which is
            what this is: the panel the door uncovers, never something drawn over the case
            studies. It can afford to be behind because the track is transparent wherever the
            reveal is visible — that region is the empty tail run at the end of the track.

            Two boxes, and neither may be collapsed into the other. The window is stage-sized
            and clips; the panel inside it is counter-translated by exactly the window's own
            offset, which is what leaves it standing still on screen while the window slides
            across it. Written as one element it would either move with the door or not be
            clipped by it.

            The start state is in the markup rather than left to the first paint: the window
            sits one whole viewport to the right, so a commit before the sequence runs — or a
            crawler, or a failed script — shows the case studies alone rather than the reveal
            covering them. */}
        <div
          ref={revealWindowRef}
          className="absolute inset-0 overflow-hidden"
          /* An inline `transform`, not Tailwind's `translate-x-full`: v4 compiles those to
             the standalone `translate` property, which the browser composes *with* the
             `transform` GSAP writes rather than being replaced by it — so the window would
             start one viewport out and then be moved a second one. Same property in, same
             property out. */
          style={{ transform: "translateX(100%)", willChange: "transform" }}
        >
          <div
            ref={revealPanelRef}
            className="absolute inset-0"
            style={{ transform: "translateX(-100%)", willChange: "transform" }}
          >
            <RevealPanel />
          </div>
        </div>

        {track}
      </div>
    </section>
  );
}
