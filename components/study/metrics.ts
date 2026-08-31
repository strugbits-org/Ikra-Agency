/**
 * Every number the case-study page is built from, and nothing else. No JSX, no DOM.
 *
 * All of it was measured off a 15.8s reference recording (1902×910) — frame analysis
 * only, since the capture tears badly while scrolling (usable frames: t=0.30 masthead,
 * 4.40 pull quote, 9.30 testimonial, 13.00 outcome). Type sizes are solved, not
 * eyeballed: ink width divided by the font's own advance widths, agreeing to 21.7→22px
 * across eight independent lines.
 *
 * Every figure is fluid rather than fixed: the reference is one viewport, so a fixed-px
 * copy would only match 1902 wide. `fluid()` restates each as
 * `clamp(floor, <measured share of viewport>, ceiling)`, exact at 1902 and scaling
 * elsewhere.
 */

/** The reference capture's layout viewport. Every `refPx` below is measured against this. */
export const REF_W = 1902;

/**
 * A measured pixel figure, restated as a share of the viewport with a floor and ceiling.
 * The floor keeps it legible on a phone (a straight scale-down of 1902px would put body
 * copy at 4px); the ceiling stops it reading as a zoom past ~2560.
 */
export const fluid = (minPx: number, refPx: number, maxPx: number) =>
  `clamp(${minPx}px, ${((refPx / REF_W) * 100).toFixed(4)}vw, ${maxPx}px)`;

/* ── type ────────────────────────────────────────────────────────────────────── */

/**
 * Three sizes carry the whole page. `body` (22px) is used at that one size across all
 * four sections — masthead columns, both pull-quote columns, outcome paragraphs, and the
 * testimonial's attribution name. `display` is the serif, fitted at 37px from a 26px cap
 * height, confirmed by its 54.5px line pitch.
 */
export const TYPE = {
  body: fluid(15, 22, 26),
  display: fluid(24, 37, 44),
  /** The attribution's second line, and the credits table. Set smaller than `body`. */
  role: fluid(13, 18, 21),
  /** A deliverable card's title — the one step between `body` and the serif `display`. */
  cardTitle: fluid(17, 26, 31),
} as const;

/**
 * Line pitch, as a ratio of the size above it. `body` and `dense` are the same 22px type
 * on two different leadings — deliberate in the reference, not an artefact: the masthead
 * and outcome run at 35px (1.59), the pull quote's columns at 28px (1.27). Unifying them
 * is the obvious tidy-up and wrong — the tight leading is what lets the quote's two
 * columns fit under a three-line display line without the section growing taller.
 */
export const LEADING = {
  body: 1.59,
  dense: 1.27,
  display: 1.47,
} as const;

/* ── the page's horizontal frame ─────────────────────────────────────────────── */

/**
 * Two gutters, genuinely different: the masthead's three columns start at 104px; every
 * other section's copy starts at 96. The masthead's 585px column pitch only closes
 * against 104 (104 + 585 + 585 = 1274, measured 1274) — against 96 the first column
 * would need its own indent.
 */
export const GUTTER = fluid(20, 96, 112);
export const GUTTER_MASTHEAD = fluid(20, 104, 122);

/**
 * A third gutter, the wordmark's alone: its ink starts at 70, left of either. Not an
 * asset artefact — `logo-white.png` is cropped to its alpha with no bleed — the reference
 * genuinely sets the mark outside the copy's column.
 */
export const GUTTER_MARK = fluid(16, 70, 82);

/* ── vertical rhythm ─────────────────────────────────────────────────────────── */

/**
 * Section padding. The three lower sections all open on 95–98px and close on 90–100px,
 * which is one value inside the measurement's own error, so it is one value here.
 */
export const BAND_PAD = fluid(56, 97, 116);

/** Masthead only: it closes further down than the others (measured 120px under the columns). */
export const MASTHEAD_PAD_BOTTOM = fluid(64, 120, 140);

/* ── section 1, the masthead ─────────────────────────────────────────────────── */

/**
 * The gap between the hero media and the intro columns, measured 195px from the media's
 * bottom edge to the columns' first line box.
 */
export const MASTHEAD_MEDIA_GAP = fluid(40, 195, 230);

/** The masthead's three columns: 522px each with a 63px gap, against a 1694px content box. */
export const MASTHEAD_COL_GAP = fluid(28, 63, 74);

