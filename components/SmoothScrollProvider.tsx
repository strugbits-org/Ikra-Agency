"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ScrollSmoother, ScrollTrigger } from "@/lib/gsap";
import BlobCursor from "./BlobCursor";
import RouteCover from "./RouteCover";
import ScrollBar from "./ScrollBar";
import { hideRouteCover, showRouteCover } from "./routeTransition";
import {
  readInitialScrollLock,
  subscribeInitialScrollLock,
  unlockInitialScroll,
} from "./scrollLock";
import {
  readTailScrollLock,
  subscribeTailScrollLock,
} from "./definition/tailScrollLock";

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

  /**
   * Where the reader was on each route they have been to, so back and forward can put them
   * back there. Keyed by path, which is enough here: this site has no route a reader can hold
   * two different positions in at once.
   *
   * A ref on this provider rather than `sessionStorage` because the provider lives in the
   * root layout and therefore outlives every navigation — and because a reload is not a case
   * this has to cover: it starts a new history session, and the browser's own restoration
   * handles it (which is what the mount guard on the route effect below is protecting).
   */
  const scrollMemory = useRef(new Map<string, number>());

  /**
   * Whether the navigation now in flight is a back or a forward. Set by `popstate`, read and
   * cleared by the route effect, which is the only thing that can tell the difference —
   * `usePathname` reports the same change either way.
   */
  const popped = useRef(false);

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

    // Skip ScrollSmoother entirely on anything that scrolls by finger, and let the page
    // scroll natively. `normalizeScroll` works by intercepting touch and replacing
    // native scrolling with a transform it drives itself — and that hand-off can lose:
    // touch events keep arriving and the browser's own `scrollY` keeps moving, but the
    // smoother's transform doesn't track it, so every ScrollTrigger (all keyed off the
    // transform, never off `scrollY`) freezes mid-page while the reader can still
    // visibly drag the screen. That reads as the page getting stuck at one point
    // scrolling down and a *different* point scrolling up, because the two positions
    // have desynced independently in each direction.
    //
    // **The test is the input device, not the width, and getting that wrong is what
    // shipped this bug to tablets.** It was first found on a phone, so the guard was
    // written as `max-width: 767.98px` — the breakpoint CaseStudies already treats as
    // "no GSAP-driven scroll tricks" — which reads as "small screens are the touch
    // ones". An iPad is 1024 wide and touch-only, so it sailed past the guard and got
    // the smoother, and the desync was worse there than on a phone because the pins are
    // what the wide layout is made of: measured at 1024 x 1366, `scrollY` climbed
    // 642 → 1327 → 2012 across three swipes with the smoother's transform still at 0,
    // so the playground's stage never pinned and up to **1328px of its bare black
    // section background** stood between the stage and the next section. The horizontal
    // rail below it never released either, which is the same freeze seen from the other
    // end. `(hover: none) and (pointer: coarse)` is the device test; a laptop with a
    // touchscreen answers `hover: hover` / `pointer: fine` for its *primary* input and
    // rightly keeps the smoother, because its wheel works.
    //
    // It needs genuine touch input to see: a wheel event scrolls normally even under
    // emulation, so devtools' device toolbar and Playwright's `mouse.wheel` both look
    // clean. Dispatching real touch events (CDP `Input.dispatchTouchEvent`, or a finger)
    // is what reproduces it.
    //
    // Every pin in this codebase is a plain `ScrollTrigger` (see hero/sequence,
    // definition/sequence, cases/sequence, approach/sequence) — none of them call into
    // the smoother directly — so they work identically against native scroll.
    // `ScrollBar` already falls back to `window.scrollY`/`window.scrollTo` wherever
    // `ScrollSmoother.get()` returns null, which is the same fallback reduced motion
    // already exercises.
    const touchScrolled = window.matchMedia(
      "(max-width: 767.98px), (hover: none) and (pointer: coarse)",
    ).matches;
    if (touchScrolled) {
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
   * Holds scroll input off the page for either of two reasons: the home page's hero
   * is still running its load timeline (see ./scrollLock), or DefinitionSection's
   * footer tail has been outrun by the reader's own scroll speed and needs the rest
   * of its gesture to finish before the pin is allowed to release (see
   * ./definition/tailScrollLock — same external-store shape as ./scrollLock, for the
   * same reason). Two independent sources feeding one freeze rather than two
   * separate freezes, because there is only one scroll to hold.
   *
   * `.paused()` is ScrollSmoother's own "nothing will scroll" switch and covers
   * desktop; below `md` there is no smoother to ask (see the mount effect above), so
   * the wheel/touch/keyboard listeners are what actually hold a phone still there.
   * Both run together rather than one implying the other, since which one is doing
   * the work depends on the viewport — this is also why the tail's freeze works
   * identically on every breakpoint without knowing which mechanism is in play.
   *
   * Reads both stores' current values on mount rather than assuming unlocked,
   * because React fires a child's effects before its parent's: on the home page,
   * HeroNarrative's own mount effect — which locks — has already run by the time
   * this one does.
   */
  useEffect(() => {
    const preventScroll = (e: Event) => e.preventDefault();
    const preventKeyScroll = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.code)) e.preventDefault();
    };

    const apply = () => {
      const isLocked = readInitialScrollLock() || readTailScrollLock();
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

    apply();
    const unsubscribeInitial = subscribeInitialScrollLock(apply);
    const unsubscribeTail = subscribeTailScrollLock(apply);
    return () => {
      unsubscribeInitial();
      unsubscribeTail();
      smootherRef.current?.paused(false);
      document.documentElement.classList.remove("scroll-locked");
      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
      window.removeEventListener("keydown", preventKeyScroll);
    };
  }, []);

  /**
   * Remember where the reader is on this route, for a later back or forward.
   *
   * Recorded continuously rather than captured on the way out, because there is no reliable
   * moment on the way out to capture it at: by the time the route effect below runs, the new
   * page has already rendered and the old position is gone. A passive `scroll` listener is a
   * ref write per scroll event and costs nothing measurable.
   *
   * `smoother.scrollTop()` and not the drawn transform: the smoother eases over 1.2s, so the
   * transform is up to a second behind where the reader has actually scrolled to, and it is
   * the destination we want to come back to. Below `md` there is no smoother and
   * `window.scrollY` is the real thing (see the mount effect).
   *
   * Keyed on `pathname`, which is why this effect depends on it — each route's listener writes
   * under its own key, and a route change re-registers rather than mislabelling the next one.
   */
  useEffect(() => {
    const remember = () => {
      scrollMemory.current.set(
        pathname,
        smootherRef.current ? smootherRef.current.scrollTop() : window.scrollY,
      );
    };
    window.addEventListener("scroll", remember, { passive: true });
    return () => window.removeEventListener("scroll", remember);
  }, [pathname]);

  /**
   * Flag a history navigation, and cover the screen for it.
   *
   * `popstate` is the only signal that distinguishes a back or forward from a link click —
   * `usePathname` reports both as the same change — and it fires synchronously during the
   * history traversal, well before React commits the new route, so the flag is always set by
   * the time the route effect reads it.
   *
   * The cover goes up for the same reason a click raises it: the restore below happens in an
   * effect, i.e. **after** a paint, so without it the reader sees one frame of the new page at
   * the top before it jumps to where they were. `hideRouteCover` in the route effect takes it
   * down again.
   *
   * **Both are guarded on the path actually changing**, and that guard is load-bearing.
   * `popstate` also fires for a traversal that does not change the route at all — a hash, or
   * a history entry this app pushed for its own reasons — and on one of those the route effect
   * never runs, so a cover raised here would have nothing to take it down: a black screen over
   * a working page, forever. Same failure `CaseLink` guards against for modified clicks.
   */
  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname === lastPath.current) return;
      popped.current = true;
      showRouteCover();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
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
   * **Back and forward have to be special-cased, and a comment here used to say they didn't.**
   * The claim was that the router's own scroll restoration lands after this reset and wins. It
   * does not — measured: parked at 6000 on the home page, into a case study, back, and both
   * `window.scrollY` and the smoother's own transform read 0. Nothing puts the reader back,
   * because `normalizeScroll` means the position Next would restore is not the position the
   * page is drawn at, and the reset above is the last word on it either way. Clicking a card
   * and pressing Back therefore dropped the reader at the top of a very long page, some
   * distance above the card they had just come from.
   *
   * So the reset is now conditional: a **new** navigation opens at the top, and a **history**
   * one returns to `scrollMemory`. The order matters — the refresh has to happen first,
   * because the triggers are still measured against the old document and the pins have not
   * reserved their distance yet, so a scroll to 6000 before it would be clamped to whatever
   * height the page happens to have at that instant.
   *
   * **And the cover comes off here, last.** A link raises it on click (see `CaseLink`) and a
   * history navigation raises it in the `popstate` effect above; this is the first moment the
   * new page exists, is at the right scroll position, and has had its triggers re-measured, so
   * it is the first moment there is anything worth showing. Uncovering before the refresh
   * would hand over a page whose pins are still measured against the old document's height.
   */
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    const restoreTo = popped.current ? scrollMemory.current.get(pathname) : undefined;
    popped.current = false;

    if (smootherRef.current) smootherRef.current.scrollTo(0, false);
    else window.scrollTo(0, 0);
    ScrollTrigger.refresh();

    if (restoreTo) {
      // **Release the hero's load lock first, and this is not tidying — it is the whole
      // reason a first attempt at this didn't work.** Going back to the home page remounts
      // `HeroNarrative`, which locks initial scroll in its mount effect, and a child's
      // effects run before its parent's — so by the time this runs the smoother is already
      // `paused(true)`. A paused smoother does not merely ignore the scroll: measured, the
      // restore set `window.scrollY` to 6000 with the transform still at 0, and ~100ms later
      // the smoother dragged the window back to its own position and the page sat at the top
      // exactly as before. Unlocking is also right on its own terms rather than a workaround:
      // the lock exists so the hero's entrance can play without being scrolled past, and a
      // reader returning from a case study to a position 6000px down the page is neither
      // watching that entrance nor able to scroll for the second and a half it would hold
      // them. The hero's own `unlockInitialScroll` later is then a no-op.
      unlockInitialScroll();

      // After the refresh, so the document is as tall as this route actually makes it.
      // `false` again: a smoothed flight down 6000px is not a restoration, it is a ride.
      if (smootherRef.current) smootherRef.current.scrollTo(restoreTo, false);
      else window.scrollTo(0, restoreTo);
    }

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
      {/* The site's cursor, and it is mounted here rather than per-page for two reasons:
          this provider lives in the root layout, so the blob survives a route change
          instead of being torn down and re-seeded at the corner mid-navigation — and it
          portals out of the smoother's transformed subtree exactly as the two above do.
          It replaces the hero's own white dot; see `RESTORE THE HERO DOT` in
          components/HeroNarrative.tsx. */}
      <BlobCursor />
    </>
  );
}
