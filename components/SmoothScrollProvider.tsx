"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ScrollSmoother, ScrollTrigger } from "@/lib/gsap";
import RouteCover from "./RouteCover";
import ScrollBar from "./ScrollBar";
import { hideRouteCover } from "./routeTransition";
import { readInitialScrollLock, subscribeInitialScrollLock } from "./scrollLock";

/** Keys that move the page without a wheel or a touch — held during the initial lock. */
const SCROLL_KEYS = new Set([
  "Space",
  "PageUp",
  "PageDown",
  "End",
  "Home",
  "ArrowUp",
  "ArrowDown",
]);

export default function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const smootherRef = useRef<ScrollSmoother | null>(null);
  const pathname = usePathname();
  const lastPath = useRef(pathname);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // The one thing a mount-time refresh can still miss: the custom variable font
    // swapping in after this first pass, which reflows text throughout the page and
    // changes the document's real height. Individual sections re-measure their own
    // internal geometry off `document.fonts.ready` already (see definition/sequence),
    // but nothing re-syncs the page's own cached scroll distance against the
    // now-taller-or-shorter document — so on a slow load, every pin below the swap can
    // end up measured against a document that is no longer the right length. Racing
    // against font load explains why an earlier version of this bug was intermittent
    // rather than constant.
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    // Below the same breakpoint CaseStudies already treats as "no GSAP-driven scroll
    // tricks" (see its own docblock), skip ScrollSmoother entirely and let the page
    // scroll natively. `normalizeScroll` works by intercepting touch and replacing
    // native scrolling with a transform it drives itself — and on a real phone that
    // hand-off can lose: touch events keep arriving and the browser's own `scrollY`
    // keeps moving, but the smoother's transform doesn't track it, so every
    // ScrollTrigger (all keyed off the transform, never off `scrollY`) freezes
    // mid-page while the reader can still visibly drag the screen. That reads as the
    // page getting stuck at one point scrolling down and a *different* point
    // scrolling up, because the two positions have desynced independently in each
    // direction — confirmed by dispatching real touch events at the OS level against
    // the deployed site: `scrollY` advanced normally while the smoother's own
    // transform never moved off 0. Neither a devtools mobile emulator nor
    // Playwright's default input simulation reproduces this — only genuine touch
    // input does — which is why it wasn't caught until it was tested on an actual
    // phone.
    //
    // Every pin in this codebase is a plain `ScrollTrigger` (see hero/sequence,
    // definition/sequence, cases/sequence) — none of them call into the smoother
    // directly — so they work identically against native scroll. `ScrollBar` already
    // falls back to `window.scrollY`/`window.scrollTo` wherever `ScrollSmoother.get()`
    // returns null, which is the same fallback reduced motion already exercises.
    const isMobile = window.matchMedia("(max-width: 767.98px)").matches;
    if (isMobile) {
      smootherRef.current = null;
      return () => {
        cancelled = true;
      };
    }

    const smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: reduceMotion ? 0 : 1.2,
      effects: !reduceMotion,
      normalizeScroll: true,
    });
    smootherRef.current = smoother;

    return () => {
      cancelled = true;
      smootherRef.current = null;
      smoother.kill();
    };
  }, []);

  /**
   * Holds scroll input off the page while the home page's hero is still running its
   * load timeline — see ./scrollLock for why this lives here rather than in the hero
   * itself. `.paused()` is ScrollSmoother's own "nothing will scroll" switch and
   * covers desktop; below `md` there is no smoother to ask (see the mount effect
   * above), so the wheel/touch/keyboard listeners are what actually hold a phone
   * still there. Both run together rather than one implying the other, since which
   * one is doing the work depends on the viewport.
   *
   * Reads the store's current value on mount rather than assuming unlocked, because
   * React fires a child's effects before its parent's: on the home page,
   * HeroNarrative's own mount effect — which locks — has already run by the time
   * this one does.
   */
  useEffect(() => {
    const preventScroll = (e: Event) => e.preventDefault();
    const preventKeyScroll = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.code)) e.preventDefault();
    };

    const apply = (isLocked: boolean) => {
      smootherRef.current?.paused(isLocked);
      document.documentElement.classList.toggle("scroll-locked", isLocked);
      if (isLocked) {
        window.addEventListener("wheel", preventScroll, { passive: false });
        window.addEventListener("touchmove", preventScroll, {
          passive: false,
        });
        window.addEventListener("keydown", preventKeyScroll);
      } else {
        window.removeEventListener("wheel", preventScroll);
        window.removeEventListener("touchmove", preventScroll);
        window.removeEventListener("keydown", preventKeyScroll);
      }
    };

    apply(readInitialScrollLock());
    const unsubscribe = subscribeInitialScrollLock(() =>
      apply(readInitialScrollLock()),
    );
    return () => {
      unsubscribe();
      apply(false);
    };
  }, []);

  /**
   * Route changes, and the two things the smoother will not do for itself.
   *
   * This provider lives in the root layout, so it survives navigation — the smoother is
   * created once and the page under it is swapped. Two consequences, and neither is
   * hypothetical:
   *
   * **The scroll position does not reset.** ScrollSmoother fakes scrolling with a transform
   * on `#smooth-content` and `normalizeScroll` takes the wheel and touch events, so Next's
   * own scroll-to-top has nothing real to act on: opening a case study from halfway down the
   * home page would land halfway down the case study. `scrollTo(0, false)` — no smoothing,
   * so it is a jump rather than a visible flight back up — is what actually resets it. Below
   * `md` there is no smoother (see the mount effect), so the native `window.scrollTo` does
   * the same job — without it a mobile reader would carry their old scroll position into the
   * new route instead of landing at its top.
   *
   * **Every ScrollTrigger's start and end are stale.** They were measured against the old
   * document's height; the new route's content is a different length, and the pin on
   * `CaseStudies` reserves its own distance on top of that. A refresh re-measures them all.
   *
   * Guarded on the path having actually changed, because this effect also runs on mount, and
   * on mount a `scrollTo(0)` would fight the browser restoring the reader's position after a
   * reload.
   *
   * Back and forward are not special-cased and do not need to be: the router's own scroll
   * restoration lands after this and wins, so a `goBack` returns to where the reader was
   * (verified: parked at 6000 on the home page, into a case study at 0, back to 6000).
   *
   * **And the cover comes off here, last.** A link raises it on click (see `CaseLink`); this
   * is the first moment the new page exists, is at the top, and has had its triggers
   * re-measured, so it is the first moment there is anything worth showing. Uncovering before
   * the refresh would hand over a page whose pins are still measured against the old
   * document's height.
   */
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    if (smootherRef.current) smootherRef.current.scrollTo(0, false);
    else window.scrollTo(0, 0);
    ScrollTrigger.refresh();

    // One frame, so the browser has actually painted the reset and refreshed layout before
    // the cover starts to fade off it. Two rAFs is the usual idiom for "after the next
    // paint": the first fires before it, the second after.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(hideRouteCover);
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [pathname]);

  return (
    <>
      {/* `overflow-x-hidden` is a page-level backstop, not a fix on whichever
          section is responsible this week — DefinitionSection's growing photo-circle
          is the current offender (see its own docblock on why it scales well past
          the viewport, and why the frame around it clips with `clip-path` rather
          than `overflow-hidden`): `clip-path` only hides the pixels outside it, it
          doesn't stop the oversized box from *contributing* to scrollable overflow,
          so the circle's real, invisible footprint was widening this wrapper's
          horizontal extent. Wide screens never notice, because a mouse has no
          horizontal swipe; on a phone it's a drag away, and it was corrupting the
          layout viewport itself under it — which is what was reaching the hero's
          door geometry (doorsFor reads that same measured width) on the way back up.

          On ScrollSmoother itself (`≥768px`) this is redundant — the plugin already
          sets its own `overflow: hidden` on this element — so the class only ever
          does anything below that breakpoint, where SmoothScrollProvider's mount
          effect skips creating a smoother and this div is otherwise bare.

          It belongs here and not on `html`/`body`: both of those already carry an
          explicit `height: 100%`, and giving either of them a non-`visible`
          `overflow-x` forces its *own* `overflow-y` to `auto` per the CSS spec's
          "only one axis visible" rule — against a box with a real fixed height,
          `auto` genuinely clips, and with `html` and `body` both affected the usual
          root-to-body propagation (the rule that lets `html` stand in for the
          viewport and leaves `body` a plain in-flow box) stops applying, so `body`
          became a second, nested scroll container and started scrolling on its own
          `scrollTop` instead of the page scrolling at all — `window.scrollY` sat at
          0, and so did every ScrollTrigger. This div has no explicit height of its
          own even on mobile (it sizes to its content), so the same coupling firing
          on its `overflow-y` is inert: a box with `height: auto` cannot have
          vertical overflow against itself. */}
      <div
        id="smooth-wrapper"
        ref={wrapperRef}
        className="overflow-x-hidden"
      >
        <div id="smooth-content">{children}</div>
      </div>
      {/* Belongs to the scroll system rather than to the page: it reads the
          smoother's position, and the native scrollbar it stands in for is hidden
          unconditionally in globals.css, so it has to be mounted wherever the
          smoother is. It portals itself out to document.body — see the component
          — so where it sits in this tree costs nothing. */}
      <ScrollBar />
      {/* Same reasoning as ScrollBar: it portals itself out to document.body, because
          `position: fixed` cannot hold still inside the smoother's transformed subtree. */}
      <RouteCover />
    </>
  );
}