/**
 * The masthead's opening. From a separate at-rest screenshot, not the recording (which
 * starts already scrolled) — hence rounder figures than the rest of the file.
 *
 * 18px is a constraint, not taste: the intro row below the hero must be visible before
 * any scrolling. At the reference's 907px viewport, 18 (this) + 75 (lockup) + 97 (below
 * it) + 438 (hero row) + 195 (MASTHEAD_MEDIA_GAP) lands the row at 823 against a measured
 * 826 — a 56px pad here (the first attempt) put it at 878 and cut it off.
 */
export const MASTHEAD_PAD_TOP = fluid(14, 18, 22);
export const MASTHEAD_MARK_GAP = fluid(42, 92, 108);

/** "MAY 2026" to the client block under it: measured 47px between their line boxes. */
export const MASTHEAD_META_GAP = fluid(24, 47, 56);

/**
 * The site mockup's shape. Measured 683 × 425 in the outcome band and 704 × 438 in the
 * masthead — the same panel at the same aspect, to within a pixel.
 */
export const MOCK_ASPECT = 683 / 425;

/**
 * The hero row, as shares of the masthead's content box: headline, gap, mockup, and the
 * mockup's inset from the right gutter.
 *
 * The left half is a line of copy, not a photograph — the one thing the recording
 * couldn't show, since it starts below the hero. Two lines of serif in the brand accent,
 * vertically centred against the mockup.
 *
 * Sits on the page's own 96px gutter, not the masthead's 104px one — measured, the
 * headline starts 8px left of "MAY 2026".
 */
export const HERO_ROW = { media: 46, gap: 8.4, mock: 41.1, inset: 4.5 } as const;

/**
 * The hero headline's leading, tighter than the rest of the page's display type. Read
 * off the supplied screenshot rather than the recording, so it carries less confidence
 * than the figures above it.
 */
export const HERO_LEAD = 1.35;

/**
 * The lockup: the drawn width of `logo-white.png`, and the descriptor's size under it.
 *
 * The asset already contains its own trademark — "ikra." plus a raised TM over the final
 * period — which is why its own aspect (2.441) differs from the reference wordmark alone
 * (2.167); setting a `™` in markup, as the first pass did, draws it twice. 120 is
 * therefore the *total* width, TM included, derived from the wordmark occupying 86.8% of
 * the file's ink and 98.7% of its height.
 *
 * `MARK_META` is 17px — smaller than it looks right, worth not "fixing": solved against
 * both words' advance widths (16.98, 16.82) and the measured line pitch (17), at a
 * line-height of exactly 1.
 */
export const MARK_WIDTH = fluid(80, 120, 142);
export const MARK_META = fluid(11, 17, 20);


/* ── section 2, the pull quote ───────────────────────────────────────────────── */

/**
 * The two columns, as shares of the content box, deliberately unequal: left starts at
 * the gutter and runs 820px, right starts 883px along and wraps at 580px — 48.4% / 34%
 * of a 1710px box with a 3.3% gap, leaving 14.3% standing at the right. A 12-column grid
 * reproduces the left column exactly and can't hit the right at any span, so the shares
 * are stated rather than derived.
 */
export const QUOTE_COLS = { left: 48.4, gap: 3.3, right: 34 } as const;

/**
 * The display line's own measure, as a share of the content box. The quote breaks after
 * "Christmas Eve. We" and "at 6am" only inside a measure between 1165px and 1220px; left
 * to the full 1710px box it sets as two lines and the band loses a line of height. 70% is
 * 1197px, the middle of that window.
 */
export const QUOTE_MEASURE = 70;

/** Display block to the columns below it: measured 35px. */
export const QUOTE_BODY_GAP = fluid(24, 35, 42);

/**
 * The quotation mark: drawn width, and how far it hangs off the copy. The pair is 118px
 * wide, sits 54px left of the copy and 34px above its line box — behind the first word,
 * deliberately. Clearing that overlap would leave the marks floating alone in the gutter.
 */
export const QUOTE_MARK_SIZE = fluid(52, 118, 140);
export const QUOTE_MARK_X = fluid(20, 54, 64);
export const QUOTE_MARK_Y = fluid(14, 34, 40);

/* ── section 3, the testimonial ──────────────────────────────────────────────── */

/**
 * The tinted photo panel: 1045px wide, starting 141px inside the gutter, in a 1710px
 * content box — 191px left of centre, measured rather than a rounding. Centring it is
 * the change here that looks like a fix and is not.
 */
