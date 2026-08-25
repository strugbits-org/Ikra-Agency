import Image from "next/image";
import type { CSSProperties } from "react";
import { Band, Display, Measure } from "./primitives";
import type { CaseStudy } from "./content";
import {
  CARD,
  CARD_ASPECT,
  CARD_PAD,
  CARD_SIGN_GAP,
  LEADING,
  TYPE,
} from "./metrics";

/**
 * Band 3: the client's words, set over a photograph the band tints with its own field.
 *
 * ## The duotone is a screen blend over a greyscale photo, and that is measured
 *
 * The panel's tonality is not a matter of taste here — it was solved off the capture. Two
 * facts fix it. Its darkest pixel has luminance 95.1 and the flat field's own luminance is
 * 95.7, so the photograph only ever *lightens* the field and never darkens it, which rules
 * out multiply, overlay and any semi-transparent scrim. And screen over a grey `v` predicts
 * a constant channel relation independent of `v` — (1−R)/(1−G) = 0.211 and (1−B)/(1−G) =
 * 1.090 against this field — which 3,727 sampled pixels of the reference return as 0.210
 * and 1.102. Greyscale first, because those ratios only hold if the source carries no hue
 * of its own; a colour photo screened over orange goes blue in the sky and grey in the
 * shadows.
 *
 * The first pass here used `mix-blend-luminosity`, which is the intuitive reading of a
 * duotone and is wrong in a way that is easy to miss by eye: it reproduces the hue but not
 * the tonal floor, so the panel came out at mean luminance 50 against the reference's 107
 * and the shadows went to black.
 *
 * ## The panel is placed, not centred
 *
 * 1045px wide, starting 141px inside a 96px gutter, on a 1902px viewport: its centre lands
 * 191px left of the page's. Centring it is the obvious tidy-up and it is the one change here
 * that would be visibly wrong — the empty right-hand third is doing the same work as the
 * pull quote's, above.
 */
export default function Testimonial({ study }: { study: CaseStudy }) {
  const { photo, paragraphs, name, role } = study.testimonial;

  return (
    <Band tone="ember">
      <Measure>
        <div
          className="relative w-full lg:[margin-left:var(--card-offset)] lg:[width:var(--card-width)]"
          style={
            {
              "--card-offset": `${CARD.offset}%`,
              "--card-width": `${CARD.width}%`,
            } as CSSProperties
          }
        >
          {/*
            A one-cell grid with two things stacked in it, and it has to be a grid rather
            than a `relative` box with an `aspect-ratio`.

            The measured panel is 1045 x 824, and at the reference's width its copy fits
            inside that. At other widths it may not — the type scales with the viewport but
            the words do not rewrap in the same places — and `aspect-ratio` is a *preferred*
            size, not a floor: a block whose content is taller simply overflows it, which
            under `overflow-hidden` means the last line of the quote is cut off and nothing
            reports it. Putting the ratio on a zero-content spacer and the copy in the same
            grid cell makes the row's height `max(ratio, copy)` instead, so the panel is
            exactly the measured shape wherever the copy fits and grows where it does not.

            `bg-ember` sits on this element and not merely behind the section because a
            blend mode composites against its own stacking context — see the photo below.
          */}
          <div className="relative isolate grid overflow-hidden bg-ember ring-1 ring-white/25">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 1024px) 62vw, 100vw"
              // Greyscale, then screen over the field. See the head of this file for the
              // two measurements that fix both halves of that.
              className="object-cover grayscale mix-blend-screen"
              style={{ objectPosition: photo.focus }}
            />

            {/* The spacer: holds the measured ratio, contains nothing, and only from `lg` —
                below it a 1045:824 box on a phone is a letterbox with a paragraph in it. */}
            <div
              aria-hidden
              className="col-start-1 row-start-1 lg:[aspect-ratio:var(--card-aspect)]"
              style={{ "--card-aspect": String(CARD_ASPECT) } as CSSProperties}
            />

            {/*
              `relative`, and it is load-bearing rather than tidy. The photograph above is
              `<Image fill>`, i.e. absolutely positioned — and a positioned element paints
              above a non-positioned sibling whatever the tree order says. Left static, this
              whole block renders *under* the photo and the quote reads as a faint ghost
              through it. The same rule is what governs the stacked composition in
              DefinitionSection; see CLAUDE.md.
            */}
            <div
              className="relative col-start-1 row-start-1 flex flex-col justify-center"
              style={{ padding: CARD_PAD }}
            >
              {/* One blank line of the display's own leading between the two paragraphs —
                  measured 109px against a 54.5px pitch, i.e. exactly that. */}
              <div
                className="[&>p+p]:mt-[calc(var(--lh)*1em)]"
                style={{ "--lh": LEADING.display } as CSSProperties}
              >
                {paragraphs.map((text) => (
                  <Display key={text}>{text}</Display>
                ))}
              </div>

              <div style={{ marginTop: CARD_SIGN_GAP }}>
                <p style={{ fontSize: TYPE.body, lineHeight: LEADING.body }}>{name}</p>
                <p style={{ fontSize: TYPE.role, lineHeight: LEADING.body }}>{role}</p>
              </div>
            </div>
          </div>
        </div>
      </Measure>
    </Band>
  );
}
