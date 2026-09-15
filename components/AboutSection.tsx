"use client";

import { useEffect, useRef, useState } from "react";
import { playfair } from "@/app/fonts";
import { FounderBlock } from "./about/AboutLayers";
import type { Founder } from "./about/content";
import { BLOCK_GAP, PAD_BOTTOM, PAD_TOP } from "./about/metrics";
import { createAboutSequence } from "./about/sequence";

/**
 * The founders section, assembled on the same five-part plan as the other scroll-driven
 * sections, minus the geometry file — there are no solved shapes here, only measured ones:
 *
 *   ./about/timeline   the one beat, and the evidence for its window
 *   ./about/sequence   the ScrollTriggers that play it
 *   ./about/metrics    every measured layout figure
 *   ./about/content    the CMS boundary and the type the layers render
 *   ./about/*Layers    the layers themselves
 *
 * **Nothing here is pinned, and that is the finding rather than an omission.** The reference
 * recording is a plain scroll-through: the section's own content and its bottom edge move
 * together at a fixed offset on every frame, no block holds, and nothing moves relative to
 * anything else except each photograph's corner radius. So there is no `PIN_VH`, no
 * `SECTION_VH` and no phase table — `timeline.ts` holds a window and a direction, and the
 * section is as tall as its copy makes it.
 *
 * The words and photographs come from the client's Wix CMS and arrive as a prop, already
 * normalised by `./about/content` on the server. This component never sees Wix.
 */
export default function AboutSection({ founders }: { founders: Founder[] }) {
  const sectionRef = useRef<HTMLElement>(null);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setMounted(true);
  }, []);

  // Gated on `mounted` as well as the motion mode, for the reason `PlaygroundNarrative` gives:
  // `reducedMotion` is false on the first commit whatever the reader's setting is, because it
  // cannot be read until the effect that reads it has run.
  useEffect(() => {
    if (reducedMotion || !mounted) return;
    const section = sectionRef.current;
    if (!section) return;

    const ctx = createAboutSequence(section);
    return () => ctx.revert();
  }, [reducedMotion, mounted, founders]);

  // No rows, no band. See `foundersFromWix` — an unreachable CMS renders nothing rather than
  // an empty grey field, and the rest of the page still scrolls.
  if (founders.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      // The display face is scoped here rather than to the root layout, which is the mistake
      // the previous Playfair stand-in made: it was wired into `app/fonts.ts` globally and
      // next/font went on preloading its woff2 on every route, home page included, where no
      // serif ever rendered. Declared on the one element that needs it, it is fetched when
      // this section is on the page and not otherwise.
      className={`${playfair.variable} bg-gray`}
      style={{ paddingTop: PAD_TOP, paddingBottom: PAD_BOTTOM }}
    >
      <div className="flex flex-col" style={{ gap: BLOCK_GAP }}>
        {founders.map((founder) => (
          <FounderBlock key={founder.id} founder={founder} />
        ))}
      </div>
    </section>
  );
}