export const CARD = { offset: 8.25, width: 61.1 } as const;

/** The panel's own padding, measured 52px from its left edge to the copy. */
export const CARD_PAD = fluid(24, 52, 62);

/** Panel height 824px against a 1045px width. Held so the photo crops the same way. */
export const CARD_ASPECT = 1045 / 824;

/**
 * A ceiling on the testimonial card's height, as a share of the viewport.
 *
 * The card's height is otherwise a function of viewport *width* alone, with no relation
 * to how tall the window is — measured on the built page it holds 1027px regardless,
 * overflowing 1920x900 by 127px and 2560x1080 by 277. Same fault as `IMAGE_MAX_VH` in
 * `cases/timeline`, same fix: a ceiling in vh, applied to width so the aspect is never
 * broken (see the `min()` in ./Testimonial).
 *
 * 65 is read off the QCIF comp (577px in an 890px window, 64.8vh), which reproduces its
 * 867×578 card within a pixel and keeps the band inside a screen at realistic heights.
 *
 * Opt-in per study, deliberately: Cafe Technica's own reference band is 1018px tall in a
 * 910px viewport — i.e. the reference itself doesn't fit its own screen — so "must fit a
 * screen" isn't a property of that page, and no global value could both preserve its
 * measurement and fix the other study's overflow.
 */
export const CARD_MAX_VH = 65;

/**
 * How the greyscale photograph is mapped before it multiplies over the field: a gamma on
 * the source, then a band of multipliers on the field to land in.
 *
 * `1` is the field untouched, `0` is black — `[0.5, 1]` says the lightest the photograph
 * may leave the card is the flat field it sits on, and the darkest is half of it. The
 * upper bound is what keeps the card reading as the field with a photograph in it rather
 * than a dark panel over it (an uncompressed multiply, which is what `[0.3, 0.9]` gave).
 * The lower bound stops shadows crushing to black and taking the hue with them.
 *
 * `gamma` is applied to the source first; `1` means it's a plain linear map, expressible
 * as CSS `contrast()`/`brightness()`. It exists because a linear map can't lift a
 * photograph whose shadows are already crushed — see CARD_TINT_CRUSHED.
 * `study/Testimonial` renders all three as one SVG `feComponentTransfer`
 * (`amplitude * pow(C, exponent) + offset`, i.e. `lo + (hi - lo) * s^gamma`).
 */
export type CardTint = { gamma: number; lo: number; hi: number };

/**
 * The default: no gamma, the band from half the field up to the field itself. QCIF's
 * photograph never approaches black, so it needs nothing more — measured at 44% of the
 * field's luminance with the copy at 4.27:1 and 5.34:1. See CARD_TINT_CRUSHED for the
 * study this doesn't work for.
 */
export const CARD_TINT: CardTint = { gamma: 1, lo: 0.5, hi: 1 };

/**
 * The transfer for a photograph whose shadows are already crushed — Cafe Technica's.
 *
 * `CARD_TINT` maps a nominal [0, 1] and knows nothing about where a photograph's tones
 * actually fall: 44.9% of Cafe Technica's card sits in the bottom 5% of the input range
 * against 0.1% of QCIF's (a sunlit shopfront with a dark interior vs. a soft dusk
 * street), so the same band tints one and crushes the other to a black mass. No wider or
 * higher band fixes it — matching QCIF's tonality linearly would need `hi - lo = 2.44`
 * against a median source grey of 0.064, i.e. the shadows have to be lifted, not scaled,
 * which needs a gamma.
 *
 * What actually bounds it is the brightest patch under the 22px attribution, which needs
 * 4.5:1 against white — that sets the whole card's ceiling. This sits at 60% of the
 * field with the photograph's figures still legible (4.56:1 under the quote, 4.71:1
 * under the attribution). The default's linear 43% matched QCIF's tonality exactly and
 * was still reported as too dark — the eye reads the dark mass, not the mean.
 */
export const CARD_TINT_CRUSHED: CardTint = { gamma: 0.33, lo: 0.66, hi: 0.91 };

/** Copy block to the attribution: measured 60px between their line boxes. */
export const CARD_SIGN_GAP = fluid(32, 60, 72);

/* ── section 4, the outcome ──────────────────────────────────────────────────── */

/** Display block to the paragraphs below it: measured 39px. */
export const OUTCOME_BODY_GAP = fluid(24, 39, 46);

