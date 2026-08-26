import Image from "next/image";
import type { CSSProperties } from "react";
import BrowserMock from "./BrowserMock";
import SitePreview from "./SitePreview";
import { Band, Display, Measure, Prose } from "./primitives";
import type { CaseStudy } from "./content";
import { OUTCOME_BODY_GAP, OUTCOME_MOCK_WIDTH } from "./metrics";

/**
 * Band 4: what was shipped, beside a mockup of it.
 *
 * Two equal halves of the content box, with the mockup centred in the right one — measured
 * top 237px against 241.5px predicted for a 425px panel centred in a 656px row, which is
 * inside the frame-edge detection's own error. So it is `items-center` rather than a top
 * offset, and it stays right as the copy's length changes.
 *
 * The mockup is 39.9% of the content box, not the full half: like the masthead's it stops
 * short of the right gutter, and that inset is what keeps the page's right edge ragged in
 * the same way the two text bands above leave theirs.
 */
export default function Outcome({ study }: { study: CaseStudy }) {
  // Optional since the second study has no such band — see BandKey in ./content.
  if (!study.outcome) return null;
  const { heading, paragraphs, media, caption } = study.outcome;

  return (
    <Band tone="paper">
      <Measure>
        <div
          className={
            // A column gap only when the media is a supplied capture: the drawn mockup keeps
            // its measured 39.9% inset and leaves the gap itself, but a capture takes the
            // half-column whole and the copy beside it would otherwise run right up to its
            // edge. 4.5% is the comp's own — 32px of a 770px content box.
            "grid grid-cols-1 items-center gap-y-14 lg:grid-cols-2" +
            (media ? " lg:gap-x-[4.5%]" : "")
          }
        >
          <div>
            <Display>{heading}</Display>
            <Prose
              paragraphs={paragraphs}
              className="max-w-[42em]"
              style={{ marginTop: OUTCOME_BODY_GAP }}
            />
          </div>

          {/* The drawn mockup is centred in the right half at its measured 39.9%;
              `justify-self-center` rather than a margin, so that width is the only figure the
              column needs. A supplied capture takes the column whole instead — it is a real
              screenshot at its own aspect, and its comp runs it to the gutter. */}
          <div
            className={
              media ? "w-full" : "w-full lg:justify-self-center lg:[width:var(--mock-w)]"
            }
            style={
              {
                // A share of the *content box*, restated against the half-column it sits in.
                "--mock-w": `${(OUTCOME_MOCK_WIDTH / 50) * 100}%`,
              } as CSSProperties
            }
          >
            {media ? (
              <>
                {/* The asset's own aspect on the box, so `object-cover` has nothing to crop
                    — the same arrangement the masthead's capture uses. */}
                <div
                  className="relative w-full overflow-hidden [aspect-ratio:var(--shot-aspect)]"
                  style={{ "--shot-aspect": media.aspect } as CSSProperties}
                >
                  <Image
                    src={media.src}
                    alt={media.alt}
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                    style={{ objectPosition: media.focus }}
                  />
                </div>
                {caption ? (
                  <Prose paragraphs={caption} style={{ marginTop: OUTCOME_BODY_GAP }} />
                ) : null}
              </>
            ) : study.preview ? (
              <BrowserMock label={`The ${study.title} website`}>
                <SitePreview preview={study.preview} />
              </BrowserMock>
            ) : null}
          </div>
        </div>
      </Measure>
    </Band>
  );
}
