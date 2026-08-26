"use client";

import Image from "next/image";
import Link from "next/link";
import { showRouteCover } from "@/components/routeTransition";
import type { ReactNode, RefObject } from "react";
import {
  CASE_CLOSING,
  CASE_EXPLORE,
  CASE_HEADING,
  CASE_PROJECTS,
  CASE_VIEW_ALL,
} from "./projects";
import { IMAGE_ASPECT } from "./timeline";

/**
 * The track: one flex row of equal cells, translated by the paint in ./sequence.
 *
 * ## The heading and the closing call-to-action are cells, not chrome
 *
 * This is the structural finding from the reference, and it is what the earlier build got
 * most wrong: the section's title is not a banner pinned above the cards, it is the *first
 * cell of the track* and it slides away to the left with everything else. The closing
 * paragraph is the last cell in the same way. Measured, all three kinds of cell are one
 * pitch wide — 952.4px against a 1905px viewport, i.e. exactly half of it — so the track is a
 * plain row and needs no per-kind arithmetic.
 *
 * ## The widths live here, the behaviour does not depend on them
 *
 * `w-[50vw]` and the image's `42vw` are the measured figures transcribed into classes; they
 * are documented and asserted as `CELL_VW` / `IMAGE_VW` in ./timeline. The paint never reads
 * either — it measures the cells back off the DOM (see ./measure) and its one width-relative
 * constant, `RISE_END_VW`, is a fraction of the *viewport* — so these two cannot drift out of
 * agreement with the animation, only with their own documentation.
 *
 * The image is `min(42vw, 89.9vh)` rather than a flat 42vw: 89.9vh is `IMAGE_MAX_VH × the
 * measured 1.45 aspect`, so the cap is applied to the *width* and the shape is never broken
 * to satisfy it. Below `md` a cell is a whole viewport, because half of a 390px screen is a
 * 195px card and no caption fits under one.
 */

/**
 * How a cell hands its elements back to the owner.
 *
 * A callback rather than the ref array itself: mutating a ref that arrived as a prop is what
 * `react-hooks/immutability` objects to, and the objection is sound — the component that
 * declares a ref should be the only thing that writes to it. CaseStudies owns both arrays and
 * passes down the two writers.
 */
export type CellRegistrar = (index: number, el: HTMLElement | null) => void;

/** A small caps link with the reference's underline rule. A link only when there is a href. */
function CaseLink({
  label,
  href,
  className = "",
}: {
  label: string;
  href: string | null;
  className?: string;
}) {
  const inner = (
    <>
      <span>{label}</span>
      <span
        aria-hidden
        className="transition-transform duration-300 group-hover/link:translate-x-1"
      >
        →
      </span>
    </>
  );
  const cls =
    "group/link inline-flex items-center gap-6 border-b border-ink/25 pb-2.5 " +
    "text-[clamp(10px,0.63vw,13px)] font-normal tracking-[0.2em] text-ink/70 uppercase " +
    "transition-colors duration-300 hover:border-ink/60 hover:text-ink " +
    className;

  // A span, not an `href="#"`: a link to nowhere is worse for a keyboard or a screen reader
  // than no link at all. Give the project a `link` and this becomes a link unchanged.
  //
  // `next/link` rather than a bare anchor, so a case study opens without tearing the page
  // down and rebuilding ScrollSmoother — see SmoothScrollProvider, which resets the
  // smoother and refreshes every trigger when the route changes.
  //
  // The click raises the route cover, and the click rather than a router event because it is
  // the earliest signal there is: in development the destination segment has not been
  // compiled at this point, so nothing the router exposes fires until well after the screen
  // has already gone cream. `SmoothScrollProvider` takes it off again once the new page is
  // up, reset and re-measured — see `components/RouteCover`.
  return href ? (
    <Link href={href} className={cls} onClick={showRouteCover}>
      {inner}
    </Link>
  ) : (
    <span className={cls}>{inner}</span>
  );
}

/**
 * One cell. Every cell is the same box; only its contents differ.
 *
 * Two nested elements, and they cannot be collapsed: the cell holds the width and the
 * divider and never moves, and the content block inside it is what the rise writes `yPercent`
 * to. Written to one element, GSAP's transform would fight the flex centring.
 */
function Cell({
  index,
  registerCell,
  registerContent,
  reducedMotion,
  children,
}: {
  index: number;
  registerCell: CellRegistrar;
  registerContent: CellRegistrar;
  reducedMotion: boolean;
  children: ReactNode;
}) {
  return (
    <div
      ref={(el) => registerCell(index, el)}
      className={
        (reducedMotion
          ? "flex w-full shrink-0 justify-center px-[6vw] py-14"
          : "flex h-full w-[100vw] shrink-0 items-center justify-center md:w-[50vw]") +
        // The reference's cell divider: a hairline between cells, never before the first.
        (index > 0 ? " border-l border-ink/10" : "")
      }
    >
      <div
        ref={(el) => registerContent(index, el)}
        className="w-[88vw] md:w-[min(42vw,89.9vh)]"
        style={{ willChange: reducedMotion ? undefined : "transform" }}
      >
        {children}
      </div>
    </div>
  );
}

