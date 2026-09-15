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
    if (!animate || !textPath || !repeats) return;

    let tween: ReturnType<typeof gsap.to> | null = null;
    let cancelled = false;

    // Measured only once the webfont has settled: a fallback-font measurement makes the loop
    // length wrong and puts a visible jump in every repeat. It matters more here than in
    // `hero/WavyBand` — the marker glyph comes from the platform fallback in every case, so
    // the unit's width is not knowable from the bundled font alone.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      const oneRepeat = textPath.getComputedTextLength() / repeats;
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
  }, [animate, repeats, river.d, river.fontSize]);

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
          fontWeight={500}
          // Puts the copy's visual mass on the centre of the ribbon rather than its
          // baseline. `middle` centres on the x-height, which is the same placement
          // `hero/band.ts` gets by baking a 0.3em shift into its text path — and this is the
          // attribute rather than a `dy` on the textPath, which browsers disagree about.
          dominantBaseline="middle"
        >
          <textPath ref={textPathRef} href={`#${pathId}`} startOffset={0}>
            {unit.repeat(repeats)}
          </textPath>
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
