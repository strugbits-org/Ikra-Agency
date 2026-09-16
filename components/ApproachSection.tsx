"use client";

import { useEffect, useRef, useState } from "react";
import {
  APPROACH_GUTTER,
  ApproachStack,
  ApproachTrack,
} from "./approach/ApproachLayers";
import type { ApproachPoint } from "./approach/content";
import { PAD_BOTTOM, PAD_TOP } from "./approach/metrics";
import { createApproachSequence } from "./approach/sequence";

/**
 * The approach section, assembled on the same five-part plan as the other scroll-driven
 * sections:
 *
 *   ./approach/timeline   every beat, and the frame evidence behind each one
 *   ./approach/measure    the layout figures the paint is computed against
 *   ./approach/sequence   the triggers that play it
 *   ./approach/metrics    every measured layout figure
 *   ./approach/*Layers    the layers themselves
 *
 * The refs and the effects stay here so each effect's dependencies sit next to the state it
 * reads; the bodies are plain functions in those modules.
 *
 * **Two compositions, and the breakpoint decides which markup exists rather than restyling
 * one into the other.** Above `lg` a horizontal rail with the points as cells of a track that
 * pins and traverses when there are more than fit; below it a standing rail with the points
 * stacked, on ordinary scroll. ./approach/ApproachLayers' ApproachStack sets out why that is a
 * different composition rather than a narrower one.
 *
 * The words come from the client's Wix CMS and arrive as a prop, already normalised by
 * ./approach/content on the server. This component never sees Wix.
 */
export default function ApproachSection({
  points,
}: {
  points: ApproachPoint[];
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<(HTMLElement | null)[]>([]);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setMounted(true);
  }, []);

  // Gated on `mounted` as well as the motion mode, for the reason `PlaygroundNarrative` gives:
  // `reducedMotion` is false on the first commit whatever the reader's setting is, because it
  // cannot be read until the effect that reads it has run. Here the gate matters more than
  // usual — the sequence can pin, and a pin built and reverted a commit later is a visible jump.
  useEffect(() => {
    if (reducedMotion || !mounted) return;
    if (!stageRef.current || !trackRef.current || !railRef.current) return;

    const revert = createApproachSequence({
      stage: stageRef,
      track: trackRef,
      rail: railRef,
      dots: dotsRef,
    });
    return () => revert();
  }, [reducedMotion, mounted, points]);

  // No rows, no band. Same choice as the founders section — an unreachable CMS renders
  // nothing rather than an empty field, and the rest of the page still scrolls.
  if (points.length === 0) return null;

  /**
   * Reduced motion gets the stacked composition at every width, not a static copy of the row.
   * The row's whole reason for existing is a line that draws itself; without the draw it is
   * three columns under a solid rule, and the stack says the same thing in the order the copy
   * is actually read.
   */
  const stacked = reducedMotion;

  return (
    <section
      className="bg-cream"
      style={{ paddingTop: PAD_TOP, paddingBottom: PAD_BOTTOM, ...APPROACH_GUTTER }}
    >
      {stacked ? (
        <ApproachStack points={points} />
      ) : (
        <>
          {/* Below `lg` the track is never built (see ./approach/timeline's MQ), so the stack
              is what renders there. Both are in the tree and CSS picks one — the sequence
              keys off the same breakpoint through matchMedia, so they cannot disagree. */}
          <div className="lg:hidden">
            <ApproachStack points={points} />
          </div>

          {/*
            The gutter is the *section's*, so this box is exactly the content width — which is
            what `measure` reads as `visible` and what the whole pace is derived from. With the
            padding here instead, the stage measures the full viewport against a narrower
            track, and the fill runs 13% slow. It also puts the clip on the content edge, so a
            cell traversing left disappears at the gutter rather than at the window.
          */}
          <div ref={stageRef} className="hidden overflow-hidden lg:block">
            <ApproachTrack
              points={points}
              trackRef={trackRef}
              railRef={railRef}
              dotsRef={dotsRef}
            />
          </div>
        </>
      )}
    </section>
  );
}
