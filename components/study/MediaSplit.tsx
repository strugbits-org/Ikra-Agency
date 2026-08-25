import Image from "next/image";
import type { CSSProperties } from "react";
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
 * ## The media is a ratio box, not an intrinsic image
 *
 * `fill` inside a box whose `aspect-ratio` is the asset's own, so the frame is exact at every
 * width, nothing crops, and the row's height is a function of the column rather than of the
 * viewport. An intrinsic `<Image>` would reflow the row as the page scales and pull the copy
 * off the media's centre line. It is also what makes the swap to a video a one-element change
 * — the box already reserves the space.
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
  aspect,
  headingClassName = "",
  fullHeight = false,
}: {
  content: MediaSplitContent;
  tone: Tone;
  /** Which side the media takes from `lg` up. Below it the two stack in source order. */
  side: "left" | "right";
  /** copy share, gap, media share — as percentages of the content box, in that order. */
  cols: { copy: number; gap: number; media: number };
  /** The asset's own width ÷ height, so `object-cover` never has anything to crop. */
  aspect: number;
  /** The identity band sets its display line in the accent; the applications band does not. */
  headingClassName?: string;
  /**
   * Hold a viewport from `lg` up. `min-h`, never `h`: a short wide window can leave the copy
   * taller than the screen, and a fixed height would push its last paragraph under the band.
   */
  fullHeight?: boolean;
}) {
  const { heading, paragraphs, photo } = content;
  const lines = typeof heading === "string" ? [heading] : heading;

  const copy = (
    <div key="copy">
      <Display className={headingClassName}>
        {lines.map((line) => (
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
    <div
      key="media"
      className="relative w-full overflow-hidden [aspect-ratio:var(--media-aspect)]"
      style={{ "--media-aspect": aspect } as CSSProperties}
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes={`(min-width: 1024px) ${Math.round(cols.media)}vw, 100vw`}
        className="object-cover"
        style={{ objectPosition: photo.focus }}
      />
    </div>
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
