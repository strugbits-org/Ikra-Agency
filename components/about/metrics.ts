/**
 * Every measured figure the founders section is built from, and the `fluid()` that turns each
 * one into a `clamp()`.
 *
 * The reference is `second-section.mp4`, 1902 x 912 — the same capture size as the case
 * studies' recording, and 2px off the playground's 1904 x 913, which is the same browser on
 * the same machine and not a second layout. Figures below are that recording's, read off
 * frames the recorder held still; `fluid(min, ref, max)` restates each as its own share of
 * 1902, floored and capped, so at the reference width every value is exactly what was
 * measured and away from it the page scales rather than breaking. Same construction, and the
 * same reasons, as `study/metrics.ts` and `playground/metrics.ts`.
 *
 * Type sizes were solved rather than eyeballed: measure a line's ink width in the recording,
 * measure the same string in the same face in a real browser, and divide. A browser rather
 * than a sum of advance widths off the TTF, which is what `study/metrics.ts` used — the sum
 * ignores kerning, and on a 780px line of display italic that is worth several pixels in the
 * wrong direction. Eight independent lines of body copy agree at 22.3, and the display face
 * is settled in QUOTE below.
 */

const REF_W = 1902;

export const fluid = (minPx: number, refPx: number, maxPx: number) =>
  `clamp(${minPx}px, ${((refPx / REF_W) * 100).toFixed(4)}vw, ${maxPx}px)`;

/** The share of the reference width a figure takes, for anything that needs the raw number. */
export const share = (refPx: number) => (refPx / REF_W) * 100;

/**
 * The pull quote.
 *
 * **The face is Playfair Display Italic, and it is identified rather than chosen.** Solving
 * one line ("have pulled me out of 15 years of", 782px of ink, x-height 31px) against ten
 * candidate italics at the size each needs to hit that x-height, Playfair returns 787px —
 * 0.6% out — and every other candidate is 8% to 24% too wide: Crimson Text 845, DM Serif
 * Display 870, Lora 878, EB Garamond 897, Libre Bodoni 918, Bodoni Moda 929, Times New Roman
 * 945, Old Standard 968. Nothing else comes close enough to be arguable.
 *
 * That makes this the site's second serif, and deliberately not `--font-serif`: the case
 * studies' display line is Times New Roman, solved the same way off their own recording, and
 * the two pages genuinely differ. It is loaded as its own token (`--font-display`), italic
 * 400 only, and nothing outside this section reads it — which is the mistake the old Playfair
 * stand-in made and is worth not repeating (see the note on `--font-serif` in globals.css).
 *
 * **65px on an 80px pitch, tracked to -0.058em**, and the tracking is not a flourish — it is
 * what makes the two measurements agree. The line is 782px of ink and 66px tall in the
 * recording (64 once h.264's own bloom is taken out, measured by re-encoding this build's own
 * render at the reference's bitrate and watching 56 become 58). Playfair at its natural
 * tracking cannot be both: 57px matches the width to a pixel and is 8px short on the height,
 * 65px matches the height and runs 121px long. Tracked, 65px renders 783px of ink on this
 * page against the recording's 782 and 64px of height against its corrected 64 — and side by
 * side with the frame it is the setting that looks like it, where 57px is visibly looser and
 * smaller than the recording at every word.
 *
 * The pitch is measured across three lines in two separate blocks. Stating it as a ratio of
 * the size keeps the two consistent at every width.
 */
export const QUOTE = fluid(34, 65, 73);
export const QUOTE_LEADING = 80 / 65;
export const QUOTE_TRACKING = "-0.058em";

/**
 * The body copy: 22.3px on a 38.5px pitch, the pitch measured across ten consecutive lines in
 * two blocks and the size solved from eight of them — measure each line's ink in the
 * recording, measure the same string in Zalando in a real browser at 22px, and divide. The
 * eight return 22.18, 22.25, 22.27, 22.29, 22.31, 22.33, 22.39 and 22.49.
 *
 * **The .3 is load-bearing and 22 is not close enough.** 1.4% of a 780px line is 11px, which
 * is most of a word: at a flat 22 this section's first paragraph set in three lines where the
 * recording sets it in four, so every line below it landed on different words. Whether the
 * reference gets there by size or by a hair of tracking cannot be told apart from the frames,
 * and the size is the simpler of the two to state.
 *
 * Near enough the 22px the case studies set, which is not a coincidence — it is the same site
 * — but on a looser leading than either of theirs (1.59 in the masthead, 1.27 in the quote).
 */
