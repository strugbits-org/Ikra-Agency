import Media from "./Media";
import { Band, Display, Measure, Prose } from "./primitives";
import type { CaseStudy } from "./content";
import { OUTCOME_BODY_GAP } from "./metrics";

/**
 * Band 4: what was shipped, beside a mockup of it.
 *
 * Two equal halves of the content box, with the mockup centred in the right one — measured
 * top 237px against 241.5px predicted for a 425px panel centred in a 656px row, which is
 * inside the frame-edge detection's own error. So it is `items-center` rather than a top
 * offset, and it stays right as the copy's length changes.
 *
 * The picture takes the half-column whole. The reference's own drawn mockup sat at 39.9% of
 * the content box, stopping short of the right gutter to keep that edge ragged — but that was
 * a mockup this page drew, and every study now supplies a real capture, whose comp runs it to
 * the gutter. `OUTCOME_MOCK_WIDTH` went with `BrowserMock`.
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

          {/* The picture takes the half-column whole, which is what the comp for a supplied
              capture shows. A drawn browser mockup used to stand here at a measured 39.9%
              inset for a study that had no screenshot of its own — that is gone with
              `BrowserMock`, because every study now brings its own picture out of the CMS. */}
          <div className="w-full">
            {media ? (
              <>
                {/* The same frame the other bands draw — the asset's own aspect bounded by
                    `OUTCOME_FRAME`, and the rounded clip that covers the screenshots' baked-in
                    corners. The CMS offers no video in this slot, but ./Media handles either
                    and the frame is the thing worth having in one place. */}
                <Media media={media} sizes="(min-width: 1024px) 50vw, 100vw" />
                {caption ? (
                  <Prose paragraphs={caption} style={{ marginTop: OUTCOME_BODY_GAP }} />
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </Measure>
    </Band>
  );
}
