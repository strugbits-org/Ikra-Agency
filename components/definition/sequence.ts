import type { RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import {
  ANT_SPAN,
  DOT_PENETRATE_PX,
  DOT_PHYSICS,
  KICK_SPAN,
  LOGO_DOTS,
  bump,
  fallAt,
  penetrationAt,
} from "./dots";
import { heroWash } from "../hero/handoff";
import { createMeasure } from "./measure";
import {
  DEF_MOBILE_STATEMENT_LIFT_END_PCT,
  DICT_AT,
  DICT_VH,
  DOT_CROSSFADE_LEAD,
  DROP_SECONDS,
  FADE_AT,
  FADE_VH,
  FOOTER_REVEAL_EASE,
  GROW_AT,
  GROW_VH,
  LOGO_FADE_ABOVE_FRAC,
  LOGO_FADE_EASE,
  LOGO_FADE_SECONDS,
  IMAGE_IN,
  IMAGE_IN_EASE,
  IMAGE_MERGE_EASE,
  MARK_APPROACH_FRAC,
  MARK_CLEAR_PX,
  MARK_SLIDE_EASE,
  PAN_AT,
  PAN_EASE,
  PAN_SECONDS,
  PIN_VH,
  STATEMENT_FADE_EASE,
  STATEMENT_LIFT_END_PCT,
  STATEMENT_REVEAL_AT_PCT,
  STATEMENT_VH,
  TAIL_AT,
  TAIL_BACK_SECONDS,
  TAIL_SECONDS,
  VEIL_VH,
} from "./timeline";

/**
 * The elements resolved before the sequence is built. All five are guarded by the
 * caller, so they are values rather than refs — the pin, the clip and every
 * measurement need them on the first frame.
 */
/**
 * 0 before the span, 1 after, linear between — a second copy of the hero's
 * `ramp`, not a shared import, so the two sections' numbers can't drift together.
 */
const spanP = (v: number, [from, to]: readonly [number, number]) =>
  gsap.utils.clamp(0, 1, (v - from) / (to - from));

export type SequenceEls = {
  /** Pinned by the ScrollTrigger: one viewport, clipping the track. */
  stage: HTMLDivElement;
  /** Both screens. The camera moves this. */
  track: HTMLDivElement;
  /** The track's first screen, and the composition's coordinate space. */
  frame: HTMLDivElement;
  /** The round window. Scaled by `render`, measured by `measure`. */
  circle: HTMLDivElement;
};

/**
 * Everything else the sequence drives, as refs rather than resolved elements —
 * the definition and the falling dots do not render at all under reduced motion,
 * and the footer's rows fill in as React commits them.
 */
export type SequenceRefs = {
  /** The full-bleed layer inside the round window, counter-scaled every frame. */
  photo: RefObject<HTMLDivElement | null>;
  /** The statement's wrapper, which carries the exit. */
  statement: RefObject<HTMLDivElement | null>;
  /** The element inside it, which carries the entrance — see paintStatement. */
  statementReveal: RefObject<HTMLDivElement | null>;
  /** The gray slab dissolving the hero out. */
  veil: RefObject<HTMLDivElement | null>;
  mark: RefObject<HTMLDivElement | null>;
  dictionary: RefObject<HTMLDivElement | null>;
  footer: RefObject<HTMLDivElement | null>;
  /** The footer's rows, faded as one — see FOOTER_REVEAL_EASE. */
  reveals: RefObject<(HTMLDivElement | null)[]>;
  /** The three photographs above the footer's columns, merged in the tail. */
  images: RefObject<(HTMLDivElement | null)[]>;
  /** The landing pads the dots aim at. */
  slots: RefObject<(HTMLSpanElement | null)[]>;
  /** The dots themselves. */
  dots: RefObject<(HTMLSpanElement | null)[]>;
};

/**
 * The pinned scroll-driven sequence: one ScrollTrigger for the scrubbed phases,
 * a separate clock for the tail (scroll only cues it), and two smaller triggers
 * for the veil and the statement's entrance, which have to run before the pin
 * exists. Beat map in ./timeline.
 *
 * A plain function rather than a hook: the caller owns the effect and its
 * dependencies, and everything created here is collected by the returned context.
 */
export function createDefinitionSequence(
  section: HTMLElement,
  els: SequenceEls,
  refs: SequenceRefs,
) {
  const { stage, track, frame, circle } = els;

  return gsap.context(() => {
    const isMobile = window.matchMedia("(max-width: 767.98px)").matches;

    // Speeds up the statement's fade (see paintStatement) without touching the
    // shared hero-linked position/lift math. No-op at 1 on a wide screen.
    const STATEMENT_FADE_BOOST = isMobile ? 2.2 : 1;

    // The pin's own phases are identical on every viewport — only the
    // statement's pre-pin entrance span shortens on mobile (see
    // DEF_MOBILE_STATEMENT_LIFT_END_PCT).
    const phases = {
      STATEMENT_VH,
      GROW_AT,
      GROW_VH,
      FADE_AT,
      FADE_VH,
      DICT_AT,
      DICT_VH,
      TAIL_AT,
      PIN_VH,
      STATEMENT_LIFT_END_PCT: isMobile
        ? DEF_MOBILE_STATEMENT_LIFT_END_PCT
        : STATEMENT_LIFT_END_PCT,
    };

    const { m, measure } = createMeasure(
      { circle, frame, track },
      {
        statement: refs.statement,
        mark: refs.mark,
        dictionary: refs.dictionary,
        footer: refs.footer,
        images: refs.images,
        slots: refs.slots,
        dots: refs.dots,
      },
    );
    measure();

    // Keeps the photo full-bleed and pin-sharp at any circle scale `s`:
    // counter-scaled by 1/s and offset so the window merely uncovers more of a
    // still image rather than magnifying it. Re-placed after any re-measure,
    // not just on scroll, since it's pinned to a measured centre.
    gsap.set(refs.photo.current, { transformOrigin: "0 0", force3D: true });
    const placePhoto = (s: number) => {
      gsap.set(refs.photo.current, {
        x: m.baseSize / 2 - m.cx / s,
        y: m.baseSize / 2 - m.cy / s,
        scale: 1 / s,
        force3D: true,
      });
    };
    placePhoto(1);

    // Parked below the fold before first render, so it can't flash over the
    // statement on the first paint.
    gsap.set(refs.dictionary.current, { y: m.frameH });

    // One frame, from the pin's progress. Named so it's callable after a
    // re-measure too — waiting for the next scroll event would leave the photo
    // visibly out of register in the meantime.
    function render(progress: number) {
      // Progress as real scroll distance through the pin, in vh.
      const vh = progress * phases.PIN_VH;
      const W = document.documentElement.clientWidth;
      const H = window.innerHeight;
      // Exact farthest-corner distance from the circle's true centre, so
      // coverage is guaranteed on any aspect ratio. Recomputed per frame since
      // cy and H can change.
      const corners = [
        [0, 0],
        [W, 0],
        [0, H],
        [W, H],
      ];
      const maxCornerDist = Math.max(
        ...corners.map(([x, y]) => Math.hypot(x - m.cx, y - m.cy)),
      );
      const requiredDiameter = maxCornerDist * 2 * 1.15; // 15% margin
      const maxScale = requiredDiameter / m.baseSize;

      // --- Phase 1: the statement slides up and out (0 – 50vh) ---
      // Transform only, so it never disturbs the layout below it: the image
      // stays exactly where it was measured while the text leaves.
      const outP = gsap.utils.clamp(0, 1, vh / phases.STATEMENT_VH);
      gsap.set(refs.statement.current, {
        y: -outP * m.statementTravel,
        opacity: 1 - outP,
      });

      // --- Phase 2: the window opens until it fills the screen ---
      const growP = gsap.utils.clamp(
        0,
        1,
        (vh - phases.GROW_AT) / phases.GROW_VH,
      );

      // --- Phase 3: the photo dissolves ---
      // FADE_AT is the growth's midpoint, so the photo blooms and goes rather
      // than arriving full-bleed and sitting there. Coverage lands at ~85% of
      // the growth window, which is the knob if that ratio needs to change.
      const fadeP = gsap.utils.clamp(
        0,
        1,
        (vh - phases.FADE_AT) / phases.FADE_VH,
      );

      // One set, not two: a second gsap.set on the same element would rewrite
      // the whole transform and drop the scale.
      const scale = 1 + (maxScale - 1) * growP;
      gsap.set(circle, { scale, opacity: 1 - fadeP, force3D: true });

      // ...and the photo counter-scaled by exactly the inverse, so the window
      // opens over a photo that holds still. Without this the circle's scale
      // would drag the photo to ~6× the size it was rendered at.
      placePhoto(scale);

      // --- Phase 5: the definition travels up (50 – 300vh) ---
      // A pure move, no fade. Computed before the wordmark, even though it
      // happens after it on screen, because the wordmark's cue derives from
      // where this has got to.
      const dictP = gsap.utils.clamp(
        0,
        1,
        (vh - phases.DICT_AT) / phases.DICT_VH,
      );
      // Kept, because the tail's cue is read back off it — see below.
      const dictY = gsap.utils.interpolate(H, -m.dictHeight, dictP);
      gsap.set(refs.dictionary.current, { y: dictY });

      // --- Phase 4: the wordmark slides aside, finished before the
      // definition reaches it ---
      //
      // Driven off the *gap between the two* rather than a fixed vh window:
      // `markP` is the definition's own approach, spread over the last
      // MARK_APPROACH_FRAC of it. A vh window can't know where the definition
      // actually is on a given viewport — this broke twice that way, finishing
      // 35vh late anchored to one end and starting before the definition had
      // even begun climbing anchored to the other.
      //
      // What actually has to hold is horizontal clearance between the
      // wordmark and the panel, which is a different fraction of the slide at
      // every width — so rather than track it, the slide simply finishes.
      const markBottom =
        Math.max(m.markY, m.markY - m.markToMiddle) + m.markH;
      // The definition's own progress when its top edge reaches that, less
      // clearance — measured, since when the two meet depends on the
      // viewport's height and the definition's rendered height.
      const touchP = gsap.utils.clamp(
        0,
        1,
        (H - markBottom - MARK_CLEAR_PX) / (H + m.dictHeight),
      );
      // Guarded against a zero span where the two are already touching at
      // dictP 0. Eased rather than linear — unequalised, the whole slide ran
      // inside ~12vh at 3–4× page speed and read as flung rather than moved.
      const markSpan = Math.max(1e-4, touchP * MARK_APPROACH_FRAC);
      const markP = MARK_SLIDE_EASE(
        gsap.utils.clamp(0, 1, (dictP - (touchP - markSpan)) / markSpan),
      );

      // The slide, and only the slide — the dissolve is a beat of the tail's
      // timeline now, so `opacity` belongs to renderTail. Safe to split: GSAP
      // rebuilds the whole transform per write, so x/y can't be shared, but
      // opacity is a separate property and can be.
      gsap.set(refs.mark.current, {
        x: -m.markToLeft * markP,
        y: -m.markToMiddle * markP,
      });

      // --- Phase 7: the tail is cued, latched inside runTail — the last
      // thing scroll has any say over ---
      //
      // A measured condition (how much of the definition stands above the
      // fold, as a share of its own height), not a vh mark — that share isn't
      // constant across viewports. TAIL_AT is a constant backstop, since
      // PIN_VH can't depend on anything measured.
      const dictAbove = m.dictHeight > 0 ? -dictY / m.dictHeight : 0;
      runTail(dictAbove >= LOGO_FADE_ABOVE_FRAC || vh >= phases.TAIL_AT);
    }

    /**
     * One frame of the tail, on its own clock in seconds — deliberately off
     * the scrub, since a dot frozen mid-bounce or a wordmark frozen mid-fade
     * has no reading as a still image. Same motion as before, just moved onto
     * this clock instead of the scroll's.
     */
    function renderTail(t: number) {
      // --- the wordmark dissolves, in place (0 – 0.8s) ---
      // Doesn't move, shrink or rise — the three dots are separate elements
      // standing on the artwork's own, so the letterforms just thin out from
      // under them. On this clock rather than the scrub, since a scrub can
      // freeze it mid-fade with no good reading (e.g. three dots alone on gray).
      const markFadeP = LOGO_FADE_EASE(
        gsap.utils.clamp(0, 1, t / LOGO_FADE_SECONDS),
      );
      gsap.set(refs.mark.current, { opacity: 1 - markFadeP });

      // --- the camera pans onto the footer (0.8 – 1.7s) ---
      // Behind the dissolve rather than across it (PAN_AT) — moving early
      // would slide the wordmark's letterforms out from under their own dots.
      // `panRaw` stays uneased for the photographs below, timed as a fraction
      // of the pan.
      const panRaw = gsap.utils.clamp(0, 1, (t - PAN_AT) / PAN_SECONDS);
      const panP = PAN_EASE(panRaw);
      gsap.set(track, { y: panP * m.camEnd });

      // --- and its contents resolve in, over exactly the dots' flight ---
      // One value for the whole footer, so nothing is half-resolved while the
      // rest isn't. Outlasts the camera by over a second on purpose — a fade
      // that finished mid-pan would be spent while the footer was still rising.
      const revealP = FOOTER_REVEAL_EASE(
        gsap.utils.clamp(0, 1, (t - m.releaseAt) / DROP_SECONDS),
      );
      for (const el of refs.reveals.current) {
        if (el) gsap.set(el, { opacity: revealP });
      }

      // --- the three photographs resolve, then close into one ---
      // On this clock so the close is frame-locked to the fall below it — see
      // IMAGE_IN. Only `x` is written; the panels keep their own width, height
      // and proportions and simply slide until their edges meet, so the end
      // state is one continuous image rather than a stack. The middle panel is
      // the anchor (`dx` 0), so the row closes inward symmetrically.
      const imageInP = IMAGE_IN_EASE(spanP(panRaw, IMAGE_IN));
      const mergeP = IMAGE_MERGE_EASE(
        gsap.utils.clamp(0, 1, (t - m.releaseAt) / DROP_SECONDS),
      );
      for (let i = 0; i < refs.images.current.length; i++) {
        const el = refs.images.current[i];
        const g = m.images[i];
        if (!el || !g) continue;
        gsap.set(el, { x: g.dx * mergeP, opacity: imageInP });
      }

      // --- the dots fall (from m.releaseAt) ---
      // The vertical is a real trajectory under acceleration (see planFall),
      // not an interpolation — that's what makes it read as weight rather than
      // a tween. Only the horizontal is eased. Both ends are fixed screen
      // positions with the camera in neither; interpolating against the live
      // wordmark/footer positions instead throws the dot off-screen as both
      // endpoints move under it.
      const driftScale = Math.min(1, document.documentElement.clientWidth / 1440);
      for (let i = 0; i < LOGO_DOTS.length; i++) {
        const dot = refs.dots.current[i];
        const d = m.dots[i];
        if (!dot || !d) continue;

        // One release for all three (see DROP_SECONDS); each flight then runs
        // at its own length under the one shared gravity.
        const p = gsap.utils.clamp(
          0,
          1,
          (t - m.releaseAt) / (DROP_SECONDS * d.fall.share),
        );
        const ph = DOT_PHYSICS[i];
        // Its own exponent, so lateral travel isn't a shared curve either.
        const glide = 1 - (1 - p) ** ph.drag;

        gsap.set(dot, {
          xPercent: -50,
          yPercent: -50,
          // Bow rides raw progress so it closes as the dot rests; the kick and
          // ring are both spent well before that.
          x:
            gsap.utils.interpolate(d.fromX, d.toX, glide) +
            Math.sin(Math.PI * p) * ph.drift * driftScale +
            bump(p, KICK_SPAN) * ph.kick,
          // The solved trajectory, plus a small anticipation dip before launch
          // and give on impact.
          y:
            d.fromY +
            fallAt(d.fall, p) +
            bump(p, ANT_SPAN) * ph.anticipate +
            penetrationAt(d.fall, p),
          // Squash on launch wind-up and on each impact — the same pulse as
          // the penetration, since they're the same event. Both terms hit
          // zero by p = 1.
          scale:
            gsap.utils.interpolate(d.scale0, 1, glide) *
            (1 -
              0.09 * bump(p, ANT_SPAN) -
              (0.11 * penetrationAt(d.fall, p)) / DOT_PENETRATE_PX),
        });
      }

      // Presence is on this clock too, and only this one — `render` no longer
      // has any say in it.
      paintDots();
    }

    /**
     * The dots' presence — visibility and opacity — separate from their
     * movement. Fades up across the back of the wordmark's dissolve
     * (DOT_CROSSFADE_LEAD controls the lead) so the artwork's own dots and the
     * overlay always paint as one solid dot. One clock now, which is the whole
     * simplification: this used to interpolate between two, back when the
     * dissolve was scrubbed and the flight was not, and a fast scroll could
     * fade a dot out from under itself before the flight caught up.
     */
    function paintDots() {
      const opacity = gsap.utils.clamp(
        0,
        1,
        (tail.t - LOGO_FADE_SECONDS * DOT_CROSSFADE_LEAD) /
        (LOGO_FADE_SECONDS * (1 - DOT_CROSSFADE_LEAD)),
      );
      // Hidden before the dissolve begins — these are children of the stage,
      // so they paint above the frame's whole contents including the
      // definition, which has to pass over the wordmark where the two overlap.
      const lit = tailOn || tail.t > 0;
      for (const dot of refs.dots.current) {
        if (!dot) continue;
        gsap.set(dot, { visibility: lit ? "visible" : "hidden", opacity });
      }
    }

    /**
     * The tail's clock and its start latch. `t` is seconds into the gesture;
     * crossing TAIL_AT tweens it to the end, crossing back tweens it home.
     * Duration scales by how far there is left to go, so an interrupted run
     * reverses at the same speed rather than always taking the full
     * TAIL_SECONDS.
     */
    const tail = { t: 0 };
    let tailOn = false;
    let tailTween: gsap.core.Tween | null = null;
    function runTail(go: boolean) {
      if (go === tailOn) return;
      tailOn = go;
      tailTween?.kill();
      const to = go ? TAIL_SECONDS : 0;
      const left = Math.abs(to - tail.t) / TAIL_SECONDS;
      tailTween = gsap.to(tail, {
        t: to,
        duration: (go ? TAIL_SECONDS : TAIL_BACK_SECONDS) * left,
        // The trajectory carries its own acceleration; easing the clock too
        // would be gravity applied twice.
        ease: "none",
        overwrite: "auto",
        onUpdate: () => renderTail(tail.t),
      });
    }
    renderTail(0);

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 1,
      pin: stage,
      pinSpacing: false,
      onUpdate: (self) => render(self.progress),
      // A resize is the one thing a measure-once-at-mount can't survive.
      // Re-rendering immediately keeps the photo in register instead of
      // leaving it offset until the next scroll event.
      onRefresh: (self) => {
        measure();
        render(self.progress);
        // The tail's endpoints came from that same measurement, so redraw it
        // at wherever its own clock has reached — it isn't on the scrub, so
        // nothing else would put it back in register.
        renderTail(tail.t);
      },
    });

    // The other thing that moves layout after mount: the webfont landing
    // changes the statement's height (and the footer's), which can shift `cy`
    // and the dots' targets.
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      measure();
      render(trigger.progress);
      renderTail(tail.t);
    });

    /**
     * `baseSize` fails worst of the measurements if it goes stale — through
     * placePhoto the error is multiplied by the window's own scale, so the
     * photo visibly drifts as the circle grows. A ResizeObserver is the only
     * way to catch a resize that isn't the window's own: watches the circle,
     * the frame (for its vh terms, which can lag the window's resize event on
     * mobile), and the footer (a heading rewrap moves every dot's target).
     */
    const sizeObserver = new ResizeObserver(() => {
      measure();
      render(trigger.progress);
      renderTail(tail.t);
    });
    sizeObserver.observe(circle);
    sizeObserver.observe(frame);
    if (refs.footer.current) sizeObserver.observe(refs.footer.current);

    /**
     * Cross-fades out of the hero: scrubs the veil's opacity 0→1 across the
     * hero's dead tail, so its last frame dissolves into this section's gray
     * while still pinned. Opacity rather than a gradient, which can't do this
     * job — a gradient's transparent end sits at the top exactly when the
     * boundary appears at the bottom, while opacity can be fully committed
     * before the crossing begins. onLeave/onLeaveBack pin the end states,
     * since onUpdate only fires inside the range.
     */
    const veil = refs.veil.current;
    // Eased — a linear ramp on the way back up reads as the hero snapping in,
    // since arriving detail grabs the eye. sine.inOut is the gentlest inOut
    // curve for a full-screen dissolve.
    const veilEase = gsap.parseEase("sine.inOut");
    const veilTrigger = ScrollTrigger.create({
      trigger: section,
      start: `top ${VEIL_VH}%`,
      end: "top bottom",
      onUpdate: (self) => gsap.set(veil, { opacity: veilEase(self.progress) }),
      onLeave: () => gsap.set(veil, { opacity: 1 }),
      onLeaveBack: () => gsap.set(veil, { opacity: 0 }),
    });

    /**
     * The statement resolving in, on the frame it becomes visible — one timed
     * move rather than a scrub (see STATEMENT_LIFT_VH). Its own trigger
     * because it has to fire before the pin exists: the pin waits for this
     * section's top edge to reach the viewport top, but this has to fire as
     * soon as that edge clears the *bottom*. Writes the inner element while
     * `render` writes the wrapper for the exit, since either write would
     * rebuild the whole transform and drop the other.
     */
    const paintStatement = (progress: number) => {
      const raw = gsap.utils.clamp(0, 1, progress);
      gsap.set(refs.statementReveal.current, {
        // Travel: raw, so the net motion is monotonically upward. Easing this
        // too made the curve leave at twice its average rate — faster than
        // the page, and therefore *downward* for the first third.
        //
        // `m.statementLiftPx` rather than `STATEMENT_LIFT_VH * window.innerHeight`
        // read live — see the field's own doc in ./measure. This paints on every
        // scroll event and every ticker tick (see syncStatement below), so a live
        // read multiplies a moving `raw` by a value the mobile address bar can also
        // be moving, and the two drifting against each other reads as a flicker
        // rather than a lift.
        y: -(1 - raw) * m.statementLiftPx,
        // Presence: the hero's wash, not the scroll — the wash is cued and
        // finishes wherever the reader stops, so a scroll-mapped fade can't
        // keep up with it in either direction. Boosted on mobile — see
        // STATEMENT_FADE_BOOST above.
        opacity: STATEMENT_FADE_EASE(
          gsap.utils.clamp(
            0,
            1,
            (heroWash.active ? heroWash.p : 1) * STATEMENT_FADE_BOOST,
          ),
        ),
      });
    };

    // The wash runs on its own clock, so a frame it moved on isn't
    // necessarily a frame this section's own trigger fired — repainting off
    // the ticker keeps the statement in step with it. `active` is part of the
    // key, not just `p`, because this section's sequence builds a commit
    // before the hero's, so the first paint here would otherwise miss the
    // hero's own first update.
    let lastWash = -1;
    let lastActive = false;
    const syncStatement = () => {
      if (heroWash.p === lastWash && heroWash.active === lastActive) return;
      lastWash = heroWash.p;
      lastActive = heroWash.active;
      paintStatement(statementTrigger.progress);
    };
    gsap.ticker.add(syncStatement);
    const statementTrigger = ScrollTrigger.create({
      trigger: section,
      start: `top ${STATEMENT_REVEAL_AT_PCT}%`,
      end: `top ${phases.STATEMENT_LIFT_END_PCT}%`,
      scrub: 1,
      onUpdate: (self) => paintStatement(self.progress),
      onLeave: () => paintStatement(1),
      onLeaveBack: () => paintStatement(0),
    });
    // Resting state for a restored scroll position — `scrub` doesn't paint
    // until the reader moves, so a page opening mid-scroll would otherwise
    // show the paragraph low and transparent until the first scroll event.
    paintStatement(statementTrigger.progress);

    return () => {
      cancelled = true;
      gsap.ticker.remove(syncStatement);
      sizeObserver.disconnect();
      // Created inside runTail, so the context never collected it.
      tailTween?.kill();
      trigger.kill();
      veilTrigger.kill();
      statementTrigger.kill();
    };
  }, section);
}
