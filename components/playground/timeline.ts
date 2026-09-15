import { gsap } from "@/lib/gsap";

/**
 * The playground section's timeline, in vh of actual scrolling through the pin — the same
 * convention as `hero/timeline.ts` and `definition/timeline.ts`. The pin runs
 * `top top → bottom bottom`, so progress 0→1 covers `height − 100vh`, which is why
 * SECTION_VH is PIN_VH + 100 and why multiplying progress by the *section* height would
 * overstate real scroll.
 *
 * Three beats, and the first of them is read straight off the reference recording rather than
 * designed:
 *
 *   0–105vh    the copy climbs from below the fold to the centre of the screen, and the
 *              header leaves over the last stretch of that. Nothing else moves: the river is
 *              measured stationary in the viewport across the whole reference clip.
 *   105–135vh  the assembled composition holds, still, so that it exists as a state the
 *              reader arrives at rather than as a single frame in passing — see HOLD_VH.
 *   135vh      the pin releases and the section scrolls away as an ordinary adjacent block,
 *              uncovering what follows. Verified as plain flow: through the release the
 *              stage's bottom edge and the next section's top edge are the same number on
 *              every frame, so nothing overlaps and nothing is covered.
 *
 * The release being an ordinary scroll rather than another phase is the recording's own
 * behaviour, and it is checkable in it: once the copy parks, the section's bottom edge and
 * the copy's rule move together at a fixed 222px offset for the rest of the clip — i.e. one
 * rigid layer leaving, not a second animation. (The clip itself never scrolls past this
 * section — the river fills all 78 frames of it — so it says nothing about the hand-off, and
 * the figures above are this build's, not transcriptions.)
 */

/**
 * The climb. The copy's travel is `(viewportHeight + blockHeight) / 2` — from just under
 * the fold to centred — which is ~74vh at the reference's own viewport, so over this span
 * the block crosses at about 0.7× the page's own rate. That is the figure that matters: a
 * block that moves at or above page speed reads as being carried off rather than climbing,
 * which is the floor `DICT_VH` is held against in DefinitionSection for the same reason.
 */
export const CLIMB_VH = 105;

/**
 * How long the assembled composition holds before the pin releases — i.e. how much scroll sits
 * between the copy arriving at the centre and the section starting to leave.
 *
 * **It cannot be zero, and that it was is what made the section read as being taken over by the
 * one below it.** With `HOLD_VH = 0` the climb and the pin end on the same scroll offset, so the
 * copy's arrival and the section's departure are the same instant *by construction*: there is no
 * scroll position at which the finished composition exists. Measured through one continuous flick
 * at 1440x900, the last frame before the release had the copy at 314 against a resting 289 and
 * the next frame had the whole stage 81px up and climbing — the reader sees the copy rise, and
 * then sees it swept off the top with the gray coming up behind it, which is not a section
 * scrolling out, it is a section being removed mid-gesture.
 *
 * So this is the beat the section is actually for, and it is sized from the reader rather than
 * chosen: at an ordinary reading scroll of ~800px/s, 30vh of a 900px window is 270px, i.e. about
 * a third of a second with the composition assembled and still. That is the shortest dwell that
 * registers as an arrival. Below about 15 it is back to a flicker; above about 45 the stillness
 * starts to read as the page having stopped responding.
 *
 * Two earlier passes cut this to 10 and then to 0 chasing exactly the complaint it causes when
 * absent, on the theory that the frozen stretch was the problem. It was not — see the note on
 * `scrub` in ./sequence, which is where the real fault was, and which had to be fixed first for
 * any value here to behave predictably. A hold under a lagged clock is spent on catch-up rather
 * than on the composition, which is why removing it twice changed nothing the reader could see.
 *
 * It remains the one knob for the hand-off to whatever follows: raising it delays that vh for vh.
 */
export const HOLD_VH = 30;

