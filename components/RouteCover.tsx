"use client";

import { useSyncExternalStore } from "react";
import {
  readRouteCover,
  readRouteCoverOnServer,
  subscribeRouteCover,
} from "./routeTransition";

/**
 * The screen shown while a route change is in flight: near-black, with the brand's own
 * orange turning in the middle of it.
 *
 * ## What it is actually covering
 *
 * `body` is `--color-cream`, a near-white, and both case studies open on a dark field. So any
 * frame in which the old page has gone and the new one has not painted is a white flash
 * between two dark screens, which is what it looks like — a glitch rather than a transition.
 * There are two such windows and they need different handling:
 *
 *   - **Before the swap.** The router is fetching the destination segment. In production the
 *     case studies are prerendered and prefetched so this is usually nothing; in development
 *     the segment compiles on demand and it is seconds. `app/work/loading.tsx` is the
 *     route-level answer to that one, and it is the answer Next's own docs prefer.
 *   - **Across the swap.** `SmoothScrollProvider` lives in the root layout, so the smoother
 *     survives while the page under it is replaced — and the scroll reset and
 *     `ScrollTrigger.refresh()` that follow run in an effect, i.e. after a paint. This is the
 *     window that shows cream, and it is the one this component exists for.
 *
 * ## Why it is a sibling of `#smooth-wrapper` and not a portal
 *
 * `position: fixed` does not work *inside* `#smooth-content`: a transformed ancestor becomes
 * the containing block for fixed descendants, so anything fixed in there scrolls with the
 * page (see CLAUDE.md). `ScrollBar` solves that by portalling to `document.body`. This does
 * not need to: `SmoothScrollProvider` renders it as a sibling of `#smooth-wrapper`, which is
 * already outside the transformed subtree, so `fixed` holds. That is worth the two lines it
 * saves — a portal has to wait for `document`, which means a mounted flag, which means a
 * `setState` in an effect, which is the one thing this repo's lint config actually objects to.
 *
 * ## Always mounted; only the opacity moves
 *
 * The element is in the tree from the first render and CSS decides whether it is on screen.
 * That is what keeps this free of React state entirely — and it also means the cover is
 * *already composited* when a click raises it, so it goes up on the same frame rather than
 * after a mount. `visibility` is transitioned alongside `opacity` with a delay, which is the
 * standard way to take a faded-out element out of the hit-testing and the accessibility tree
 * without unmounting it.
 *
 * ## The fade is one-way
 *
 * It appears instantly and leaves over `FADE_MS`. A cover that faded *in* would show the
 * flash through itself for exactly as long as the flash lasts, which is the whole of the
 * problem; a cover that fades *out* hands the new page over without a hard cut. Under reduced
 * motion the global rule in `app/globals.css` flattens both the fade and the spin, which
 * leaves a plain panel that appears and disappears — correct, and still not a white flash.
 */

/** How long the cover takes to leave once the new page is up. */
const FADE_MS = 260;

export default function RouteCover() {
  const covered = useSyncExternalStore(
    subscribeRouteCover,
    readRouteCover,
    readRouteCoverOnServer,
  );

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!covered}
      className="pointer-events-none fixed inset-0 z-200 flex items-center justify-center bg-[#0b0b0b]"
      style={{
        opacity: covered ? 1 : 0,
        visibility: covered ? "visible" : "hidden",
        // **No transition on the way up.** A cover that eases in shows the flash through
        // itself for exactly as long as the flash lasts, which is the whole of the problem —
        // measured at 346ms of partial cover before this was made one-way. Coming down it
        // eases, and `visibility` snaps only once that has finished; without the delay it
        // would snap at the start and take the fade with it.
        transition: covered
          ? "none"
          : `opacity ${FADE_MS}ms ease-out, visibility 0s linear ${FADE_MS}ms`,
      }}
    >
      {covered ? <span className="sr-only">Loading</span> : null}
      {/* A ring with one lit quarter, turning. Borders rather than an SVG: four declarations,
          it inherits the accent token, and it cannot go out of step with the palette. */}
      <span
        aria-hidden
        className="h-11 w-11 animate-spin rounded-full border-2 border-accent/20 border-t-accent"
      />
    </div>
  );
}
