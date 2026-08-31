import type { RefObject } from "react";
import { gsap } from "@/lib/gsap";
import { DOT_PHYSICS, LOGO_DOTS, planFall, type Fall } from "./dots";
import {
  DICT_VH,
  DROP_LEAD_MIN,
  DROP_MARGIN_SECONDS,
  DROP_SECONDS,
  IMAGE_ANCHOR,
  IMAGE_SEAM_BLEED_PX,
  LOGO_FADE_ABOVE_FRAC,
  LOGO_FADE_CAP_FRAC,
  PAN_END,
  STATEMENT_LIFT_VH,
} from "./timeline";

/** The elements the composition is measured against. */
export type MeasureEls = {
  /** The round window, whose computed width is the composition's base size. */
  circle: HTMLElement;
  /** The track's first screen — the composition's coordinate space. */
  frame: HTMLElement;
  /** Both screens, which is the space the footer's slots are measured in. */
  track: HTMLElement;
};

/** Everything else `measure` reads, as refs — none of it is guaranteed to exist. */
export type MeasureRefs = {
  statement: RefObject<HTMLDivElement | null>;
  mark: RefObject<HTMLDivElement | null>;
  dictionary: RefObject<HTMLDivElement | null>;
  footer: RefObject<HTMLDivElement | null>;
  slots: RefObject<(HTMLSpanElement | null)[]>;
  dots: RefObject<(HTMLSpanElement | null)[]>;
  /** The three photographs above the footer's columns — see IMAGE_ANCHOR. */
  images: RefObject<(HTMLDivElement | null)[]>;
};

/**
 * Everything the per-frame handler needs from the layout, re-read whenever it can have
 * moved rather than measured once at mount. `cy` is why that matters: a stale value leaves
 * the growing window uncovering the section background past the photo layer's edge, which
 * reads as a straight-edged crop.
 */
export type Measurements = {
  baseSize: number;
  cx: number;
  cy: number;
  frameH: number;
  statementTravel: number;
  /**
   * STATEMENT_LIFT_VH converted to px, cached here rather than read live from
   * `window.innerHeight`. Below `md`, a real touch scroll leaves the address bar
   * mid-collapse for stretches of the gesture, and `innerHeight` tracks it live — so a
   * value multiplied by it every frame would drift independent of scroll progress, which
   * reads as the entrance flickering. Re-read on the same cadence as everything else here
   * (refresh, resize) instead.
   */
  statementLiftPx: number;
  markX: number;
  markY: number;
  markW: number;
  markH: number;
  markToLeft: number;
  markToMiddle: number;
  markCentreY: number;
  dictHeight: number;
  camEnd: number;
  /** Seconds into the tail at which the dots let go — solved in `measure`. */
  releaseAt: number;
  /**
   * How far each photograph slides for the row to close into one continuous image —
   * horizontal only, panel size untouched. Solved from the measured boxes rather than the
   * grid's `gap`, so it tracks breakpoint gap changes without restating them.
   */
  images: ({ dx: number } | null)[];
  slots: ({ x: number; y: number; size: number } | null)[];
  dots: ({
    fromX: number;
    fromY: number;
    toX: number;
    scale0: number;
    fall: Fall;
  } | null)[];
};

/**
 * Position within `root`, accumulated up the offsetParent chain — not
 * getBoundingClientRect, which includes transforms and is only meaningful before anything
 * has animated. offsetTop/offsetLeft are layout values, so this stays correct mid-scroll
 * with the circle scaled six times over.
 *
 * Two roots are used: the composition is measured against `frame` (the track's first
 * screen, so an offset inside it is the on-screen position both before and after the pin
 * engages); the footer's dot slots are measured against `track`, which folds in the
 * frame's own height, and the camera's `y` converts both to the same screen space.
 */
function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  for (
    let node: HTMLElement | null = el;
    node && node !== root;
    node = node.offsetParent as HTMLElement | null
  ) {
    x += node.offsetLeft;
    y += node.offsetTop;
  }
  return { x, y };
}

/**
 * The layout figures and the function that refreshes them, handed back together: `measure`
 * writes into the same `m` every caller reads, so the object identity is the contract.
 *
 * Called on ScrollTrigger's refresh, on `document.fonts.ready`, and from a
 * ResizeObserver — see ./sequence for why each is load-bearing.
 */
