"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { LEADING, TYPE } from "@/components/study/metrics";
import { createGrowthSequence } from "./sequence";
import {
  CAP_H,
  COL_GAP,
  HEAD_GAP,
  LABEL_GAP,
  PER_ROW,
  ROW_GAP,
  TRACK_H,
} from "./metrics";

/** One bar: what it is called, and how tall it stands as a percentage of the track. */
export type GrowthBar = {
  label: string;
  /** 0–100, a share of `TRACK_H`. The reference's own ten are 100/100/85/100/100 and 100/80/64/100/35. */
  value: number;
};

/**
 * A row of labelled bars that grow out of the floor as they arrive on screen.
 *
 * Content-agnostic on purpose — it takes bars and an optional heading and knows nothing about
 * a case study, so the same component can carry a different set of deliverables on another
 * route. It also renders no field of its own: no `Band`, no `Measure`, no `Display`. The
 * caller supplies the band and the heading's typography, which is what keeps this usable
 * outside `components/study/` where those primitives live.
 *
 * The numbers are split three ways in the usual shape — ./metrics owns the layout, ./timeline
 * owns every beat, ./sequence owns the triggers — and this file is markup, one ref and one
 * effect.
 *
 * ## The bar is one fixed gradient revealed from the bottom, not a scaled one
 *
 * This is the detail that makes the growth read the way it does, and it was measured rather
 * than guessed. Mid-climb, a bar's top edge is *dimmer* than a finished bar's: at 84.2%, 62%
 * and 41% of the way up, the red channel at the leading edge reads 198, 144 and 98 against a
 * settled 235 — which is 235 × the progress, to within two counts on all three. So the ramp
 * is full-height and anchored to the bar's foot, and what moves is only how much of it shows.
 * A `scaleY` would squash the ramp into the visible part instead and hold the leading edge at
 * full accent the whole way, which reads as a block sliding up rather than a column filling.
 *
 * That is why the fill's `background-size` is stated in absolute terms against `TRACK_H`
 * rather than as a percentage of the element: the element's own height is the thing being
 * animated, and a percentage background would follow it and undo the effect.
 *
 * ## It ships finished, and the sequence empties it
 *
 * The markup renders the completed chart — `--grow: 1`, caps opaque. That is what makes the
 * reduced-motion path a plain early return with nothing to reproduce, and it is also the
 * correct output for a crawler or a failed script. The first thing ./sequence does is take it
 * to zero, and because this band sits five screens down there is no frame in which the
 * finished state is on screen.
 */
export default function GrowthBars({
  items,
  heading,
  perRow = PER_ROW,
  className = "",
}: {
  items: readonly GrowthBar[];
  heading?: ReactNode;
  perRow?: number;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Chunked into groups of `perRow` because each group animates on its own entrance — see
  // ./sequence. Below `lg` the grid reflows a group over more than one visual line, so a
  // group is a unit of *timing* here rather than a guaranteed row.
  const rows = useMemo(() => {
    const out: GrowthBar[][] = [];
    for (let i = 0; i < items.length; i += perRow) out.push(items.slice(i, i + perRow));
    return out;
  }, [items, perRow]);

  // A stable signature, so the effect re-runs when the bars actually change rather than on
  // every render an inline `items` literal would cause.
  const signature = items.map((bar) => `${bar.label}:${bar.value}`).join("|");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Nothing to reduce to: the markup is already the end state.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = createGrowthSequence(root);
    return () => ctx.revert();
  }, [signature]);

  return (
    <div ref={rootRef} className={className}>
      {heading}

      <div
        className="grid"
        style={{ marginTop: heading ? HEAD_GAP : undefined, rowGap: ROW_GAP }}
      >
        {rows.map((row) => (
          <div
            key={row.map((bar) => bar.label).join("|")}
            data-growth-row
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
            style={{ columnGap: COL_GAP, rowGap: ROW_GAP }}
          >
            {row.map((bar) => (
              <Bar key={bar.label} bar={bar} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * One cell: the track, the bar inside it, the rule waiting at the bar's target, and the label.
 *
 * The track is `aria-hidden`. The heights are a designed skyline rather than data — there is
 * no axis, no legend and no unit anywhere in the reference — so announcing them would invent
 * a measurement the page does not make. The label is the content, and it is left in the tree.
 */
function Bar({ bar }: { bar: GrowthBar }) {
  const share = Math.max(0, Math.min(100, bar.value)) / 100;

  return (
    <div>
      <div
        aria-hidden="true"
        className="relative w-full"
        style={{ height: TRACK_H, "--v": share } as CSSProperties}
      >
        {/* `--grow` is what ./sequence animates, 0 → 1. `--bar-from` is overridable by a
            caller that wants another colour; it defaults to the site's accent, which is what
            the reference sets — its bar tops read (234,78,63) against the same recorder's
            (233,81,62) for a logo known to be `--color-accent`. */}
        <div
          data-growth-fill
          data-growth-value={bar.value}
          className="absolute inset-x-0 bottom-0"
          style={
            {
              "--grow": 1,
              height: "calc(var(--grow) * var(--v) * 100%)",
              backgroundImage:
                "linear-gradient(to bottom, var(--bar-from, var(--color-accent)), transparent)",
              backgroundSize: `100% calc(var(--v) * ${TRACK_H})`,
              backgroundPosition: "50% 100%",
              backgroundRepeat: "no-repeat",
            } as CSSProperties
          }
        />

        {/* The rule sits at the bar's target and never moves; the fill climbs to meet it, and
            its last 3px arrive underneath this.

            **It has to come after the fill in the tree, and that is the whole reason it is
            written here rather than above.** Both are positioned, so with no `z-index` on
            either the later one paints on top — and the cap's box is the top 3px of the
            finished bar, not a strip above it. Ordered the other way it is perfectly visible
            for the whole climb and then vanishes on the frame the bar arrives, which reads as
            the fade running backwards. Same rule as the stacked composition in
            `DefinitionSection` and the testimonial's copy block: don't give either a
            `z-index` to "fix" it, order them. */}
        <div
          data-growth-cap
          className="absolute inset-x-0 bg-white"
          style={{ bottom: `calc(var(--v) * 100% - ${CAP_H})`, height: CAP_H }}
        />
      </div>

      <p
        className="uppercase"
        style={{ marginTop: LABEL_GAP, fontSize: TYPE.body, lineHeight: LEADING.dense }}
      >
        {bar.label}
      </p>
    </div>
  );
}
