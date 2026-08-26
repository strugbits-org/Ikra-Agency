import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import Logo from "@/components/Logo";
import BrowserMock from "./BrowserMock";
import SitePreview from "./SitePreview";
import { Band, Display, Measure, Prose } from "./primitives";
import type { CaseStudy } from "./content";
import {
  GUTTER_MARK,
  GUTTER_MASTHEAD,
  HERO_LEAD,
  HERO_ROW,
  LEADING,
  MARK_META,
  MARK_WIDTH,
  MASTHEAD_COL_GAP,
  MASTHEAD_MARK_GAP,
  MASTHEAD_MEDIA_GAP,
  MASTHEAD_META_GAP,
  MASTHEAD_PAD_BOTTOM,
  MASTHEAD_PAD_TOP,
  TYPE,
} from "./metrics";

/**
 * Band 1: the wordmark, the hero row, and three columns of the client's facts.
 *
 * ## The hero row is a line of copy and a mockup, not a picture and a mockup
 *
 * The recording this page was measured from begins below the hero, so nothing in it says
 * what sits to the left of the site mockup. An earlier pass put a photograph there. It is a
 * two-line serif headline in the brand accent, vertically centred against the mockup.
 *
 * ## The band's opening is a constraint, not a rhythm
 *
 * Everything above the intro columns has to fit in less than a viewport, because the first
 * row of that copy is meant to be on screen before the reader scrolls. Five figures add up
 * to it and `MASTHEAD_PAD_TOP` carries the note; the practical consequence here is that the
 * lockup is tight to the top edge and the row below it cannot grow without pushing the
 * intro under the fold.
 *
 * ## The thing beside the headline is either a drawn mockup or a supplied image
 *
 * Cafe Technica has no capture of its own homepage, so `SitePreview` draws one inside
 * `BrowserMock` — copy rather than a screenshot, which stays sharp at both the sizes the
 * frame appears at. QCIF supplied a real screenshot that already carries its own browser
 * chrome, so it is placed as-is: wrapping it would put a second frame around the first, and
 * drawing type over it would invent copy the client did not write. Which one a study gets is
 * decided by whether its record has a `media`.
 *
 * ## Why the row's tracks are a CSS variable rather than a Tailwind class
 *
 * The four shares live in `HERO_ROW` so the measured figures stay in one file, which rules
 * out a literal `lg:grid-cols-[...]` — Tailwind needs class strings whole at build time, and
 * writing them out here would put the same numbers in two places. Setting the template as a
 * custom property and consuming it through an arbitrary property at the breakpoint keeps one
 * source and still lets the row collapse to a stack below `lg`.
 */
