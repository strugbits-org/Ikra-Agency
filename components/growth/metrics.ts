/**
 * The bar chart's layout, and every figure in it was measured off the reference recording.
 *
 * ## The source
 *
 * A 19.8s scroll-through captured at 1902 × 942 — the same 1902 reference width the rest of
 * the case-study page was measured against, which is why `fluid()` is imported from there
 * rather than restated here. The capture tears while scrolling, so a bar's edges were only
 * ever read off frames the recorder held still, and the two rows were measured separately
 * (t=5.0 for the first, t=9.4 for the second) because the band is taller than the viewport
 * and no single frame holds both.
 *
 * ## The bar's bottom is invisible, so it was solved rather than sampled
 *
 * The fill is a linear ramp from the accent to black on a black field, so its lower third
 * quantises to `0,0,0` and no threshold can find its baseline: a naive scan puts the bottom
 * of a 419px bar 25px above the bottom of a 147px one, purely because the tall bar's tail is
 * longer. The baseline here is the ramp's **zero crossing**, least-squares fitted on the red
 * channel over the clean middle of each bar. That is what makes the figures below agree —
 * across the five columns of a row the fitted baselines land within 1.4px of each other, and
 * the two rows independently return the same 419px maximum.
 */

import { fluid } from "@/components/study/metrics";

/**
 * The track a bar grows inside: 419px at the reference.
 *
 * Measured twice over. The first row's bars solve to 419.2 / 419.2 / 355.2 / 419.2 / 419.2
 * against a baseline of 519.2, and the second row's to 419.7 / 333.7 / 269.7 / 419.7 / 145.7
 * against 505.7 — two rows, ten bars, one 419px ceiling. That agreement is the reason the
 * per-item figures in the content record can be read as plain percentages of one track.
 *
 * The floor is what keeps a phone honest rather than proportional: a straight scale of 419
 * to a 390px viewport is 86px, which is not a chart. See `PER_ROW` — the column count comes
 * down at the same widths, so the cells stay wide enough for the track to be worth its height.
 */
export const TRACK_H = fluid(180, 419, 500);

/**
 * The five columns' gap: 48px, and it closes the content box exactly.
 *
 * Measured column edges at 96..399, 447..751, 799..1101, 1150..1453 and 1501..1805 — a 352px
 * pitch on a 304px cell. Five 303.6px cells and four 48px gaps is 1710, which is the page's
 * own content box (1902 less two 96px gutters) to the pixel, so the row needs no width of its
 * own and inherits the gutter every other band on the page is aligned to.
 */
export const COL_GAP = fluid(12, 48, 57);

/**
 * Between one row's label and the next row's track: 52px.
 *
 * Derived rather than read, because the thing that was measurable is the distance from a
 * bar's baseline to the *next* track's top — 103px at t=8.4 and 102 at t=8.0. Taking out the
 * label's own margin (`LABEL_GAP`, 23) and its line box (22px at `LEADING.dense`, 27.9)
 * leaves 52. Retuning either of those two moves this one with it.
 */
export const ROW_GAP = fluid(28, 52, 62);

/**
 * The heading's line box to the first track: 52px.
 *
 * Measured from the serif's baseline, which sat 64px above the track's top on three separate
 * still frames (t=2.0, t=2.4, t=2.8 — 64, 65, 64). The 12px between that baseline and the
 * bottom of its own line box is Playfair's descent plus half its leading at `LEADING.display`,
 * so the margin is 52. That it lands on the same figure as `ROW_GAP` is a coincidence of the
 * two measurements, not one value used twice — they are separately sourced and kept separate.
 */
export const HEAD_GAP = fluid(28, 52, 62);

/**
 * A bar's baseline to its label: 23px to the label's line box, 29px to its ink.
 *
 * 29 is the measured figure — the cap top of "BRAND STRATEGY" sat 29px under the fitted
 * baseline in both rows and at every still frame. 23 is what that costs as a margin: at 22px
 * on `LEADING.dense` the line box is 27.9px, Zalando's own content area is 26.7px (964 + 250
 * over 1000 units), so the cap top sits 6.1px below the line box's top edge.
 *
 * The label is `TYPE.body` — **22px, no letter-spacing**, and that is solved rather than
 * assumed. Ten of them, measured ink width over the exact advance-width sum of each string
 * taken from `public/fonts/ZalandoSansSemiExpanded-VariableFont_wght.ttf`, return 21.4–22.1;
 * adding a 0.02em tracking drops the same ten to 20.9–21.5 and scatters them further. The
 * font's 0.714 cap ratio then predicts a 15.7px cap against the 16px measured. So the whole
 * page really is one body size, this band included.
 */
export const LABEL_GAP = fluid(12, 23, 27);

/**
 * The light rule that caps a bar: 3px.
 *
 * Measured y=195..197 with the ramp's first pixel at 198, and again at 361..363 with the fill
 * from 364 — 3px at both ends of the band. Its colour reads (252,242,241), which is white
 * through this recorder's own transfer rather than a warm tint; the same encoder returns the
 * logo's known `--color-accent` as (233,81,62), so a couple of counts of chroma on a
 * saturated white is expected.
 */
export const CAP_H = fluid(2, 3, 4);

/**
 * Five bars to a row, which is what the reference sets and also all the room there is.
 *
 * Not a free number below `lg`: five 22px labels across a 768px frame leaves 118px a cell,
 * and "CUSTOM DEVELOPMENT" needs 291 to set on one line. The count therefore steps down with
 * the width — see `GrowthBars`, which chunks the items into rows of this size and then lets
 * the grid reflow them — so a row is a *group* here rather than a guaranteed visual row.
 * Every group animates on its own entrance, which is what reproduces the reference's second
 * row starting well after its first has finished.
 */
export const PER_ROW = 5;
