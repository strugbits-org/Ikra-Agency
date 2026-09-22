"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Logo from "./Logo";
import { bandGeometry } from "./hero/band";
import BandLayer from "./hero/BandLayer";
/* RESTORE THE HERO DOT — step 1 of 7.
 *
 * This section's own white circle cursor is switched off: components/BlobCursor.tsx is
 * now the site's one cursor, mounted globally in SmoothScrollProvider, and two cursors
 * cannot both be right on this page. Nothing was deleted — `attachHeroCursor` in
 * ./hero/cursor and `HeroCursor` in ./hero/HeroLayers are both still there and still
 * correct, they are simply no longer called.
 *
 * To bring the dot back, uncomment these seven and remove the blob:
 *   1. this import
 *   2. `HeroCursor` in the ./hero/HeroLayers import below
 *   3. `cursorRef`, with the other refs
 *   4. the effect that calls attachHeroCursor
 *   5. the <HeroCursor> element in the returned markup
 *   6. `[&_*]:!cursor-none cursor-none` on the <section> — see the note there, it is the
 *      one step that is not a straight revert
 *   7. <BlobCursor /> in components/SmoothScrollProvider.tsx, which comes out
 */
// import { attachHeroCursor } from "./hero/cursor";
import { doorsFor } from "./hero/doors";
import { useBackgroundFootage } from "./hero/footage";
import GapCopy, { gapCopyFontSize } from "./hero/GapCopy";
import {
  ClipWindow,
  DoorPanels,
  HeroBackdrop,
  // RESTORE THE HERO DOT — step 2 of 7.
  // HeroCursor,
  HeroLoadingCue,
} from "./hero/HeroLayers";
import { playHeroIntro } from "./hero/intro";
import { createHeroSequence } from "./hero/sequence";
import { SECTION_VH } from "./hero/timeline";
import { lockInitialScroll, unlockInitialScroll } from "@/components/scrollLock";

/**
 * A ceiling on how long the initial scroll lock can hold, independent of whether
 * the load timeline itself ever reports landing (see ./hero/intro). Every real path
 * through it unlocks well inside this — a bounded wait on `document.fonts.ready`
 * plus its own ~1.5s of fades — so this only fires if something has actually gone
 * wrong (an exception mid-timeline, a promise that never settles), and exists so
 * that failure mode is "the intro didn't play" rather than "the page cannot scroll".
 *
 * **It lands the entrance as well as releasing the scroll, and that is the whole
 * difference between a usable failure and the one a client reported.** Unlocking
 * alone leaves every layer at the opacity 0 the entrance starts from, so the page
 * was scrollable but blank — a flat orange screen that only resolved once the reader
 * scrolled far enough for the sequence to call `hurry` itself. Calling it here means
 * the worst case is the entrance arriving without its fade, on a page that shows its
 * own content unprompted.
 */
const SCROLL_LOCK_SAFETY_MS = 6000;

/**
 * One continuous pinned sequence, assembled from four parts:
 *
 *   ./hero/timeline   every beat, in vh of real scrolling, and the phase map
 *   ./hero/sequence   the one ScrollTrigger that plays it
 *   ./hero/intro      the load timeline, which runs before any of it
 *   ./hero/HeroLayers the layers themselves, driven purely through refs
 *
 * The refs and the effects stay here, so each effect's dependencies are visible
 * next to the state they read; the bodies are plain functions in those modules.
 *
 * Layering (back to front): the background still with the footage over it, the wavy
 * band, the doors, the hero copy, the gray wash, then the header. The band sits
 * *under* the doors deliberately — both are the same orange, but it means a ribbon
 * caught mid-close is swallowed by the returning panels rather than floating over
 * them. The wash sits over the copy and under the header for the same kind of
 * reason: everything it covers is already gone by the time it arrives, and the one
 * thing that isn't is the wordmark.
 *
 * Reduced motion registers no ScrollTrigger and renders a static end state: doors
 * parked open over the footage, copy as a plain column, ribbon drawn in full.
 */
