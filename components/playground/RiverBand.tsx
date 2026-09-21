"use client";

import { useEffect, useId, useRef } from "react";
import { gsap } from "@/lib/gsap";
import type { RiverGeometry } from "./river";
import {
  MARQUEE_SPEED,
  RIVER_GAP,
  RIVER_MARKER,
  RIVER_TEXT,
} from "./timeline";

/**
 * The river: one path, drawn twice — as a stroke, and as the line the copy rides.
 *
 * **It is a stroke, not a solved outline.** `hero/band.ts` builds its ribbon by offsetting a
 * wave function up and down by half a thickness, which works there because that wave is
 * shallow. This path doubles back four times and its tightest bend has a 55px radius against
 * an 80px width, where a vertical offset is not the perpendicular one and the two edges stop
 * being parallel. A stroke is the construction that holds a constant width through any bend,
 * and `round` caps and joins are what the reference shows at the bottom-left corner.
 *
 * **The copy rides an SVG textPath**, which is what tilts each glyph tangent to the river and
 * makes containment structural: a glyph past either end simply is not rendered. It reads
 * *upstream*, toward the top-right — which is why `river.ts` hands over its points already
 * reversed, since a textPath has no way to run against its own path.
 *
 * **Two things about text on a path are engine-dependent, and this file shipped wrong on both
 * of them in Safari while looking correct in every browser we can open here** — reported by the
 * client, off a screen we had no way to see. They are the `dominant-baseline` on the textPath
 * and the measuring `<text>` at the end of the markup; each says what WebKit does differently
 * and what it cost. Both were measured in WebKit itself, which is worth knowing is available:
 * Playwright ships the real engine, so `webkit.launch()` renders this page on the same code
 * Safari does. The rule they share is the one `hero/band.ts` already follows — where a choice
 * exists, put the answer in geometry or in a measurement of our own rather than in an SVG text
 * property, because that is the corner of the platform the engines disagree in.
 *
 * Not scroll-driven. The river is measured stationary in the viewport across the whole
 * reference clip while the copy beside it climbs, so the marquee keeps running through the
 * scroll hold.
 */