export const BODY = fluid(16, 22.3, 24);
export const BODY_LEADING = 38.5 / 22.3;

/**
 * The blank line between paragraphs, and before the attribution — which is a paragraph like
 * any other, only bold. Measured 77px between the line *tops* either side of it in both
 * blocks, i.e. exactly two pitches, so one empty line. In em of the body so it tracks the type.
 */
export const PARA_GAP_EM = 38.5 / 22.3;

/**
 * The rule between the quote and the story, and the air either side of it.
 *
 * Its colour is measured, not guessed: a single 1px row reading 126 on the field's 222. The
 * site's ink at 60% over that field predicts 123, which is inside the video's own noise — so
 * it is ink at 60%, the same construction as the playground's white-at-60% rule.
 *
 * 23px below the quote's last line box and 29px above the story's first, from rules measured
 * at y = 403 and 372 against the quote and body lines either side of them, and then checked
 * against this build's own render rather than trusted: the recording's ink is ~1px fatter on
 * every edge than the page it was filmed from, which reads as a tighter gap above the rule
 * and a looser one below it than either really is.
 */
export const RULE_TOP = fluid(12, 23, 26);
export const RULE_BOTTOM = fluid(16, 29, 33);

/**
 * The block: a photograph, a gap, and a column of type, 1451px wide altogether and centred.
 *
 * **Centred is a correction, and a deliberate one.** Measured, the two Olya blocks are
 * centred to the pixel (224 left, 228 right of a 1451 block in 1902) and the Tamir block sits
 * 54px right of centre — same 490px photograph, same 839px column, same 122px gap, just
 * shifted. Three blocks of one composition where one is off by 54px is a page built by hand,
 * not a design figure, and reproducing it would put the founders' names on different vertical
 * axes for no reason anyone could name.
 */
export const COLUMN = 839;
export const MEDIA = 490;
export const MEDIA_GAP = 122;
export const BLOCK_W = MEDIA + MEDIA_GAP + COLUMN;

export const COLUMN_PCT = share(COLUMN);
export const MEDIA_PCT = share(MEDIA);
export const MEDIA_GAP_PCT = share(MEDIA_GAP);
export const BLOCK_W_PCT = share(BLOCK_W);

/**
 * Where the photograph's top edge sits, as a nudge below the column's own top.
 *
 * **The measured figure is against the *rule*, not against the quote's ink**, because the
 * rule is one unambiguous 1px row where an ink top depends on which ascenders a line happens
 * to have: the photograph's top is **rule - 245** in every media-left frame and **rule - 194**
 * in every flanked one, held to +/-1px across nine frames each. That constancy is also what
 * rules out a parallax on the photographs, which a first reading of the recording suggested
 * and which would have been a second clock over the radius's moment.
 *
 * The nudge is what that invariant costs *here*, and it is not the same 4px the recording's
 * own ink-to-ink gap suggests: how far the quote's first line of ink sits below its line box
 * is a function of Playfair's metrics at 65px on an 80px leading, and the offset was set by
 * rendering the page and measuring the photograph against its own rule until the two agreed.
 * Change the quote's size or leading and this has to be re-measured with them.
 */
export const MEDIA_TOP_NUDGE = fluid(8, 17, 19);

/**
 * The second Olya block sets the same column centred with the same photograph repeated at
 * each side: 347 x 274 each, 78px from the frame's edge, and starting 55px lower against the
 * quote than the media-left blocks' photograph does.
 *
 * **Symmetric, which the reference is not**: its left photograph sits 78px from the edge and
 * its right one 22px, while the column between them is centred to 2px. Same judgement as the
 * block offset above.
 *
 * There are no quotation marks on this block. That is the reference's own doing, not an
 * omission here — checked on every frame the block is legible in.
 */
