/**
 * Every number the case-study page is built from, and nothing else. No JSX, no DOM.
 *
 * ## All of it was measured off the reference recording, not chosen
 *
 * The source is a 15.8s scroll-through captured at 1902 × 910 (a 1920 window less its
 * scrollbar). Figures below were read back from static frames — the capture tears badly
 * while scrolling, so only frames the recorder held still are trustworthy, and the ones used
 * are t=0.30 (masthead), t=4.40 (pull quote), t=9.30 (testimonial) and t=13.00 (outcome).
 * Type sizes are not eyeballed either: each was solved by measuring a line's ink width and
 * dividing by the exact advance-width sum of its string, taken from
 * `public/fonts/ZalandoSansSemiExpanded-VariableFont_wght.ttf`. Eight independent lines
 * across all four sections land within 0.15px of each other, at 21.7 → 22px.
 *
 * ## Why everything is fluid rather than fixed
 *
 * The reference is one viewport, so it can only ever say what the page looks like at 1902.
 * Reproducing it as fixed pixels would match that width and nothing else. Every figure is
 * therefore expressed as `clamp(floor, <its measured share of the viewport>, ceiling)` — at
 * 1902 each one evaluates to exactly what was measured, and away from it the page scales
 * rather than breaks. `fluid()` performs that conversion, so the measured pixel value stays
 * visible in the source at every call site.
 */

/** The reference capture's layout viewport. Every `refPx` below is measured against this. */
export const REF_W = 1902;

/**
 * A measured pixel figure, restated as a share of the viewport with a floor and a ceiling.
 *
 * The middle term is what makes the page fluid; the floor is what keeps it legible on a
 * phone, where a straight scale-down of a 1902px layout would put body copy at 4px. The
 * ceiling exists because past roughly 2560 the measured share stops reading as "the same
 * design, larger" and starts reading as a zoom.
 */
export const fluid = (minPx: number, refPx: number, maxPx: number) =>
  `clamp(${minPx}px, ${((refPx / REF_W) * 100).toFixed(4)}vw, ${maxPx}px)`;

/* ── type ────────────────────────────────────────────────────────────────────── */

/**
 * Three sizes carry the whole page.
 *
 * `body` is 22px at the reference and is used at that size in all four sections — the
 * masthead's columns, both columns of the pull quote, the outcome's paragraphs and the
 * testimonial's attribution name are all the same size. That was the surprise in the
 * measurement and is worth not "fixing" later.
 *
 * `display` is the serif, fitted at 37px from a 26px cap height against a 0.70 cap ratio and
 * confirmed by the 54.5px line pitch it is set on.
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
 * Line pitch, as a ratio of the size above it.
 *
 * `body` and `dense` are the same 22px type on two different leadings, and the difference is
 * deliberate in the reference rather than an artefact: the masthead and the outcome run at a
 * 35px pitch (1.59) while the pull quote's two columns run at 28px (1.27). Measured across
 * ten consecutive lines in each, to the pixel. Setting them to a common value is the obvious
 * tidy-up and it is wrong — the tight block is what lets the pull quote's two columns sit
 * under a three-line display line without the section growing a screen taller.
 */
export const LEADING = {
  body: 1.59,
  dense: 1.27,
  display: 1.47,
} as const;

/* ── the page's horizontal frame ─────────────────────────────────────────────── */

/**
 * Two gutters, and they really are two.
 *
 * The masthead's three columns start at 104px; every other section's copy starts at 96. That
 * is not measurement noise — the masthead's column pitch is 585px twice over, which only
 * closes against a 104px gutter (104 + 585 + 585 = 1274, measured 1274). Against a 96px one
 * the first column would have to carry an indent of its own.
 */
export const GUTTER = fluid(20, 96, 112);
export const GUTTER_MASTHEAD = fluid(20, 104, 122);

/**
 * A third, and the wordmark's alone: its ink starts at 70, well left of either gutter.
 *
 * Our own `logo-white.png` is cropped to its alpha with no bleed at all (measured: the
 * bounding box is the whole file), so this is not an artefact of the asset — the reference
 * genuinely sets its mark outside the column the copy is aligned to. Aligning it to the
 * gutter instead is the tidier-looking choice and moves it 34px.
 */
