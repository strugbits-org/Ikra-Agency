"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { BAND_CLIP_UNDRAWN, LEAP_GAP, type BandGeometry } from "./band";
// ── RESTORE THE WAVE — step 1 of 5 ── uncomment the import below.
//
// The wave is off. Bringing it back is five edits, every one of them tagged
// "RESTORE THE WAVE" — grep for it — and they have to be done together:
//
//   1. this import;
//   2. the <WavyBand> element further down this file;
//   3. in ./timeline.ts, delete the fourth GAP_LINES entry — "holding your business
//      back" is the ribbon's own copy and joined the gap copy only because the ribbon
//      went away, so with the wave back it would otherwise be said twice;
//   4. in ./timeline.ts, LEAP_AT and LEAP_IN_VH back to their wave-driven form, so the
//      closing line waits for the ribbon to clear the seat again instead of arriving on
//      the copy's cadence;
//   5. in ./sequence.ts, `bandVis` / `bandClear` and the BAND_CLEAR_AT import, which
//      are the gate that keeps the line and the wave out of that shared seat.
//
// import WavyBand from "./WavyBand";

// `until you make the leap` used to be sized off its own span between the wedges
// (LEAP_EMS/LEAP_EMS_STACKED, a since-removed pair of clamps), which is why it never
// matched GAP_LINES: two different formulas solving two different spans agree at no
// width. It now renders at exactly GapCopy's own solved size instead — `leapFontSize`
// below, threaded down from `gapCopyFontSize(stageBox.w)` in HeroNarrative, the same
// value GAP_LINES itself uses — so the two read as one continuous piece of type
// rather than a handoff between two sizes.
//
// That leaves nothing here to predict the rendered width from: at a shared size the
// line no longer shrinks to fit its own span, so whether it fits has to be measured,
// not solved. See the `stacked` state below.

// Summed from the advance widths in
// public/fonts/ZalandoSansSemiExpanded-VariableFont_wght.ttf at weight 500
// (font-medium, matching GapCopy): "until you " is 4.494em, "make the leap" 7.009em.
// Kept only as context for the measurement below, not as an input to it — HVAR
// deltas make weight 500 wider than the raw 400 sums by an amount worth measuring
// rather than padding for.

/**
 * Small fixed clearance kept between the closing line's measured width and the
 * wedges' inner edges, in px. Not a proportional margin the way GAP_COPY_INSET is —
 * this line renders at GAP_LINES' own solved size with nothing left to shed for
 * breathing room, so the only thing left to guard against is sub-pixel rounding in
 * the measurement itself. Same job BAND_TUCK_PX and DOOR_PANEL_BLEED_PX do
 * elsewhere in this section.
 */
const LEAP_CLEARANCE_PX = 8;

// `whitespace-nowrap` on both the real line and its measurer: wrapping where it was
// not asked for would only ever mean the fit was measured wrong. The break on a
// narrow stage is an explicit <br/>, which nowrap does not suppress.
const leapCopy = (stacked: boolean) => (
  <p className="leading-[1.3] font-medium whitespace-nowrap text-ink">
    until you
    {stacked ? <br /> : " "}
    <span className="text-accent">make the leap</span>
  </p>
);

/**
 * The wavy ribbon bridging the two door wedges, and the closing line that takes
 * the space it vacates. Both are placed against the ribbon's measured geometry, so
 * they mount only once the stage has been measured.
 */
export default function BandLayer({
  band,
  reducedMotion,
  ribbonRef,
  leapRef,
  leapFontSize,
}: {
  band: BandGeometry | null;
  reducedMotion: boolean;
  ribbonRef: RefObject<HTMLDivElement | null>;
  leapRef: RefObject<HTMLDivElement | null>;
  leapFontSize: number;
}) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const [stacked, setStacked] = useState(band?.narrow ?? false);

  /**
   * Whether the closing line fits its seat on one line, at `leapFontSize` — measured
   * against a hidden nowrap clone rather than predicted from ems, because at a size
   * shared with GAP_LINES there is no formula here left to predict a rendered width
   * with; only the browser, for this font/weight/size, knows it. Runs before paint
   * (`useLayoutEffect`), so the corrected value commits before anything is visible —
   * the initial guess above only has to hold for a discarded first frame.
   *
   * Measured again once `document.fonts.ready` resolves: a cold load can run this
   * effect against the fallback font's metrics before the real one swaps in, same
   * race `SmoothScrollProvider` already re-syncs `ScrollTrigger` against.
   */
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!band || !el) return;
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const fits = el.scrollWidth <= band.width - LEAP_CLEARANCE_PX;
      setStacked((prev) => (prev === !fits ? prev : !fits));
    };
    measure();
    document.fonts.ready.then(measure);
    return () => {
      cancelled = true;
    };
  }, [band, leapFontSize]);

  if (!band) return null;

  return (
    <>
      {/* Placed at the geometry's own `top`, not centred, because its ends have
          to meet the wedge corners exactly.

          Sits *below* the doors (z-5 against z-10), which changes nothing about
          the finished composition but does mean panels sliding back in on an
          upward scroll cover a ribbon that is still closing rather than leaving
          it on top of the orange. */}
      <div
        ref={ribbonRef}
        className="pointer-events-none absolute z-[5]"
        style={{
          left: band.inset,
          right: band.inset,
          top: band.top,
          clipPath: reducedMotion ? undefined : BAND_CLIP_UNDRAWN,
        }}
      >
        {/* ── RESTORE THE WAVE — step 2 of 5 ── uncomment the element below.

            Nothing else about this wrapper changes. It carries no colour of its
            own — the orange is the SVG's path — so with the element commented out
            it renders nothing at all, while `sequence` goes on driving its clip and
            the closing line below goes on arriving off the wave's own progress. */}
        {/* <WavyBand g={band} animate={!reducedMotion} /> */}
      </div>

      {/* Hidden one-line clone, same text/weight/size as the real line, laid out
          off-screen (opacity-0, out of flow) purely so its natural nowrap width can
          be read — see the `stacked` effect above. Never itself visible. */}
      <span
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute font-medium whitespace-nowrap opacity-0"
        style={{ fontSize: leapFontSize }}
      >
        until you make the leap
      </span>

      {/* Centred on the stage rather than boxed inside the band's inset: sized to
          its own content and pulled back half its width, so its midpoint is the
          screen's at any font size. Being unboxed is what keeps any overhang even
          rather than all on one side — it is not a licence to overhang.

          On the ribbon's centre line, since it takes over that space once the
          ribbon clears — and rendered at `leapFontSize`, GAP_LINES' own solved
          size, so the two read as one piece of type rather than a handoff between
          sizes. Whether that fits on one line or has to break in two (see
          `stacked` above) is measured against the real span between the wedges at
          that size, not assumed from a breakpoint — the one-line floor used to
          overflow onto them, and half the words are `text-accent` over
          accent-coloured orange.

          Translate-centring is GSAP's here (xPercent, from leapSeat), not the
          class list's. Reduced motion has no GSAP, so it keeps the class and stays
          below the band — where it must be, since the ribbon is drawn in full
          there and never clears. */}
      <div
        ref={leapRef}
        className={`pointer-events-none absolute left-1/2 z-20 text-center ${reducedMotion ? "-translate-x-1/2" : ""
          }`}
        style={{
          top: reducedMotion
            ? band.top + band.height + LEAP_GAP
            : band.top + band.height / 2,
          fontSize: leapFontSize,
          opacity: reducedMotion ? 1 : 0,
        }}
      >
        {leapCopy(stacked)}
      </div>
    </>
  );
}