export default function HeroNarrative() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoBoxRef = useRef<HTMLDivElement>(null);
  const panelLeftRef = useRef<HTMLDivElement>(null);
  const panelRightRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const gapLineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const ribbonRef = useRef<HTMLDivElement>(null);
  const leapRef = useRef<HTMLDivElement>(null);
  const grayRef = useRef<HTMLDivElement>(null);
  // RESTORE THE HERO DOT — step 3 of 7.
  // const cursorRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLSpanElement>(null);
  const headlineRef = useRef<HTMLParagraphElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const clipVideoRef = useRef<HTMLVideoElement>(null);
  // Latches, not elements: play() is asynchronous, so the elements' own `paused`
  // still reads stale on the next frame and would be called again every frame.
  const bgCoveredRef = useRef(false);
  const clipSealedRef = useRef(false);
  // Set by the load timeline, read by the scroll sequence.
  const introDoneRef = useRef(false);
  // The other half of that hand-off: the sequence writes its per-frame dispatch here
  // and the load timeline calls it once, on landing. A ref rather than a prop because
  // the two live in separate effects and only ever meet at runtime — see
  // SequenceRefs.catchUp for why the latch alone cannot do the job.
  const catchUpRef = useRef<(() => void) | null>(null);
  // And the reverse: the load timeline writes a "finish quickly" here and the sequence
  // calls it as soon as the reader scrolls. The opening is 20vh of scroll long, so the
  // hand-off has to happen near the top of the section or there is nothing left to
  // play — see SequenceRefs.hurryIntro.
  const hurryIntroRef = useRef<(() => void) | null>(null);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);
  // The ribbon is pinned to the wedges' corners, so it needs both axes of the
  // stage's real size, not just its width.
  const [stageBox, setStageBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    // Returning `prev` unchanged is what makes this cheap: React bails out of the
    // render entirely. Without the comparison every observation committed a fresh
    // object and re-rendered the whole hero — and the observations are not rare or
    // idle-time. GSAP writes inline width/height onto this element when it pins and
    // again on every refresh, and on mobile a scroll that moves the URL bar changes
    // `100vh` outright, so the observer fires *during* scrolling, which is the one
    // time a re-render of the band and the copy can cost a frame.
    const observer = new ResizeObserver(() =>
      setStageBox((prev) => {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        return prev.w === w && prev.h === h ? prev : { w, h };
      }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Memoised because it is an object identity that props flow through: recomputed
  // inline, every render handed BandLayer a new `band` and re-rendered the ribbon and
  // its SVG geometry even when the stage had not moved.
  const band = useMemo(
    () =>
      stageBox.w > 0 && stageBox.h > 0
        ? bandGeometry(stageBox.w, stageBox.h)
        : null,
    [stageBox.w, stageBox.h],
  );

  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    setMounted(true);

    // Held until the load timeline lands (see ./hero/intro's `land`) — locked here
    // rather than the moment that effect runs so there is no gap between paint and
    // the lock engaging for the reader to scroll through.
    lockInitialScroll();
    const safety = window.setTimeout(() => {
      // `hurry` is the entrance's own "finish now" and unlocks as it lands, so this is
      // the same hand-off a scroll would have triggered — idempotent, and null once the
      // entrance has landed under its own power, which is every ordinary load.
      hurryIntroRef.current?.();
      unlockInitialScroll();
    }, SCROLL_LOCK_SAFETY_MS);
    return () => window.clearTimeout(safety);
  }, []);

  const { bgSrc, bgPlaying, setBgPlaying } = useBackgroundFootage(
    mounted,
    reducedMotion,
  );

  // Load sequence (plays once, not scroll-driven) — see playHeroIntro.
  useEffect(() => {
    if (!mounted) return;
    const box = videoBoxRef.current;
    const headline = headlineRef.current;
    const logo = logoRef.current;
    if (!box || !headline || !logo) return;
    return playHeroIntro(
      box,
      headline,
      logo,
      introDoneRef,
      catchUpRef,
      hurryIntroRef,
      reducedMotion,
    );
  }, [reducedMotion, mounted]);

  // The single scroll-driven sequence covering every phase — see createHeroSequence.
  //
  // Gated on `mounted` as well as the motion mode, because `reducedMotion` is false
  // for the first commit whatever the user's setting is — it cannot be read until the
  // effect that reads it has run. Without the gate a reduced-motion visitor got a full
  // ScrollTrigger built and pinned, then reverted a commit later; the pin is the part
  // that makes that more than wasted work.
  useEffect(() => {
    if (reducedMotion || !mounted) return;
    const section = sectionRef.current;
    const box = videoBoxRef.current;
    if (!section || !box) return;

    const ctx = createHeroSequence(section, box, {
      stage: stageRef,
      headline: headlineRef,
      panelLeft: panelLeftRef,
      panelRight: panelRightRef,
      content: contentRef,
      gapLines: gapLineRefs,
      ribbon: ribbonRef,
      leap: leapRef,
      gray: grayRef,
      bgVideo: bgVideoRef,
      clipVideo: clipVideoRef,
      bgCovered: bgCoveredRef,
      clipSealed: clipSealedRef,
      introDone: introDoneRef,
      catchUp: catchUpRef,
      hurryIntro: hurryIntroRef,
    });

    return () => ctx.revert();
  }, [reducedMotion, mounted]);

  // RESTORE THE HERO DOT — step 4 of 7.
  // useEffect(() => {
  //   if (reducedMotion || !mounted) return;
  //   const section = sectionRef.current;
  //   const cursor = cursorRef.current;
  //   if (!section || !cursor) return;
  //   return attachHeroCursor(section, cursor);
  // }, [reducedMotion, mounted]);

  return (
    /*
     * RESTORE THE HERO DOT — step 6 of 7, and the one that is not a straight revert.
     *
     * `[&_*]:!cursor-none cursor-none` came off this className. Hiding the native cursor
     * is BlobCursor's job now, and it does it from JS (`html.blob-cursor`, see
     * app/globals.css) precisely so that it only happens when there is a blob to put in
     * its place. This class could not: it fired under reduced motion too, where
     * `mounted && !reducedMotion` meant the dot below was never rendered — so a reader
     * with reduced motion on crossed this section with no cursor at all. That was a
     * standing bug and taking the class off is what fixes it. Restoring the dot wants
     * the class back *and* wants that hole closed some other way.
     */
    <section
      ref={sectionRef}
      className="relative bg-accent"
      style={{ height: reducedMotion ? "100vh" : `${SECTION_VH}vh` }}
    >
      {/* RESTORE THE HERO DOT — step 5 of 7. */}
      {/* {mounted && !reducedMotion && <HeroCursor cursorRef={cursorRef} />} */}

      {/* GSAP pins this element directly (see createHeroSequence); CSS `sticky`
          does not work here. `relative` still gives next/image `fill` something to
          resolve against before pinning kicks in. */}
      <div ref={stageRef} className="relative h-screen w-full overflow-hidden">
        <div className="relative h-full w-full">
          <HeroBackdrop
            bgSrc={bgSrc}
            bgPlaying={bgPlaying}
            onPlaying={() => setBgPlaying(true)}
            videoRef={bgVideoRef}
          />

          <DoorPanels
            leftRef={panelLeftRef}
            rightRef={panelRightRef}
            reducedMotion={reducedMotion}
            doors={doorsFor(stageBox.w)}
          />

          <ClipWindow boxRef={videoBoxRef} videoRef={clipVideoRef} />

          <HeroLoadingCue />

          {/* The turn-over from orange to the next section's gray (Phase 7). Above
            the panels and everything they carry, but deliberately below the header:
            the wordmark survives into the gray rather than being painted out along
            with the orange.

            Nothing but GSAP ever raises it, so it stays at opacity 0 under reduced
            motion — where the doors are parked open over the footage and a gray
            screen would be plainly wrong. */}
          <div
            ref={grayRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[25] bg-gray opacity-0"
          />

          {/* Starts hidden in the markup, exactly like the clip box and the
            headline, and for the same reason. The load timeline is what fades it
            in; the effect that sets its start state cannot run until after the
            first paint — one commit to flip `mounted`, another for the effect
            itself — so a wordmark left visible here is painted at full strength,
            blanked a frame or two later, then faded back in. Restored explicitly
            under reduced motion, where nothing fades it. */}
          <header className="absolute top-0 left-0 z-30 w-full px-8 py-8 md:px-16">
            <Logo
              ref={logoRef}
              className="w-[90px] opacity-0 md:w-[120px]"
              color="var(--color-ink)"
            />
          </header>

          {/* No translate-centring classes on purpose: GSAP animates `y` here and
            owns xPercent/yPercent instead, in both motion modes. Safe to leave
            uncentred for the frame before that runs because `opacity-0` starts it
            hidden. */}
          <p
            ref={headlineRef}
            className="absolute top-1/2 left-1/2 z-30 w-full max-w-5xl px-8 text-center text-[32px] leading-[1.3] font-light text-white/80 opacity-0 md:text-[52px] lg:max-w-[1300px] lg:text-[68px]"
          >
            eventually, success becomes your
            <br />
            biggest problem
          </p>

          <div
            aria-hidden
            className="absolute bottom-8 left-1/2 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-ink/70"
          />

          {reducedMotion && (
            /* Nothing animates here, so the opening copy has to live where it
               won't collide with the ribbon, which is pinned to the wedges in
               both modes. */
            <div className="absolute inset-x-8 top-[10%] z-20 text-center md:inset-x-16">
              <GapCopy />
            </div>
          )}

          {!reducedMotion && (
            /* No flex column and no padding of its own: every line is seated
               absolutely at its centre and carries its own gutters, so the one
               arriving lands exactly where the one leaving sat. */
            <div
              ref={contentRef}
              className="pointer-events-none absolute inset-0 z-30 opacity-0"
            >
              <GapCopy
                overlay
                lineRefs={gapLineRefs}
                fontSize={gapCopyFontSize(stageBox.w)}
              />
            </div>
          )}

          <BandLayer
            band={band}
            reducedMotion={reducedMotion}
            ribbonRef={ribbonRef}
            leapRef={leapRef}
            leapFontSize={gapCopyFontSize(stageBox.w)}
          />
        </div>
      </div>
    </section>
  );
}