export function CaseTrack({
  trackRef,
  registerCell,
  registerContent,
  reducedMotion,
}: {
  trackRef: RefObject<HTMLDivElement | null>;
  registerCell: CellRegistrar;
  registerContent: CellRegistrar;
  reducedMotion: boolean;
}) {
  const cellProps = { registerCell, registerContent, reducedMotion };

  // The row's widest artwork, which is what sets everyone's height — see the note on the
  // project cells below. Derived rather than stated, so a new card cannot silently overflow
  // its cell by being wider than anything here anticipated.
  const widestAspect = Math.max(
    ...CASE_PROJECTS.map((p) => p.aspect ?? IMAGE_ASPECT),
  );

  return (
    <div
      ref={trackRef}
      className={
        reducedMotion
          ? "flex w-full flex-col items-center"
          : /* `w-max` so the row is exactly as wide as its content — that width minus the
               viewport is the pin's whole length, read straight off the DOM in ./measure.
               `relative` so the track is the cells' `offsetParent`, which is what makes
               their measured `offsetLeft` mean "distance from the track's left edge". */
            "relative flex h-full w-max flex-nowrap"
      }
      style={{ willChange: reducedMotion ? undefined : "transform" }}
    >
      {/* Cell 0 — the heading. Centred in its cell, like the closing panel. */}
      <Cell index={0} {...cellProps}>
        <div className="flex flex-col items-center text-center">
          <h2 className="text-[clamp(34px,4.1vw,84px)] leading-[1.09] font-light tracking-[-0.02em] text-ink">
            {CASE_HEADING.map((line, i) => (
              <span key={line} className="block">
                {line}
                {i === 0 ? "" : null}
              </span>
            ))}
          </h2>
          <CaseLink label={CASE_VIEW_ALL} href={null} className="mt-10 lg:mt-12" />
        </div>
      </Cell>

      {/* One cell per project. */}
      {CASE_PROJECTS.map((project, i) => (
        <Cell key={project.id} index={i + 1} {...cellProps}>
          {/*
            Every card's picture is the same height, and the width is what varies.

            Three things are wanted at once and only one arrangement gives all three: no crop
            (a capture loses its right-hand panel to `object-cover`), no mat (`object-contain`
            in a shared box stands the capture on a slab of grey), and one height across the
            row (unequal heights put each caption at its own level, which is what a row of
            cards must not do). So the *height* is the shared figure and each frame takes the
            asset's ratio to find its width.

            That height is the slot divided by the widest ratio in the row, so even the widest
            card fits inside the measured `IMAGE_PAD_VW` — taking the tallest card's height
            instead would make a 1.687 capture 48.9vw wide in a 50vw cell and leave neighbours
            all but touching. The cost is that the narrowest card no longer fills the slot:
            Cafe Technica's photograph draws at 86% of 42vw. `mx-auto` centres what is left.
          */}
          <article
            className="mx-auto"
            style={{ width: `${((project.aspect ?? IMAGE_ASPECT) / widestAspect) * 100}%` }}
          >
            {/* The measured 1.45 aspect, unless the card's artwork brings its own — see
                `aspect` in ./projects. No radius — the reference's frames are square
                cornered — and no overlay, gradient or scrim of any kind over the artwork. */}
            <div
              className="relative w-full overflow-hidden bg-ink/5"
              style={{ aspectRatio: project.aspect ?? IMAGE_ASPECT }}
            >
              <Image
                src={project.imageSrc}
                alt={project.title}
                fill
                sizes="(min-width: 768px) 42vw, 88vw"
                className="object-cover"
                style={{ objectPosition: project.focus }}
                /* Only the first card is on screen when the pin engages, so it is the
                   only one worth fetching eagerly. */
                priority={i === 0}
                loading={i === 0 ? undefined : "lazy"}
              />
            </div>

            {/* The caption: title and description left, link right-aligned to the image's
                own right edge. Three parts, which is all the reference has. */}
            <div className="mt-6 flex items-start justify-between gap-8 xl:mt-8">
              <div>
                <h3 className="text-[clamp(18px,1.6vw,32px)] leading-tight font-normal text-ink">
                  {project.title}
                </h3>
                <p className="mt-2 max-w-[22em] text-[clamp(12px,0.85vw,17px)] leading-[1.45] font-light text-ink/55">
                  {project.description}
                </p>
              </div>
              <CaseLink
                label={CASE_EXPLORE}
                href={project.link}
                className="mt-1 shrink-0"
              />
            </div>
          </article>
        </Cell>
      ))}

      {/* The last cell — the closing call-to-action. */}
      <Cell index={CASE_PROJECTS.length + 1} {...cellProps}>
        <div className="flex flex-col items-center text-center">
          <p className="text-[clamp(19px,1.8vw,38px)] leading-[1.25] font-light text-ink">
            {CASE_CLOSING.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
          <CaseLink label={CASE_VIEW_ALL} href={null} className="mt-10 lg:mt-12" />
        </div>
      </Cell>

      {/* The tail run, so the closing cell finishes its own travel and lands centred rather
          than parked at the right with its rise still short — see TRACK_TAIL_VW. Zero below
          `md`, where a cell is already a whole viewport and centred by definition. */}
      {reducedMotion ? null : (
        <div aria-hidden className="h-full w-0 shrink-0 md:w-[25vw]" />
      )}
    </div>
  );
}