export const GUTTER_MARK = fluid(16, 70, 82);

/* ── vertical rhythm ─────────────────────────────────────────────────────────── */

/**
 * Section padding. The three lower sections all open on 95–98px and close on 90–100px, which
 * is one value inside the measurement's own error, so it is one value here.
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
 * The masthead's opening, and the constraint it exists to satisfy.
 *
 * The recording starts already scrolled, so the head of this band is not in it; these come
 * from a separate screenshot of the page at rest, which is why they are rounder figures than
 * the rest of the file.
 *
 * **18px is not a taste — the brief is that the intro row below the hero is visible before
 * any scrolling.** At the reference's 907px viewport the sum of everything above it has to
 * leave that row's first line box on screen: 18 (this) + 75 (the lockup) + 97 (below it) +
 * 438 (the hero row) + 195 (MASTHEAD_MEDIA_GAP) lands it at 823, against a measured 826.
 * Raise any of the five and the row goes under the fold — a 56px pad here, which is what
 * shipped first, put it at 878 and it was cut off on the reference's own window.
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
 * The hero row, as shares of the masthead's content box: the headline, the gap, the mockup,
 * and the inset the mockup keeps from the right gutter.
 *
 * **The left half is a line of copy, not a picture.** That is the one thing on this page the
 * recording could not show — it starts below the hero — and the first build filled the space
 * with a photograph. It is two lines of serif set in the brand accent, vertically centred
 * against the mockup: measured centre 407.5 against the row's own 409.
 *
 * The row sits on the page's own 96px gutter, **not** the 104px one the intro columns below
 * it use — measured, the headline starts 8px left of "MAY 2026". Against that 1713px content
 * box the mockup is 41.1% wide and stops 4.5% short of the right gutter, which puts it at
 * 1028..1732 against a measured 1027..1731. That inset is corroborated by the outcome band,
 * whose mockup stops 74px short of its own gutter.
 */
export const HERO_ROW = { media: 46, gap: 8.4, mock: 41.1, inset: 4.5 } as const;

/**
 * The hero headline's leading, tighter than the rest of the page's display type.
 *
 * Measured 50px between the two lines' cap tops at a fitted 37–38px, against the 54.5px the
 * pull quote and the outcome heading are set on. Read off the supplied screenshot rather than
 * the recording, so it carries less confidence than the figures above it.
 */
export const HERO_LEAD = 1.35;

/**
 * The lockup: the drawn width of `logo-white.png`, and the size of the descriptor under it.
 *
 * **The asset already contains its own trademark.** Its ink runs "ikra." and then a raised
 * TM over the final period, which is why its overall aspect is 2.441 while the reference's
 * wordmark alone measures 2.167 — the two disagreed only because they were measuring
 * different things. Setting a `™` beside it in markup, which is what the first pass did,
 * renders the mark with two of them.
 *
 * 120 is therefore the *total* width, TM included, and it is derived rather than picked:
 * the wordmark occupies the first 86.8% of the file's ink and 98.7% of its height, so at 120
 * the "ikra." itself draws at 104 × 48.4 — the reference's 104 × 48 to within half a pixel.
 *
 * `MARK_META` is **17px**, which is the surprise here and worth not undoing. The descriptor
 * looks tiny beside the mark and the first pass set it at 12; solving both of its words
 * against their advance widths returns 16.98 and 16.82, and the line pitch is 17 on the dot —
 * so it is 17px at a line-height of exactly 1.
 */
export const MARK_WIDTH = fluid(80, 120, 142);
export const MARK_META = fluid(11, 17, 20);


/* ── section 2, the pull quote ───────────────────────────────────────────────── */

/**
 * The two columns, as shares of the content box, and they are deliberately unequal.
 *
 * Measured: the left column starts at the gutter and its longest line runs 820px; the right
 * starts 883px along and wraps at 580px. That is 48.4% / 34% of a 1710px content box with a
 * 3.3% gap — and the 14.3% left standing at the right is real, the block does not reach the
 * right gutter. A 12-column grid reproduces the left column and the offset exactly and
 * cannot hit the right column at any span, so the shares are stated rather than derived.
 */
export const QUOTE_COLS = { left: 48.4, gap: 3.3, right: 34 } as const;

