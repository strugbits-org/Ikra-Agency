/**
 * The founders section's one beat: the corner radius on each photograph.
 *
 * Unlike the three marketing sections and the playground, nothing here is pinned and nothing
 * is written in vh of held scroll — the section is an ordinary run of document that scrolls
 * past at page speed, which is what the reference recording shows and what the section reads
 * as. So this file holds a window and a direction rather than a phase table.
 *
 * **What the photographs do.** Each one interpolates between a square and its own inscribed
 * ellipse as the block arrives, and the two people go in opposite directions: Tamir's starts
 * round and squares off, Olya's starts square and rounds. That is the reference's, it is what
 * the client described, and it reverses on the way back up.
 *
 * **What the reference can and cannot fix.** Its own radius is *lagged* — it keeps moving
 * through frames where the scroll offset does not change at all (the Olya photograph goes
 * from 28px to 50px of radius across four frames with its top edge parked at y = 292), and it
 * falls behind during a flick. So the recording's mid-transition frames measure the reader's
 * scroll speed, not a design window, exactly as the playground header's apparent speed did.
 * Only the frames where the scroll is *settled* say anything, and there are four of them:
 *
 *   Tamir   top edge 450 and below, held ten frames   square
 *   Tamir   top edge 158 (at rest), held thirty       square
 *   Olya    top edge 526, held ten frames             square
 *   Olya    top edge 127 (at rest), held twenty       full circle
 *
 * WINDOW_END below is the one figure those settle: Tamir's radius reaches zero as the
 * photograph's top edge crosses the middle of the viewport, measured 9px of radius at 456 and
 * 0 at 450 against a viewport middle of 456. The start is not similarly pinned — the
 * recording's two blocks disagree about it once the lag is taken out, Tamir's transition
 * being nearly over a viewport earlier than Olya's — so the start is this build's, and it is
 * the one knob here worth turning if the arrival wants to feel longer or shorter. It is held
 * below the fold rather than at it, for the reason RADIUS_START gives.
 */

import { gsap } from "@/lib/gsap";

/**
 * The window, as ScrollTrigger start/end strings against the photograph itself.
 *
 * `top center` is the photograph's top edge at the middle of the viewport, so the transition is
 * finished well before the block comes to rest — which is why every resting frame shows a
 * settled shape rather than a paused one.
 *
 * **The start is `top 80%` and deliberately not `top bottom`**: at the fold the photograph's
 * first pixel and its first frame of transition arrive together, so its *starting* shape is
 * never on screen — the first block came into view already part way to square, and a shape beat
 * nobody sees the start of reads as no beat at all. A fifth of a viewport of climb before the
 * radius moves is what makes the round end legible. It costs nothing at the other end: the
 * transition still lands on the measured mark, it simply runs over 30vh rather than 50.
 */
export const RADIUS_START = "top 80%";
export const RADIUS_END = "top center";

/**
 * Linear, and for the reason `playground/timeline`'s climb is: an ease is for a move that
 * starts and stops, and this one hands over to a shape that then simply holds. The measured
 * Tamir series is straight within its own noise across seven settled-enough samples (135, 114,
 * 100, 62, 35, 34, 9 against a linear prediction of 135, 122, 96, 79, 62, 33, 0), and any
 * curve on top of it would be inventing a figure the recording cannot supply.
 */
export const RADIUS_EASE = gsap.parseEase("none");

/**
 * The rounded end of the range, as a percentage. 50% of both axes is the box's inscribed
 * ellipse — a circle on the square media-left photographs, an ellipse on the landscape pair
 * in the flanked block, which is what the reference shows in both cases.
 */
export const RADIUS_MAX_PCT = 50;

/** Which way round a block runs. Stored per record in the CMS, as `shape`. */
export type Shape = "round-to-square" | "square-to-round";

/**
 * The radius a photograph carries at a given progress through the window, in percent.
 *
 * Pure, and exported so the reduced-motion path can ask for the resting shape (progress 1)
 * without going anywhere near a ScrollTrigger.
 */
export function radiusPct(shape: Shape, progress: number) {
  const p = RADIUS_EASE(gsap.utils.clamp(0, 1, progress));
  return (shape === "round-to-square" ? 1 - p : p) * RADIUS_MAX_PCT;
}