/**
 * The mockup's width as a share of the content box. Sits in the right half, centred
 * vertically — measured top 237px against a predicted 241.5px for a centred panel,
 * within the measurement's own error.
 */
export const OUTCOME_MOCK_WIDTH = 39.9;

/* ── sections 5 and 6, the two copy-beside-media bands ───────────────────── */

/**
 * Display block to the paragraphs below it: 48px in both bands, wider than the 39 the
 * outcome band uses because these columns carry three and four paragraphs rather than
 * three short ones, and need the separation to read as a heading over a run.
 */
export const SPLIT_BODY_GAP = fluid(28, 48, 58);

/**
 * Section 5, brand applications: copy at 48.2% of the content box, photograph at 48.6%,
 * 3.2% between. Unlike the other bands this one reaches both gutters — the photo's right
 * edge lands on the page's own 96px gutter — which is what makes it read as a spread
 * rather than a placed block.
 */
export const APPLY_COLS = { copy: 48.2, gap: 3.2, media: 48.6 } as const;

/** 831 × 707 as supplied. Held, so the van keeps its place in the frame at every width. */
export const APPLY_PHOTO_ASPECT = 831 / 707;

/**
 * Section 6, identity: media left at 45%, copy right at 48.3%, with a wider 6.4% gap than
 * the applications band. The media reads as a grid of separate frames rather than one
 * photograph, so its own internal spacing sets the rhythm — closing to 3.2 would read as
 * a fifth column of it. True of the original gallery photo and of the video that
 * replaced it (see IDENTITY_MEDIA_ASPECT), so neither share moved for the swap.
 */
export const IDENTITY_COLS = { copy: 48.3, gap: 6.4, media: 45 } as const;

/**
 * The identity band's media is a video now, not the gallery photo it replaced, but the
 * box is still 661×541 — the crop, not a native size. The clip's own frame is 540×720
 * with no letterboxing, but shows the same grid-of-panels-on-black composition as the old
 * photograph (a taller slice of a repeating grid, not one continuous image), so cropping
 * to the photograph's own box reproduces the exact size the swap was asked not to disturb.
 */
export const IDENTITY_MEDIA_ASPECT = 661 / 541;

/* ── the QCIF study's own figures ────────────────────────────────────────── */

/**
 * The three shares of the QCIF brand band — copy left, mark right. Restated rather than
 * reused from IDENTITY_COLS: the two bands look alike but aren't the same measurement,
 * so aliasing them would let a retune of one silently move the other.
 */
export const BRAND_COLS = { copy: 48.3, gap: 6.4, media: 45 } as const;

/**
 * The mark's own aspect, and a ceiling on how wide it's drawn. 305×81 is `qcif-logo.png`
 * after cropping to its alpha (the supplied canvas was 406×722 with ink at 11.2% of the
 * height — undrawn, a contained box would show mostly transparent padding). The cap is
 * measured off the comp (~17% of the content box), well under the 45% column it sits in —
 * without it a logo stretched to fill its column stops reading as a mark.
 */
export const BRAND_MARK_ASPECT = 305 / 81;
export const BRAND_MARK_MAX = fluid(180, 300, 360);

/**
 * The hero video's frame is 1080×1350, but the browser mockup inside it isn't full-bleed
 * — the clip pads it top and bottom with flat colour. Decoded and walked pixel by pixel
 * (stable across thirteen timestamps), the mockup sits at y:[416, 933], i.e. 517px tall,
 * centred.
 *
 * `QCIF_HERO_ASPECT` is `1080 / 517`, not `1080 / 1350`: with the box wider than the
 * frame's own 4:5, `object-cover` scales to the full 1080 width and crops only the
 * height it overflows by, so setting the crop window's height to the mockup's own
 * removes the padding and none of the mockup. Side margins are left alone (`cover` can't
 * crop the axis it isn't scaling by), and are invisible now that `--color-navy` matches
 * the clip's own padding colour.
 */
export const QCIF_HERO_ASPECT = 1080 / 517;

/**
 * Cafe Technica's hero video, same story as QCIF's above, from the same 1080×1350 frame.
 * The padding here is flat black — already this band's own `dark` tone, so unlike QCIF's
 * this asset needed no matching colour of its own. The mockup sits at y:[397, 952] —
 * 555px tall, centred — hence `1080 / 555`.
 */
export const CAFE_HERO_ASPECT = 1080 / 555;