/**
 * The header leaves with the copy, over this window of the climb. It does not sit still — the
 * reference's lockup clears the top edge as the copy arrives and comes back as the copy
 * descends.
 *
 * **What is measured is the position, and only the position.** Tracking the descriptor's top
 * edge against the copy's rule at 30fps: the lockup holds at y = 18 while the copy climbs from
 * 851 to 797, then clears the top while the copy moves a further 36px. Converting those two
 * rule positions to the copy's own progress puts the move at **0.75 → 0.80** of the climb. The
 * end here is 0.85 rather than 0.80 because 0.80 is where the lockup's *top* left the screen,
 * not where its last pixel did.
 *
 * **The speed it appears to move at is not measurable from the recording, and it is worth
 * being explicit about why.** The reference's header is *cued* — a fixed-duration tween, ~0.2s
 * in both directions, and coming back up it keeps arriving for a sixth of a second after the
 * copy has already parked. A cued move's velocity against a scrubbed one is just the reader's
 * scroll speed, so its apparent ratio to the copy is whatever that happened to be: the same
 * recording gives **2.1×** going down and **5.4×** coming up. There is no design figure there
 * to reproduce.
 *
 * So this is scrubbed off the same clock as the copy, which preserves the one thing that is a
 * design figure and makes the two a single coupled gesture that cannot drift. A second clock
 * over one shared moment is this repo's most expensive recurring bug — the hero's wash, its
 * door close, DefinitionSection's wordmark slide, each drifting by exactly the reader's speed.
 */
export const HEADER_EXIT = [0.75, 0.85] as const;

/**
 * Soft at both ends. Unlike the climb this rides on, the header genuinely does start and stop
 * — it is still at 0.75 and still again by 0.85 — so it is the case an ease is actually for.
 */
export const HEADER_EXIT_EASE = gsap.parseEase("sine.inOut");

export const PIN_VH = CLIMB_VH + HOLD_VH;
export const SECTION_VH = PIN_VH + 100;

/**
 * **Linear, and not eased** — which is the opposite of what it shipped as, and the reason is
 * worth keeping.
 *
 * `sine.inOut` is the obvious choice for a move that starts and stops, and it is wrong for one
 * that hands over. Measured across the last 240px of scroll before the release, it moved the
 * copy 25, 19, 13, 6, 0.5, 0 px — it decelerates to a standstill *inside* the pin, so the last
 * stretch of the climb is a second dead zone on top of whatever HOLD_VH is. Linear moves it a
 * steady 26px per 40px of scroll right up to the hand-off, where the stage takes over at 40 —
 * so the reader sees continuous motion that speeds up slightly into the release, never a stop
 * followed by a jump.
 *
 * There is no abruptness to ease away, because nothing here actually stops: the copy does not
 * come to rest and then wait, it reaches the centre exactly as the section begins to leave.
 * `DefinitionSection`'s own climb is linear for the same reason.
 *
 * At this span the copy crosses at about 0.7× the page's own rate, which is what makes it read
 * as climbing rather than as being carried — see CLIMB_VH.
 */
export const CLIMB_EASE = gsap.parseEase("none");

/**
 * How fast the copy travels along the river, in px per second, and in which direction.
 *
 * Measured, not chosen: the ribbon's three largest ink blobs repeat at a 400px pitch along
 * the path, and tracking that pitch across two frames two seconds apart puts it 40px further
 * *upstream* — toward the top-right, against the river's own flow, which is what the copy
 * says. `hero/WavyBand.tsx` runs at 55 px/s, but its glyphs are half the size; per em this
 * one is about a third of that speed, and it reads as a drift rather than a marquee.
 */
export const MARQUEE_SPEED = 20;

/**
 * The copy that rides the river, and the gap between repetitions.
 *
 * The triangle is U+25C0 and it points upstream — back along the direction the copy is
 * travelling. Worth knowing before editing it: the Zalando variable font has no glyph for it
 * (checked against the file's own cmap), so it renders from the platform fallback, and the
 * measured 400px pitch at a 46px type size only closes if that fallback's advance is about
 * 0.6em. A different marker will shift the pitch; nothing breaks, the repeats simply sit
 * closer or further apart.
 */
export const RIVER_TEXT = "Work Upstream";
export const RIVER_MARKER = "◀";
/**
 * The gap either side of the marker. A non-breaking space rather than an ordinary one,
 * because SVG collapses runs of ordinary whitespace — and built from its code point rather
 * than pasted in, since a literal U+00A0 in source is invisible to whoever edits this next.
 */
export const RIVER_GAP = String.fromCharCode(0x00a0);

if (process.env.NODE_ENV !== "production") {
  // The climb has to be slower than the page it is scrolling against, or it reads as being
  // swept off rather than rising. Worst case is the tallest block on the shortest viewport,
  // which is a phone: travel is (H + block)/2, and a block can reach roughly 0.8H there.
  const worstTravelVh = ((1 + 0.8) / 2) * 100;
  if (worstTravelVh > CLIMB_VH) {
    console.error(
      `[Playground] the copy would travel ${worstTravelVh.toFixed(0)}vh over a ` +
      `${CLIMB_VH}vh span, i.e. faster than the page scrolls, and would read as being ` +
      "carried off rather than climbing. Raise CLIMB_VH.",
    );
  }
}