export default function Masthead({ study }: { study: CaseStudy }) {
  const {
    date,
    client,
    headline,
    columns,
    media,
    tone = "dark",
    headlineClassName = "text-accent",
  } = study.masthead;

  // headline | gap | mockup | the inset it keeps from the right gutter.
  const heroCols =
    `${HERO_ROW.media}fr ${HERO_ROW.gap}fr ${HERO_ROW.mock}fr ${HERO_ROW.inset}fr`;

  return (
    <Band tone={tone} padTop={MASTHEAD_PAD_TOP} padBottom={MASTHEAD_PAD_BOTTOM}>
      {/* The mark has a gutter of its own — see GUTTER_MARK — so it gets its own Measure
          rather than a negative margin inside the one below. */}
      <Measure gutter={GUTTER_MARK}>
        <StudyMark />
      </Measure>

      {/* The hero row is on the page's own gutter; the intro columns below it are on the
          masthead's wider one. Measured, and the reason for the two Measures. */}
      <Measure>
        {/* `items-center`, so the headline sits on the mockup's own centre line. The mockup
            carries the row's height (its aspect ratio is the only intrinsic size here), and
            the headline is free to be however many lines it is without moving it. */}
        <div
          className="grid grid-cols-1 items-center gap-y-[7vw] lg:[grid-template-columns:var(--hero-cols)]"
          style={
            {
              marginTop: MASTHEAD_MARK_GAP,
              "--hero-cols": heroCols,
            } as CSSProperties
          }
        >
          <Display className={headlineClassName} style={{ lineHeight: HERO_LEAD }}>
            {headline.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </Display>

          {/* Column 3 above `lg`; the source order is what a stacked phone reads, and the
              empty second and fourth tracks take care of themselves. */}
          <div className="lg:col-start-3">
            {media ? (
              /* The asset's own aspect on the box, so `object-cover` has nothing to crop and
                 the row's height is a function of the column rather than of the viewport —
                 the same arrangement MediaSplit uses, and what makes the swap to the video
                 this is standing in for a one-element change. */
              <div
                className="relative w-full overflow-hidden [aspect-ratio:var(--hero-media-aspect)]"
                style={{ "--hero-media-aspect": media.aspect } as CSSProperties}
              >
                <Image
                  src={media.src}
                  alt={media.alt}
                  fill
                  sizes={`(min-width: 1024px) ${Math.round(HERO_ROW.mock)}vw, 100vw`}
                  className="object-cover"
                  style={{ objectPosition: media.focus }}
                  priority
                />
              </div>
            ) : study.preview ? (
              <BrowserMock label={`The ${study.title} website`}>
                <SitePreview preview={study.preview} />
              </BrowserMock>
            ) : null}
          </div>
        </div>

      </Measure>

      <Measure gutter={GUTTER_MASTHEAD}>
        {/* Three columns of 522px against a 1694px content box — a plain thirds grid once the
            63px gap is taken out, so only the gap has to be stated. */}
        <div
          className="grid grid-cols-1 gap-y-10 md:grid-cols-3"
          style={{ marginTop: MASTHEAD_MEDIA_GAP, columnGap: MASTHEAD_COL_GAP }}
        >
          <div style={{ fontSize: TYPE.body, lineHeight: LEADING.body }}>
            <p>{date}</p>
            {/* Measured 47px between the two line boxes, i.e. wider than a blank line and
                narrower than two — so it is a margin rather than an empty paragraph. */}
            <div style={{ marginTop: MASTHEAD_META_GAP }}>
              {client.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          {columns.map((paragraphs) => (
            <Prose key={paragraphs[0]} paragraphs={paragraphs} />
          ))}
        </div>
      </Measure>
    </Band>
  );
}

/**
 * The `ikra.` lockup: the mark in accent, its trademark, and the two-line descriptor.
 *
 * The descriptor is 17px on a line-height of exactly 1 — see `MARK_META`, which carries the
 * measurement. It looks far too large written down and is correct on screen: the mark is
 * only 48px tall, so a 12px descriptor under it reads as a caption rather than as part of
 * the lockup. The trademark is not set here at all; the mark's own asset draws it.
 *
 * A link home rather than a static mark. The reference is a screen capture and cannot show
 * whether its own is clickable, but this is the only route out of a case study, and a
 * wordmark in the top-left corner is where a reader looks for one.
 */
function StudyMark() {
  return (
    <Link
      href="/"
      aria-label="ikra, rebranding agency — back to home"
      className="inline-block leading-none transition-opacity duration-300 hover:opacity-80"
      style={{ fontSize: MARK_META }}
    >
      {/* No `™` beside this. `logo-white.png` draws its own, raised over the final period —
          see MARK_WIDTH. `flex`, so the inline-block mark inside is blockified and adds no
          baseline descender under itself; that gap alone was 3px of the lockup's height. */}
      <span className="flex" style={{ width: MARK_WIDTH }}>
        <Logo className="w-full" color="var(--color-accent)" />
      </span>
      <span className="mt-[0.06em] block text-white">
        <span className="block">rebranding</span>
        <span className="block">agency</span>
      </span>
    </Link>
  );
}
