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
  const { heading, paragraphs } = study.outcome;

  return (
    <Band tone="paper">
      <Measure>
        <div className="grid grid-cols-1 items-center gap-y-14 lg:grid-cols-2">
          <div>
            <Display>{heading}</Display>
            <Prose
              paragraphs={paragraphs}
              className="max-w-[42em]"
              style={{ marginTop: OUTCOME_BODY_GAP }}
            />
          </div>

          {/* Centred in the right half. `justify-self-center` rather than a margin, so the
              39.9% width is the only figure the column needs. */}
          <div
            className="w-full lg:justify-self-center lg:[width:var(--mock-w)]"
            style={
              {
                // A share of the *content box*, restated against the half-column it sits in.
                "--mock-w": `${(OUTCOME_MOCK_WIDTH / 50) * 100}%`,
              } as CSSProperties
            }
          >
            {study.preview ? (
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
