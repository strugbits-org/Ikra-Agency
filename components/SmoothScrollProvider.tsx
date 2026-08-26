"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ScrollSmoother, ScrollTrigger } from "@/lib/gsap";
import RouteCover from "./RouteCover";
import ScrollBar from "./ScrollBar";
import { hideRouteCover } from "./routeTransition";

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

    const smoother = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: reduceMotion ? 0 : 1.2,
      effects: !reduceMotion,
      normalizeScroll: true,
    });
    smootherRef.current = smoother;

    return () => {
      smootherRef.current = null;
      smoother.kill();
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
   * so it is a jump rather than a visible flight back up — is what actually resets it.
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

    smootherRef.current?.scrollTo(0, false);
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
      <div id="smooth-wrapper" ref={wrapperRef}>
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