export default function RiverBand({
  river,
  width,
  height,
  animate,
}: {
  river: RiverGeometry;
  width: number;
  height: number;
  animate: boolean;
}) {
  const textPathRef = useRef<SVGTextPathElement>(null);
  const measureRef = useRef<SVGTextElement>(null);
  // Sanitised: useId's output contains colons, awkward in a URL fragment.
  const pathId = `river-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const unit = `${RIVER_TEXT}${RIVER_GAP}${RIVER_MARKER}${RIVER_GAP}`;
  // Enough repetitions to overfill the path twice over. Twice, not once, because the marquee
  // runs *forward* along the path: it starts a full repetition behind the path's own start
  // and tweens up to it, so the copy has to reach the far end from that offset position.
  const repeats = Math.max(
    4,
    Math.ceil(pathLength(river) / (unit.length * river.fontSize * 0.55)) + 3,
  );

  useEffect(() => {
    const textPath = textPathRef.current;
    const measure = measureRef.current;
    if (!animate || !textPath || !measure) return;

    let tween: ReturnType<typeof gsap.to> | null = null;
    let cancelled = false;

    // Measured only once the webfont has settled: a fallback-font measurement makes the loop
    // length wrong and puts a visible jump in every repeat. It matters more here than in
    // `hero/WavyBand` — the marker glyph comes from the platform fallback in every case, so
    // the unit's width is not knowable from the bundled font alone.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      // Off the measuring node, not off the textPath — see its markup below.
      const oneRepeat = measure.getComputedTextLength();
      if (!oneRepeat) return;
      // From one repetition behind to level: the copy travels forward along the path, i.e.
      // upstream. Shifting by exactly one repetition lands on an identical-looking frame, so a
      // plain linear repeat loops seamlessly instead of snapping back.
      gsap.set(textPath, { attr: { startOffset: -oneRepeat } });
      tween = gsap.to(textPath, {
        attr: { startOffset: 0 },
        duration: oneRepeat / MARQUEE_SPEED,
        ease: "none",
        repeat: -1,
      });
    });

    return () => {
      cancelled = true;
      tween?.revert();
    };
  }, [animate, river.d, river.fontSize]);

  if (!width || !height) return null;

  return (
    <>
      {/* The copy is repeated to fill the river, so it is announced once here and the
          drawing itself is hidden from assistive tech. */}
      <span className="sr-only">{RIVER_TEXT}</span>
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
      >
        <defs>
          <path id={pathId} d={river.d} fill="none" />
        </defs>
        <path
          d={river.d}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={river.thickness}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Ink, not white: the reference sets this copy in the section's own near-black
            against the accent, which is the pairing that survives at 22px. */}
        <text
          fill="var(--color-ink)"
          fontSize={river.fontSize}
          // Regular, not medium: against the accent the copy is already at full contrast, and
          // the extra weight thickened the strokes past the reference's own.
          fontWeight={400}
        >
          <textPath
            ref={textPathRef}
            href={`#${pathId}`}
            startOffset={0}
            // Puts the copy's visual mass on the centre of the ribbon rather than its
            // baseline. `middle` centres on the x-height, which is the same placement
            // `hero/band.ts` gets by baking a 0.3em shift into its text path — and it is the
            // attribute rather than a `dy`, which browsers disagree about.
            //
            // **It has to sit on the textPath and not on the <text>, and Safari is the one
            // that cares.** `dominant-baseline` is not an inherited property in SVG 1.1, so a
            // value on the <text> has no business reaching a <textPath> child's glyphs —
            // WebKit honours that to the letter and ignores it, putting every baseline
            // *on* the centreline, i.e. the whole ribbon's copy half an x-height high. Blink
            // follows SVG 2, where it is inherited, and applies it either way, which is why
            // this shipped looking correct in every browser we can open. Measured on both
            // engines: set here, the ink's centre lands 0.09em above the line in each of
            // them; set on the <text>, WebKit lands at 0.35em and Chromium at 0.09em.
            dominantBaseline="middle"
          >
            {unit.repeat(repeats)}
          </textPath>
        </text>

        {/*
          One repetition of the copy, off the path, purely to measure — the marquee's loop
          length, and the one number that has to be exact or the seam shows.

          **It cannot be measured off the textPath, and again Safari is the reason.**
          `getComputedTextLength()` there returns the advance of the glyphs an engine actually
          *rendered*, and a glyph that falls past either end of the path is not rendered at
          all — which is deliberate here, the copy overfilling the path twice over. Blink
          reports the whole string regardless; WebKit reports only the part on the path, so
          dividing by `repeats` measured 203px against a true 319px and the marquee jumped
          116px sideways at every loop. Measured off a plain <text> the two engines agree to
          0.6px on the same string, because nothing can be clipped away.

          `visibility` rather than `display: none`, which would take it out of layout and
          return zero, and it inherits the same font stack as the copy by being the same kind
          of node in the same SVG — which canvas `measureText` could not promise, the marker
          glyph coming from the platform fallback rather than the bundled font.
        */}
        <text
          ref={measureRef}
          aria-hidden
          visibility="hidden"
          x={0}
          y={0}
          fontSize={river.fontSize}
          fontWeight={400}
        >
          {unit}
        </text>
      </svg>
    </>
  );
}

/**
 * The path's length, straight off its anchors. Only ever used to decide how many repetitions
 * of the copy to emit, so the polyline's own length — which understates the curve's by a
 * fraction of a percent at this anchor spacing — is more than close enough, and it avoids
 * needing a laid-out DOM node to ask.
 */
function pathLength(river: RiverGeometry) {
  let total = 0;
  for (let i = 1; i < river.points.length; i++) {
    total += Math.hypot(
      river.points[i][0] - river.points[i - 1][0],
      river.points[i][1] - river.points[i - 1][1],
    );
  }
  return total;
}