export const FLANK_W = 347;
export const FLANK_H = 274;
export const FLANK_INSET = 78;
export const FLANK_W_PCT = share(FLANK_W);
export const FLANK_INSET_PCT = share(FLANK_INSET);
export const FLANK_TOP_NUDGE = fluid(30, 68, 76);

/**
 * The white quotation marks behind the quote's opening line: two of them, 61 x 85 each with
 * 13px between. They paint *under* the type — the accent letterforms cross them — which is
 * why they are the first thing in the block rather than a decoration on top of it.
 *
 * **They are drawn, not set.** The shape is a teardrop bowl with a thin tail and it is not
 * the opening double quote of any face on the page — Playfair's is narrower (0.54 wide for
 * its height against the reference's 0.72) — so the outline is traced off the recording
 * instead: a left and a right edge profile read row by row off the alpha at the frame's own
 * resolution, median filtered for the notch where the tail meets the bowl, simplified, and
 * closed as one path. It rasterises back at **IoU 0.977** against the frame it came from.
 * See MARK_PATH in ./marks.
 *
 * **Where they sit is the Olya block's, not the Tamir block's, and the two disagree.** In the
 * recording the pair is at x 852-985 in *both* blocks while the columns under them start at
 * 836 and 890 — i.e. the marks are placed absolutely on that page and took no notice of the
 * 54px the Tamir block is shifted by (see COLUMN above). Against the centred block they land
 * 18px inside the column's left edge and 28px above the quote's line box, which puts their
 * feet 3px off its first baseline; against the shifted one they would hang 38px out into the
 * gutter. The centred block is the one the rest of this file follows.
 */
export const MARK_W = 61;
export const MARK_H = 85;
export const MARK_GAP = 13;
export const MARK_LEFT = fluid(8, 18, 20);
export const MARK_TOP = fluid(-29, -25, -12);
export const MARK_W_PCT = share(MARK_W);

/**
 * The section's own air. 150px above the first block's quote box, measured off the frame in
 * which the section's top edge and the Tamir photograph are both on screen.
 *
 * **The bottom is mirrored, not measured, and the reference cannot supply it**: the founders
 * section is the last thing on that page, and its field stops 9px under the final
 * attribution's ink — flush with the last line box rather than padded. That is where the page
 * ends, not a figure about this section.
 *
 * Between blocks: 166px from one attribution's line box to the next quote's, read in a single
 * frame holding both, so no scroll-offset drift gets into it.
 */
export const PAD_TOP = fluid(64, 150, 170);
export const PAD_BOTTOM = fluid(64, 150, 170);
export const BLOCK_GAP = fluid(72, 166, 188);

/**
 * Where the stacked layout takes over: below this the block is one column — photograph above,
 * type under it — and at or above it the measured row runs.
 *
 * 1024 is Tailwind's own `lg`, which is what the layers switch on, and it is close to where
 * the row stops being worth having rather than comfortably inside it: at exactly 1024 the
 * 839px column has scaled to 452 while the type has already hit its 16px floor, so the
 * measure is 28em and about 50 characters — tight, and still a two-column composition that
 * reads. A step down from there it would not be, which is why nothing below this gets the row
 * at all.
 *
 * A width test rather than the aspect predicate `playground/river` uses, because the
 * constraint here genuinely is horizontal room for two columns and nothing else.
 */
export const ROW_MIN_WIDTH = 1024;

/** The widest the stacked photograph is allowed, so a tablet does not set a 700px portrait. */
export const STACK_MEDIA_MAX = 420;

/** The gutters the stacked layout keeps, matching the study pages' phone padding. */
export const STACK_GUTTER = fluid(20, 24, 24);

/**
 * The widest the stacked column is allowed, and it exists because the measured widths above
 * are *shares of the viewport* and stop meaning anything once the row is gone.
 *
 * Left to its share, the block reads 76.3% of the screen and the flanked column 44.1% — which
 * is the reference's composition at the reference's width and, at 390px, a 298px block with a
 * 172px column inside it: about 25 characters to the line, with 46px of empty gutter either
 * side of it. Below `lg` the block takes the width it is given instead, minus its gutters, and
 * this is what stops a tablet turning that into a 720px measure. 620px is about 38em at the
 * 16px floor, the top of the comfortable range.
 */
export const STACK_MEASURE_MAX = 620;