/**
 * The display line's own measure, as a share of the content box.
 *
 * The quote is three lines in the reference and breaks after "Christmas Eve. We" and after
 * "at 6am", which only happens inside a measure between 1165px (line 2's own width) and
 * 1220px (line 2 plus the next word). Left to the full 1710px content box it sets as two
 * lines and the band loses a whole line of height. 70% is 1197px, the middle of that window.
 */
export const QUOTE_MEASURE = 70;

/** Display block to the columns below it: measured 35px. */
export const QUOTE_BODY_GAP = fluid(24, 35, 42);

/**
 * The quotation mark: its drawn width, and how far it hangs off the copy.
 *
 * Measured orange-only (the marks are the accent; the sentence is black), the pair runs
 * x=42..159 and y=127..201 while the sentence starts at x=96 with its first cap top at 171.
 * So the pair is 118px wide, sits 54px left of the copy and 34px above the display's own
 * line box — which puts it *behind the first word*, deliberately. That overlap is the effect;
 * clearing it would leave the marks floating in the gutter on their own.
 */
export const QUOTE_MARK_SIZE = fluid(52, 118, 140);
export const QUOTE_MARK_X = fluid(20, 54, 64);
export const QUOTE_MARK_Y = fluid(14, 34, 40);

/* ── section 3, the testimonial ──────────────────────────────────────────────── */

/**
 * The tinted photo panel: 1045px wide, starting 141px inside the gutter, against a 1710px
 * content box. Left of centre by 191px — measured, not a rounding. The panel is placed, not
 * centred, and centring it is the one change here that looks like a fix and is not.
 */
export const CARD = { offset: 8.25, width: 61.1 } as const;

/** The panel's own padding, measured 52px from its left edge to the copy. */
export const CARD_PAD = fluid(24, 52, 62);

/** Panel height 824px against a 1045px width. Held so the photo crops the same way. */
export const CARD_ASPECT = 1045 / 824;

/** Copy block to the attribution: measured 60px between their line boxes. */
export const CARD_SIGN_GAP = fluid(32, 60, 72);

/* ── section 4, the outcome ──────────────────────────────────────────────────── */

/** Display block to the paragraphs below it: measured 39px. */
export const OUTCOME_BODY_GAP = fluid(24, 39, 46);

/**
 * The mockup's width as a share of the content box (683 of 1710). It sits in the right half
 * and is centred in it *vertically* — measured top 237px against a predicted 241.5px for a
 * centred 425px panel in a 656px row, which is the measurement's own error, not an offset.
 */
export const OUTCOME_MOCK_WIDTH = 39.9;

/* ── sections 5 and 6, the two copy-beside-media bands ───────────────────── */

/**
 * Display block to the paragraphs below it: 48px in both bands, wider than the 39 the
 * outcome band uses because these columns carry three and four paragraphs rather than three
 * short ones, and need the separation to read as a heading over a run.
 */
export const SPLIT_BODY_GAP = fluid(28, 48, 58);

/**
 * Section 5, the brand applications: copy at 48.2% of the content box, the photograph at
 * 48.6%, 3.2% between them.
 *
 * Unlike the four bands above it this one *does* reach both gutters — the photo's right edge
 * lands on the page's own 96px gutter rather than stopping short of it, which is what makes
 * the band read as a spread rather than as a placed block.
 */
export const APPLY_COLS = { copy: 48.2, gap: 3.2, media: 48.6 } as const;

/** 831 × 707 as supplied. Held, so the van keeps its place in the frame at every width. */
export const APPLY_PHOTO_ASPECT = 831 / 707;

/**
 * Section 6, the identity: the media takes the left at 45% and the copy the right at 48.3%,
 * with a wider 6.4% gap between them than the applications band above uses.
 *
 * The gap is wider because the media here is a grid of four separate frames rather than one
 * photograph — its own internal spacing sets the rhythm, and closing to 3.2 would read as a
 * fifth column of it.
 */
export const IDENTITY_COLS = { copy: 48.3, gap: 6.4, media: 45 } as const;

/**
 * The gallery asset's own 661 × 541. Its native ratio rather than the frame measured off the
 * reference (768 × 680), so `object-cover` has nothing to crop — this asset is a composition
 * of four panels and trimming any edge off it cuts a panel.
 */