export function createMeasure(els: MeasureEls, refs: MeasureRefs) {
  const { circle, frame, track } = els;

  const m: Measurements = {
    baseSize: 1,
    cx: 0,
    cy: 0,
    frameH: 1,
    statementTravel: 0,
    statementLiftPx: 0,
    markX: 0,
    markY: 0,
    markW: 1,
    markH: 1,
    markToLeft: 0,
    markToMiddle: 0,
    markCentreY: 0,
    dictHeight: 0,
    camEnd: 0,
    releaseAt: PAN_END + DROP_MARGIN_SECONDS,
    images: [],
    slots: [],
    dots: [],
  };

  function measure() {
    // Computed style, not a rect, so the circle's scale transform doesn't affect it.
    m.baseSize = parseFloat(getComputedStyle(circle).width) || 1;
    const circleAt = offsetIn(circle, frame);
    m.cx = circleAt.x + m.baseSize / 2;
    m.cy = circleAt.y + m.baseSize / 2;
    m.frameH = frame.offsetHeight || 1;
    m.statementLiftPx = STATEMENT_LIFT_VH * window.innerHeight;

    // To exactly where the statement's bottom edge meets the frame's top, so it's fully
    // gone rather than relying on the fade to hide a stub.
    const statement = refs.statement.current;
    m.statementTravel = statement
      ? offsetIn(statement, frame).y + statement.offsetHeight
      : 0;

    // The wordmark's resting place: hard left against the frame's padding, up to vertical
    // middle. Centre line and box are kept too — the slide's cue reads the former, the
    // dots' placement the latter.
    const mark = refs.mark.current;
    const padLeft = parseFloat(getComputedStyle(frame).paddingLeft) || 0;
    if (mark) {
      const markAt = offsetIn(mark, frame);
      m.markX = markAt.x;
      m.markY = markAt.y;
      m.markW = mark.offsetWidth || 1;
      m.markH = mark.offsetHeight || 1;
      m.markToLeft = markAt.x - padLeft;
      m.markCentreY = markAt.y + mark.offsetHeight / 2;
      m.markToMiddle = m.markCentreY - m.frameH / 2;
    }

    // So the definition's travel can end with the whole block clear of the top rather than
    // a guessed offset.
    const dict = refs.dictionary.current;
    m.dictHeight = dict?.offsetHeight ?? 0;

    // Hard requirement: the definition's resting box must clear the wordmark's. Checked on
    // the measured boxes rather than the constants they came from, so a change to the
    // frame's padding, MARK_WIDTH, or the panel's width all show up here.
    //
    // `offsetWidth > 0` gates on visibility — below `lg` the panel is hidden and the
    // definition renders in flow instead, with nothing to clear.
    if (
      process.env.NODE_ENV !== "production" &&
      dict &&
      dict.offsetWidth > 0
    ) {
      const clearance = offsetIn(dict, frame).x - (padLeft + m.markW);
      if (clearance < 0) {
        console.error(
          "[DefinitionSection] the definition's resting box overlaps the wordmark's " +
          `by ${(-clearance).toFixed(0)}px, so the words will climb across the logo ` +
          "however the two are timed — the wordmark's lead can only separate them in " +
          "time, not in space. Narrow the panel against MARK_WIDTH, widen the frame, " +
          "or move the panel's breakpoint up so this width takes the in-flow " +
          "rendering. See DictionaryPanel.",
          {
            panelLeft: offsetIn(dict, frame).x,
            markRestRight: padLeft + m.markW,
            markW: m.markW,
            padLeft,
          },
        );
      }
    }

    // The tail's other hard requirement: the dots paint above the definition and are lit
    // when the cue fires, so the cue must land after the definition's bottom edge clears
    // the wordmark's top — or three solid dots show through the body text.
    //
    // Both sides are solved from the measured boxes, since both move with the viewport:
    // the block's bottom clears `markTop` at `(H + D − markTop)/(H + D)` of the climb; the
    // cue fires at `(f + H/D)/(1 + H/D)`, capped by LOGO_FADE_CAP_FRAC.
    if (
      process.env.NODE_ENV !== "production" &&
      dict &&
      dict.offsetWidth > 0 &&
      m.dictHeight > 0
    ) {
      const H = window.innerHeight;
      const D = m.dictHeight;
      const markTop = m.markY - m.markToMiddle;
      const crossP = (H + D - markTop) / (H + D);
      const cueP = Math.min(
        LOGO_FADE_CAP_FRAC,
        (LOGO_FADE_ABOVE_FRAC + H / D) / (1 + H / D),
      );
      if (cueP <= crossP) {
        console.error(
          "[DefinitionSection] the tail would be cued while the definition is still " +
          `crossing the wordmark: the cue lands at ${cueP.toFixed(3)} of the climb ` +
          `and the crossing only finishes at ${crossP.toFixed(3)}, so the dots would ` +
          `be lit ${((crossP - cueP) * DICT_VH).toFixed(1)}vh early and paint over ` +
          "the body text. Lower LOGO_FADE_ABOVE_FRAC, or raise LOGO_FADE_CAP_FRAC if " +
          "that is what is binding.",
          { cueP, crossP, H, dictHeight: D, markTop },
        );
      }
    }

    // How far the camera travels: enough to bring the footer's bottom edge onto the
    // viewport's. Measured rather than "one viewport" so the footer can be whatever height
    // its own content makes it.
    //
    // Both clamps matter: zero, so a short footer can't pan backwards; the footer's own
    // top, because a footer taller than the viewport must lose its bottom edge rather than
    // its top — losing the top would take the first column's dot off screen, which this
    // sequence can't survive.
    const footer = refs.footer.current;
    if (footer) {
      const footerTop = offsetIn(footer, track).y;
      const seated = m.frameH - (footerTop + footer.offsetHeight);
      m.camEnd = Math.min(0, Math.max(seated, -footerTop));
    } else {
      m.camEnd = 0;
    }

    // How far each photograph slides for the row to close into one continuous image.
    // Walked outward from the anchor, accumulating widths, so each panel's target left
    // edge is simply its neighbour's right edge — no gap value restated.
    const panels = refs.images.current;
    const anchor = panels[IMAGE_ANCHOR];
    if (!anchor) {
      m.images = panels.map(() => null);
    } else {
      const anchorLeft = offsetIn(anchor, track).x;
      const targetLeft: number[] = [];
      // Outward to the left: each panel's right edge lands on the next one's left.
      let edge = anchorLeft;
      for (let i = IMAGE_ANCHOR; i >= 0; i--) {
        if (i < IMAGE_ANCHOR) edge -= panels[i]?.offsetWidth ?? 0;
        // Tucked a hair under, so rounding can't open a hairline at the join.
        targetLeft[i] = edge + (i < IMAGE_ANCHOR ? IMAGE_SEAM_BLEED_PX : 0);
      }
      // And to the right.
      edge = anchorLeft;
      for (let i = IMAGE_ANCHOR + 1; i < panels.length; i++) {
        edge += panels[i - 1]?.offsetWidth ?? 0;
        targetLeft[i] = edge - IMAGE_SEAM_BLEED_PX;
      }
      m.images = panels.map((el, i) =>
        el ? { dx: targetLeft[i] - offsetIn(el, track).x } : null,
      );
    }

    // Where each dot is going. The dot takes the slot's size, itself derived from the
    // wordmark's dot (see FOOTER_DOT_SIZE), so the flight neither grows nor shrinks it.
    m.slots = LOGO_DOTS.map((_, i) => {
      const slot = refs.slots.current[i];
      if (!slot) return null;
      const at = offsetIn(slot, track);
      const size = slot.offsetWidth || 1;
      const dot = refs.dots.current[i];
      if (dot) gsap.set(dot, { width: size, height: size });
      return { x: at.x + size / 2, y: at.y + size / 2, size };
    });

    // Both ends of every fall, solved here rather than per frame since none of it changes
    // until the layout does. The release point is the wordmark at rest (settled 150vh
    // before any of this begins), not the live position, so the trajectory can be planned
    // ahead.
    const restX = m.markX - m.markToLeft;
    const restY = m.markY - m.markToMiddle;
    m.dots = LOGO_DOTS.map((d, i) => {
      const slot = m.slots[i];
      if (!slot) return null;
      const fromY = restY + d.cy * m.markH;
      const phys = DOT_PHYSICS[i];
      return {
        fromX: restX + d.cx * m.markW,
        fromY,
        toX: slot.x,
        // 1 by construction, since the slot is sized from this same product (see
        // FOOTER_DOT_SIZE) — kept as a ratio rather than dropped, so a rounded slot
        // measurement or a future change at either end is absorbed here, not seen.
        scale0: (d.d * m.markW) / slot.size,
        fall: planFall(
          slot.y + m.camEnd - fromY,
          phys.lift,
          phys.restitution,
        ),
      };
    });

    // One gravity for all three: the longest trajectory gets the whole budget and the
    // others get the same fraction of it their own flight time is of that one — a dot
    // with half the drop finishes early and sits there, same as dropping two real balls
    // from different heights.
    const longest = Math.max(
      1,
      ...m.dots.map((d) => d?.fall.total ?? 0),
    );
    for (const d of m.dots) {
      if (d) d.fall.share = d.fall.total / longest;
    }

    // When they may let go: as late as possible, but early enough that the soonest
    // landing still happens after the camera has stopped. Solved rather than a fixed
    // constant, because the needed lead swings too much across viewports (about a third
    // of a fall on desktop, an eighth on a short phone) for one hand-set value to fit all
    // of them without over-holding most of them.
    const lead = Math.min(
      ...m.dots.map((d) =>
        d ? (DROP_SECONDS * d.fall.land) / longest : Infinity,
      ),
    );
    // From PAN_END, not PAN_SECONDS: the camera now sits behind the wordmark's dissolve
    // (see PAN_AT), so the moment it stops is that much later.
    m.releaseAt = Math.max(
      0,
      PAN_END +
      DROP_MARGIN_SECONDS -
      (Number.isFinite(lead) ? lead : DROP_LEAD_MIN * DROP_SECONDS),
    );

    if (
      process.env.NODE_ENV !== "production" &&
      lead < DROP_LEAD_MIN * DROP_SECONDS
    ) {
      console.error(
        "[DefinitionSection] a dot would land before the camera stops: " +
        `measured lead ${lead.toFixed(2)}s is under DROP_LEAD_MIN ` +
        `(${(DROP_LEAD_MIN * DROP_SECONDS).toFixed(2)}s). Lower that ` +
        "constant — TAIL_SECONDS is derived from it, so the gesture grows " +
        "as it falls.",
        { lead, releaseAt: m.releaseAt },
      );
    }
  }

  return { m, measure };
}
