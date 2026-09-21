import { MARK_GAP, MARK_W } from "./metrics";

/**
 * The founders' quotation mark: the reference site's own outline, verbatim.
 *
 * **This is the shape itself rather than a reading of it, and that is worth the two numbers it
 * costs.** The mark was traced first — a left and a right edge profile read row by row off the
 * recording's alpha, closed as one path, rasterising back at IoU 0.977 against the frame it
 * came from — and a trace off a compressed frame carries the compression with it: that outline
 * came out flat down the bowl's left side, faceted along the bottom, with an 8px spur poking
 * out of its right shoulder where one row of the scan ran wide, and a spike where the tail's
 * two flanks met. Reported as "not completely round", twice. Reconstructing it geometrically
 * answered the roundness and could only ever approximate the drawing. Then the path turned up
 * in the reference site's DOM, which ends the question — it is pasted below untouched.
 *
 * What it draws, measured off `getBBox` and a circle fitted to the outline: a box of
 * REF_W x REF_H, a bowl 98.5% of the width and 70.4% of the height, a tip at 0.414 of the
 * width, and a **rounded** cap across that tip 5.5% of the width — which is the detail every
 * approximation here missed in one direction or the other, the last one by a factor of three.
 *
 * **The box measured off the recording is confirmed rather than replaced.** 68.557 / 96 is
 * 0.7141 against MARK_W / MARK_H's 0.7176 — half a percent — so the two agree, and the
 * placement figures in ./metrics, which are in the measured box's units, still mean what they
 * meant. The path keeps its own coordinates and the viewBox does the conversion: nothing is
 * re-typed into another unit, which is the one way a verbatim path can stop being verbatim.
 */

/** The reference site's path, exactly as its DOM carries it. */
export const MARK_PATH =
  "M107.443 113.262c0 19.604 16.131 35.483 35.639 34.711 17.787-.701 32.199-15.307 32.891-33.333.762-19.77-14.906-36.117-34.251-36.117h-.121c-6.24.025-10.8-6.023-8.928-12.058a71.563 71.563 0 0 1 4.764-11.628c.39-.592.39-1.381.195-1.974-.195-.394-.584-.789-.974-.789-.584-.197-1.168 0-1.947.592-8.181 7.106-15.192 16.383-19.867 26.647-4.284 9.474-6.816 19.54-7.206 30.199-.191 1.184-.191 2.566-.191 3.75h-.004Z";

/**
 * The path's own bounding box, from `getBBox` on the path above rather than from reading its
 * numbers: the outline's extremes are on curves, so its control points understate the box.
 */
const REF_X = 107.443;
const REF_Y = 52.0;
const REF_W = 68.557;
const REF_H = 96.0;

/**
 * The measured gap between the two marks, restated in the path's units so the pair is one
 * drawing. MARK_GAP is in the box measured off the recording; this is the same distance.
 */
const REF_GAP = MARK_GAP * (REF_W / MARK_W);

/** What the second mark is translated by — one mark plus the gap, in the path's own units. */
export const MARK_STEP_X = REF_W + REF_GAP;

/** The pair's viewBox: the path's box, twice as wide plus the gap. */
export const MARK_VIEW_BOX = `${REF_X} ${REF_Y} ${REF_W * 2 + REF_GAP} ${REF_H}`;

/** The pair's rendered box, in the measured units ./metrics places it in. */
export const MARK_PAIR_W = MARK_W * 2 + MARK_GAP;