export const IDENTITY_MEDIA_ASPECT = 661 / 541;

/* ── section 7, the summary of deliverables ─────────────────────────────── */

/**
 * A label column against a content column, and the content column does not reach the right
 * gutter — 30% / 51.7% with 2.9% between them, leaving ~15% standing, the same habit the
 * pull quote and the testimonial keep.
 *
 * The label column is narrower than the terms need, which pulls the content column ~103px
 * left of centre. The right edge does not move with it — `label + gap + body` is held at 84.6
 * — so widening the label column is not a free change, and `DELIVERABLES_MEASURE` carries the
 * other half of it.
 *
 * The band's own heading sits in the *content* column rather than over the label one, which
 * is what makes the label column read as a margin of terms rather than as a first column.
 */
export const DELIVERABLES_COLS = { label: 24, gap: 2.9, body: 57.7 } as const;

/** Heading to the first row: 96px. Between rows: 72px, whatever the row's height. */
export const DELIVERABLES_HEAD_GAP = fluid(48, 96, 114);
export const DELIVERABLES_ROW_GAP = fluid(40, 72, 86);

/**
 * A prose row's measure, as a share of the content column. The card grid takes the column
 * whole; the paragraph rows stop short of it, so the two do not line up on the right and the
 * cards read as the wider thing they are.
 *
 * 75% of a 57.7% column is the same absolute measure as 84% of the 51.7% it replaced — the
 * paragraphs did not get wider when the column moved left, they only start further left.
 */
export const DELIVERABLES_MEASURE = 75;

/**
 * The card grid's own measure, as a share of the same column. Wider than the paragraphs
 * above it — the cards are still the wider thing — but short of the column's full width,
 * which is what keeps a two-up card from running to the same length as a line of prose.
 */
export const DELIVERABLES_GRID_MEASURE = 88;

/** The card grid: two equal columns, a hairline border, and its own padding. */
export const CARD_GRID_GAP = fluid(10, 18, 22);
export const CARD_BOX_PAD = fluid(18, 30, 36);
/** Card title to its first paragraph, and between a card's paragraphs. */
export const CARD_TITLE_GAP = fluid(12, 20, 24);

/* ── section 8, the credits ─────────────────────────────────────────────── */

/**
 * A column of roles at 24% against the names at 30%.
 *
 * The role column is set to the width the *longest role's line breaks* want, not to what the
 * text needs — at 26% the first row fitted "Visual" onto its opening line and the reference
 * breaks after "Naming,". The roles are set medium, which is ~2% wider than regular, so the
 * two figures are not independent: unbolding them or changing `TYPE.role` moves the break.
 *
 * `role + gap` is held at 27, which is where the names start (558px on a 1902 viewport) and
 * within 2px of where the deliverables' content column starts above. So the gap absorbs any
 * change to the role column rather than the names moving with it.
 */
export const CREDITS_COLS = { role: 24, gap: 3, name: 30 } as const;

/**
 * Heading to the first row, and between rows. Set on `role`, not `body`.
 *
 * The head gap is 24, not the 54 first taken off the PDF — measured again against a direct
 * crop, the heading sits 51px above the first row's baseline on a 28px line pitch, which is
 * a 24px margin. The PDF's own scale overstated it.
 */
export const CREDITS_HEAD_GAP = fluid(14, 24, 29);
export const CREDITS_ROW_GAP = fluid(16, 26, 32);

if (process.env.NODE_ENV !== "production") {
  // The pull quote's columns must not reach the right gutter — the leftover is measured, and
  // a change that closes it has silently turned a placed block into a justified one.
  const used = QUOTE_COLS.left + QUOTE_COLS.gap + QUOTE_COLS.right;
  if (used > 90) {
    console.error(
      `[study] the pull quote's columns span ${used}% of the content box; the reference ` +
        "leaves 14.3% standing at the right, and the block reads as placed because of it.",
    );
  }

  // The testimonial panel has to stay inside the content box, or it bleeds past the gutter
  // every other section is aligned to.
  if (CARD.offset + CARD.width > 100) {
    console.error(
      `[study] the testimonial panel runs to ${CARD.offset + CARD.width}% of the content box.`,
    );
  }
}