/**
 * The Auto Maxx hero screenshot's own 835×495. Same story as QCIF's: the capture already
 * carries its own browser chrome, so the masthead places it bare rather than inside
 * `BrowserMock`. Stated as the asset's own dimensions so the frame never crops it.
 */
export const CRM_HERO_ASPECT = 835 / 495;

/* ── section 7, the summary of deliverables ─────────────────────────────── */

/**
 * A label column against a content column, and the content column does not reach the
 * right gutter — leaving ~15% standing, the same habit the pull quote and testimonial
 * keep.
 *
 * The label column is set narrower than the terms need, which pulls the content column
 * ~103px left of centre; `label + gap + body` is held at 84.6, so widening the label
 * column is not a free change — DELIVERABLES_MEASURE carries the other half of it.
 *
 * The band's own heading sits in the content column rather than over the label one,
 * which is what makes the label read as a margin of terms rather than a first column.
 */
export const DELIVERABLES_COLS = { label: 24, gap: 2.9, body: 57.7 } as const;

/** Heading to the first row: 96px. Between rows: 72px, whatever the row's height. */
export const DELIVERABLES_HEAD_GAP = fluid(48, 96, 114);
export const DELIVERABLES_ROW_GAP = fluid(40, 72, 86);

/**
 * A prose row's measure, as a share of the content column. The card grid takes the
 * column whole; paragraph rows stop short of it, so the two don't line up on the right
 * and the cards read as the wider thing they are. 75% of the 57.7% column is the same
 * absolute measure as the 84% of 51.7% it replaced — the paragraphs didn't get wider
 * when the column moved left, they only start further left.
 */
export const DELIVERABLES_MEASURE = 75;

/**
 * The card grid's own measure, as a share of the same column — wider than the paragraphs
 * above it, but short of the column's full width, which keeps a two-up card from running
 * to the same length as a line of prose.
 */
export const DELIVERABLES_GRID_MEASURE = 88;

/** The card grid: two equal columns, a hairline border, and its own padding. */
export const CARD_GRID_GAP = fluid(10, 18, 22);
export const CARD_BOX_PAD = fluid(18, 30, 36);
/** Card title to its first paragraph, and between a card's paragraphs. */
export const CARD_TITLE_GAP = fluid(12, 20, 24);

/* ── section 8, the credits ─────────────────────────────────────────────── */

/**
 * A column of roles at 24% against names at 30%. The role column is set to the width the
 * longest role's line breaks want, not to what the text needs — at 26% the first row
 * fitted "Visual" onto its opening line where the reference breaks after "Naming,". Roles
 * are set medium (~2% wider than regular), so the two figures aren't independent —
 * unbolding them or changing `TYPE.role` moves the break.
 *
 * `role + gap` is held at 27, matching where the names start (558px on a 1902 viewport)
 * — so the gap absorbs any change to the role column rather than the names moving with it.
 */
export const CREDITS_COLS = { role: 24, gap: 3, name: 30 } as const;

/**
 * A partner mark set in the name column instead of a line of type. 350px at the
 * reference width, measured off the third study's comp (18.4% of a 625px artboard),
 * comfortably inside the 30% name column. Stated as a width only, with the asset's own
 * ratio giving the height.
 */
export const CREDITS_LOGO_WIDTH = fluid(140, 350, 380);

/**
 * Heading to the first row, and between rows. Set on `role`, not `body`. 24, not the 54
 * first taken off a PDF — measured again against a direct crop (51px above the first
 * row's baseline on a 28px pitch), the PDF's own scale had overstated it.
 */
export const CREDITS_HEAD_GAP = fluid(14, 24, 29);
export const CREDITS_ROW_GAP = fluid(16, 26, 32);

if (process.env.NODE_ENV !== "production") {
  // The pull quote's columns must not reach the right gutter, or a placed block reads as
  // a justified one.
  const used = QUOTE_COLS.left + QUOTE_COLS.gap + QUOTE_COLS.right;
  if (used > 90) {
    console.error(
      `[study] the pull quote's columns span ${used}% of the content box; the reference ` +
        "leaves 14.3% standing at the right, and the block reads as placed because of it.",
    );
  }

  // The testimonial panel must stay inside the content box.
  if (CARD.offset + CARD.width > 100) {
    console.error(
      `[study] the testimonial panel runs to ${CARD.offset + CARD.width}% of the content box.`,
    );
  }
}
