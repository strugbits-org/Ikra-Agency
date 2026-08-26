import Image from "next/image";
import type { CSSProperties } from "react";
import { Band, Display, Measure } from "./primitives";
import type { CaseStudy } from "./content";
import {
  CARD,
  CARD_ASPECT,
  CARD_PAD,
  CARD_SIGN_GAP,
  CARD_TINT,
  LEADING,
  TYPE,
} from "./metrics";
import type { CardTint } from "./metrics";

/**
 * The greyscale-and-compress the photograph goes through before it multiplies, as an SVG
 * filter rather than a CSS one.
 *
 * CSS shorthand filters are all linear: `contrast()` then `brightness()` in series map [0,1]
 * onto [(0.5-0.5c)b, (0.5+0.5c)b], which expresses any `[lo, hi]` band and nothing else. That
 * is enough for QCIF and provably not enough for Cafe Technica, whose shadows are crushed in
 * the source and have to be *lifted* rather than scaled — see CARD_TINT_CRUSHED. There is no
 * gamma in the CSS shorthand, so this drops to `feComponentTransfer`, whose `gamma` type is
 * `amplitude * pow(C, exponent) + offset`: one primitive for `lo + (hi - lo) * s^gamma`, with
 * `gamma: 1` collapsing to exactly the linear band CSS would have given.
 *
 * Two details are load-bearing. `color-interpolation-filters="sRGB"` — SVG filters default
 * to linearRGB, and every figure behind these numbers was measured in sRGB, which is also
 * where `multiply` composites. And `type="saturate" values="0"`, which is what the filter spec
 * defines `grayscale(1)` as, so the greyscale step is unchanged from the CSS path it replaces.
 *
 * The element is sized to nothing rather than hidden with `display: none`, which some browsers
 * take as licence not to resolve the reference.
 */
function TintFilter({ id, tint }: { id: string; tint: CardTint }) {
  const { gamma, lo, hi } = tint;
  const transfer = { type: "gamma", amplitude: hi - lo, exponent: gamma, offset: lo } as const;
  return (
    <svg aria-hidden focusable="false" className="absolute h-0 w-0 overflow-hidden">
      <filter id={id} colorInterpolationFilters="sRGB">
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR {...transfer} />
          <feFuncG {...transfer} />
          <feFuncB {...transfer} />
        </feComponentTransfer>
      </filter>
    </svg>
  );
}

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
 * ## `multiply` is the other half of the story, and white type is why
 *
 * The screen blend above is faithful to the Cafe Technica reference and it has one property
 * that is fatal for legibility: it *only lightens*. White copy over an ember field is 3.86:1
 * to begin with — already under the 4.5:1 that 22px body type needs — and every pixel the
 * photograph brightens takes it further down. A bright patch drives it to nearly 1:1, which
 * is what makes whole clauses of the Cafe Technica quote disappear into the shop window
 * behind them.
 *
 * So both studies set `blend: "multiply"` instead. Multiply can only darken, so the field
 * becomes the *lightest* the card ever gets and the guarantee runs the right way. The
 * photograph is compressed into a band of multipliers on that field first, which is what keeps
 * the card reading as the field with a photograph in it rather than as a dark panel laid over
 * it, and stops the shadows crushing the ember hue to black.
 *
 * **The transfer is per-study, and it has to be.** It maps a *nominal* [0, 1] and knows nothing
 * about where a given photograph's tones actually fall: measured off the render, 44.9% of Cafe
 * Technica's card sits in the bottom 5% of the input range against 0.1% of QCIF's, so one band
 * tints the one and puts a flat black mass across half of the other. Widening the band cannot
 * answer that — matching QCIF's low percentiles linearly would want `hi - lo = 2.44` — which
 * is why the transfer carries a gamma and why it is an SVG filter. See CARD_TINT_CRUSHED.
 *
 * The top of that range is bounded by legibility, and the bound is **not the same for both
 * blocks of copy**: the quote is 37px, which WCAG counts as large text and holds at 3:1,
 * while the 22px attribution under it needs 4.5:1. Letting the ceiling reach the field
 * exactly costs 3.86:1 at the very brightest pixel, which is fine under the serif and would
 * not be under the name — so what is actually verified is each block against its own
 * threshold, sampled off the render with the type hidden so glyph antialiasing cannot be
 * mistaken for background.
 *
 * ## The height is capped in vh, and the cap is applied to the width
 *
 * The card's height is otherwise a pure function of the viewport's *width* — a share of the
 * content box over a fixed aspect — so it grows with a wide window and takes no notice of a
 * short one. `maxVh` bounds it, and it is spent on the `width` rather than on a
 * `max-height`: a height cap on a box whose height comes from a ratio spacer either squashes
 * the ratio or clips the copy, whereas a width cap keeps the shape exact and simply draws the
 * card smaller. Same trick, and the same reason, as `IMAGE_MAX_VH` in `cases/timeline`.
 *
 * Note the cap cannot hide anything: the row's height is still `max(ratio, copy)`, so a card
 * whose copy outgrows the ceiling grows past it rather than losing a line.
 *
 * ## The panel is placed, not centred
 *
 * 1045px wide, starting 141px inside a 96px gutter, on a 1902px viewport: its centre lands
 * 191px left of the page's. Centring it is the obvious tidy-up and it is the one change here
 * that would be visibly wrong — the empty right-hand third is doing the same work as the
 * pull quote's, above.
 */
export default function Testimonial({ study }: { study: CaseStudy }) {
  const {
    photo,
    paragraphs,
    name,
    role,
    blend = "screen",
    tint = CARD_TINT,
    aspect = CARD_ASPECT,
    maxVh,
  } = study.testimonial;

  // The measured share of the content box, bounded by what `maxVh` of the viewport allows at
  // this shape. `min()` across % and vh is what keeps the aspect exact — see the head of this
  // file. Without a ceiling the first term stands alone, which is Cafe Technica.
  const width = maxVh
    ? `min(${CARD.width}%, calc(${maxVh}vh * ${aspect}))`
    : `${CARD.width}%`;

  // Greyscale first in both cases — the channel ratios the duotone is solved against
  // only hold if the source carries no hue of its own. The compression belongs to the multiply
  // path alone; on screen it would lift the blacks that blend is relying on, so that path keeps
  // CSS `grayscale` and no transfer at all.
  const multiply = blend === "multiply";
  const filterId = `card-tint-${study.slug}`;
  const tintClass = multiply
    ? "object-cover mix-blend-multiply"
    : "object-cover grayscale mix-blend-screen";
  const tintFilter = multiply ? `url(#${filterId})` : undefined;

  return (
    <Band tone="ember">
      <Measure>
        {multiply ? <TintFilter id={filterId} tint={tint} /> : null}
        <div
          className="relative w-full lg:[margin-left:var(--card-offset)] lg:[width:var(--card-width)]"
          style={
            {
              "--card-offset": `${CARD.offset}%`,
              "--card-width": width,
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
              // See the head of this file for the two measurements that fix the screen
              // duotone, and for the contrast arithmetic behind the multiply one.
              className={tintClass}
              style={{ objectPosition: photo.focus, filter: tintFilter }}
            />

            {/* The spacer: holds the measured ratio, contains nothing, and only from `lg` —
                below it a 1045:824 box on a phone is a letterbox with a paragraph in it. */}
            <div
              aria-hidden
              className="col-start-1 row-start-1 lg:[aspect-ratio:var(--card-aspect)]"
              style={{ "--card-aspect": String(aspect) } as CSSProperties}
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
