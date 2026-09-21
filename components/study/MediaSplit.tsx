import type { CSSProperties } from "react";
import Media from "./Media";
import { Band, Display, Measure, Prose } from "./primitives";
import type { MediaSplit as MediaSplitContent } from "./content";
import type { Tone } from "./primitives";
import { SPLIT_BODY_GAP } from "./metrics";

/**
 * A band that is one column of copy beside one piece of media, in either order.
 *
 * The reference closes with two of these — the brand applications on paper with the copy on
 * the left, and the identity on black with the media on the left — and they differ only in
 * tone, in which side the media takes, and in their measured column shares. So they are one
 * component rather than two nearly-identical files; the figures live in ./metrics and the
 * words in ./content, and this holds the composition they have in common.
 *
 * ## The media is a ratio box, and ./Media is the box
 *
 * Every asset on this page is drawn by one component, so the ratio, the `object-cover` and the
 * video-source fallback are stated once. What this file still owns is the *column* the box
 * sits in — see `cols` below.
 *
 * A `fit: "contain"` path and a `mediaMax` cap used to live here, for a band that put QCIF's
 * logo in the media column instead of a photograph. That band is gone: the three studies are
 * one template now and its copy moved to QCIF's outcome, so nothing sets a contained mark any
 * more and the two props went with it rather than sitting unused. A future band that needs a
 * mark rather than a picture wants them back, and wants `BRAND_MARK_MAX`'s reasoning with it.
 *
 * ## `cols` is three shares, and the middle one is the gap
 *
 * Written as a `fr` template on a custom property rather than a Tailwind class, for the same
 * reason the masthead's hero row is: the numbers are measured and belong in one file, and
 * Tailwind needs its class strings whole at build time. The middle track *is* the gap, so
 * nothing needs a `column-gap` and the two shares stay readable against the reference.
 */
export default function MediaSplit({
  content,
  tone,
  side,
  cols,
  headingClassName = "",
  fullHeight = false,
}: {
  content: MediaSplitContent;
  tone: Tone;
  /** Which side the media takes from `lg` up. Below it the two stack in source order. */
  side: "left" | "right";
  /** copy share, gap, media share — as percentages of the content box, in that order. */
  cols: { copy: number; gap: number; media: number };
  /** The identity band sets its display line in the accent; the applications band does not. */
  headingClassName?: string;
  /**
   * Hold a viewport from `lg` up. `min-h`, never `h`: a short wide window can leave the copy
   * taller than the screen, and a fixed height would push its last paragraph under the band.
   */
  fullHeight?: boolean;
}) {
  // The frame is resolved before the record gets here — the asset's own ratio bounded by the
  // band's `MediaFrame`, or the band's measured figure outright on the identity band. See
  // `frameRatio` in ./metrics.
  const { heading, paragraphs, media: asset } = content;

  const copy = (
    <div key="copy">
      <Display className={headingClassName}>
        {heading.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </Display>
      {/* The tighter of the two measured leadings, as the pull quote's columns use. On the
          masthead's 1.59 the run outgrows the media beside it and the row goes lopsided. */}
      <Prose
        paragraphs={paragraphs}
        leading="dense"
        style={{ marginTop: SPLIT_BODY_GAP }}
      />
    </div>
  );

  const media = (
    <Media
      key="media"
      media={asset}
      sizes={`(min-width: 1024px) ${Math.round(cols.media)}vw, 100vw`}
    />
  );

  const mediaFirst = side === "left";
  const [first, second] = mediaFirst ? [media, copy] : [copy, media];
  const track = mediaFirst
    ? [cols.media, cols.gap, cols.copy]
    : [cols.copy, cols.gap, cols.media];

  return (
    <Band
      tone={tone}
      className={fullHeight ? "lg:flex lg:min-h-screen lg:items-center" : ""}
    >
      <Measure>
        <div
          className="grid grid-cols-1 items-center gap-y-12 lg:[grid-template-columns:var(--split-cols)]"
          style={
            { "--split-cols": track.map((n) => `${n}fr`).join(" ") } as CSSProperties
          }
        >
          {first}
          {/* Column 3 above `lg`; the empty middle track is the gap and needs no rule. */}
          <div className="lg:col-start-3">{second}</div>
        </div>
      </Measure>
    </Band>
  );
}
