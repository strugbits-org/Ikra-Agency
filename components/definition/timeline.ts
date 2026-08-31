import { gsap } from "@/lib/gsap";
import { CLOSE_VH, HERO_GRAY_TAIL_VH } from "../hero/timeline";

/**
 * The definition section's timeline, in vh of actual scrolling through the pin — same
 * convention as the hero's (pin runs top top → bottom bottom, so progress 0→1 covers
 * height − 100vh). Written as a chain of derivations, not a list of numbers, so retiming
 * one beat carries the rest along.
 *
 * Everything is scrubbed except the tail: crossing TAIL_AT starts a cue that plays to
 * completion on its own clock (see TAIL_AT).
 *
 * Phases (concurrent once the statement is gone, so listed by what they belong to rather
 * than strictly by start time):
 *
 *   (before)  the statement is already resolving, cued off the hero's wash to gray — see
 *             STATEMENT_LIFT_VH.
 *     0–50vh  the statement slides up and out, fading as it goes.
 *   20–120vh  the round window opens to fill the screen; the photo behind it is a
 *             full-bleed layer counter-scaled against the window (see placePhoto).
 *   70–120vh  the photo dissolves, starting at the growth's midpoint.
 *   measured  the wordmark slides left — no vh window of its own; driven off the
 *             definition's position (see MARK_APPROACH_FRAC).
 *   50–140vh  the definition climbs the right-hand side, from below the fold to clear
 *             off the top (DICT_VH).
 *   measured  the tail is cued once the definition stands LOGO_FADE_ABOVE_FRAC of its own
 *             height above the top edge (LOGO_FADE_AT is the constant backstop).
 *      0–0.8s the wordmark dissolves in place, leaving its three dots hanging.
 *    0.8–1.7s the camera pans onto the footer (after the dissolve, not across it).
 *   ~1.6–3.6s the footer's contents resolve, and the dots fall — both over the same span.
 *  131–155vh  the last of the scroll, TAIL_VH — room for the gesture, not a driver of it.
 */

/** The statement slides up and out of frame, fading as it goes. */
export const STATEMENT_VH = 50;

/**
 * The statement's entrance — rise and fade as it arrives.
 *
 * Scrubbed, not cued: it has to stay level with the section's top edge as that edge rises
 * into view, and only scroll position can track a moving edge. The move itself is 32px of
 * rise + opacity out of an ease-out, same as RevealBlock elsewhere on the page.
 */
// Negative: the paragraph starts above its resting place. It sits ~20vh below the
// section's top edge, and that edge only clears the bottom of the screen as the hero
// unpins — so lifting it by a real fraction of the viewport brings it into view as the
// edge arrives, rather than resolving it in place while still below the fold.
//
// Sized against the hero, not picked: it must be on screen by the earliest offset the
// wash can finish at (the hero's DOOR_CLOSE_AT), where this section's top edge sits
// CLOSE_VH + HERO_GRAY_TAIL_VH below the fold and the paragraph a further
// STATEMENT_PAD_VH under that — see the assertion below.
export const STATEMENT_LIFT_VH = 0.62;

/**
 * How far the paragraph sits below the section's top edge, in vh, at the smallest
 * viewport worth budgeting for.
 */
const STATEMENT_PAD_VH = 8;

/**
 * Where the paragraph's travel starts, as the section's top edge against the viewport —
 * not its fade, which reads the hero's wash instead (see STATEMENT_LIFT_VH).
 *
 * Placed at the hero's DOOR_CLOSE_AT (`100 + CLOSE_VH + HERO_GRAY_TAIL_VH` from this
 * section's own top edge): the earliest offset a reader can be looking at a finished
 * wash, so the paragraph must already be on screen by then.
 */
export const STATEMENT_REVEAL_AT_PCT = 100 + CLOSE_VH + HERO_GRAY_TAIL_VH;
// Scrubbed, not cued — it has to stay level with the rising edge, which a timed move can't.
export const STATEMENT_LIFT_END_PCT = 60;

/** The scroll the lift is spread over, in vh. */
export const STATEMENT_LIFT_VH_SPAN =
  STATEMENT_REVEAL_AT_PCT - STATEMENT_LIFT_END_PCT;

/**
 * The lift must not exceed its span, or the paragraph moves down the screen while the
 * reader scrolls down: position is `sectionTop + pad + y`, and the net rate is
 * `LIFT/SPAN − 1`, which flips sign above 1. `y` uses raw progress, not eased, for this
 * reason — see paintStatement.
 */
if (process.env.NODE_ENV !== "production") {
  const lift = STATEMENT_LIFT_VH * 100;
  const rate = lift / STATEMENT_LIFT_VH_SPAN;
  if (rate > 1) {
    console.error(
      `[DefinitionSection] the statement will move downward as the reader scrolls ` +
      `down: a ${lift}vh lift over a ${STATEMENT_LIFT_VH_SPAN}vh span is ` +
      `${rate.toFixed(2)}× the page's own rate. Lengthen the span or shorten the lift.`,
    );
  }
  // Too short a lift instead leaves the paragraph below the fold at the offset the
  // hero's wash can already have finished — the blank gray screen this exists to remove.
  const needed = CLOSE_VH + HERO_GRAY_TAIL_VH + STATEMENT_PAD_VH;
  if (lift <= needed) {
    console.error(
      `[DefinitionSection] the statement is still below the fold when the hero's ` +
      `wash can already be complete: a ${lift}vh lift against ${needed.toFixed(1)}vh ` +
      "of section edge + padding. Raise STATEMENT_LIFT_VH, or shorten CLOSE_VH / " +
      "HERO_GRAY_TAIL_VH.",
    );
  }
}

// The round window opens until it covers the frame, and the photo inside dissolves
// across the second half of that — derived from the growth rather than stated
// separately, so "starts at the halfway point" cannot drift.
export const GROW_AT = 20;
export const GROW_VH = 50;
export const FADE_AT = GROW_AT + GROW_VH / 2;
export const FADE_VH = GROW_VH / 2;

/**
 * The definition's climb up the right-hand side, from below the fold to clear off the
 * top. Longer than the distance it covers (travel ≈ H + its own height), so it crosses
 * slower than the page scrolls and holds visible mid-climb rather than being carried off.
 *
 * 90 is a floor, not a preference: below it the block moves faster than the page, which
 * reads as being flung off rather than climbing. The wordmark's slide is measured against
 * this window (see MARK_APPROACH_FRAC), so shortening it further squeezes that too.
 */
export const DICT_AT = STATEMENT_VH;
export const DICT_VH = 90;

/**
 * The wordmark's slide out of centre to the left, in response to the definition arriving
 * alongside it — not on its own clock. Has no vh window of its own and must not be given
 * one: a fixed window can't know where the definition actually is on a given viewport (two
 * earlier attempts at one each failed at a different end — see ./sequence for the current
 * shape). MARK_APPROACH_FRAC is the share of the definition's approach to the wordmark
 * that the slide is spread over; it always finishes exactly as the definition arrives.
 *
 * 1 is the ceiling and it's held there: at 0.5 the slide ran at 3.1–3.8× page speed and
 * read as flung rather than moved; at 1 the worst instant is still below that old constant
 * rate. Above 1 the slide would start part-done on the frame the phase opens.
 *
 * Slowing it further means lengthening DICT_VH instead (see there), not raising this.
 *
 * MARK_CLEAR_PX is the gap the definition's top edge keeps from the wordmark's bottom on
 * the frame the slide completes — in px since it's a gap between boxes, not a beat.
 */
export const MARK_APPROACH_FRAC = 1;
export const MARK_CLEAR_PX = 24;

/**
 * Soft at both ends — a response shouldn't snap into motion or stop dead — without
 * touching the endpoints MARK_APPROACH_FRAC guarantees. sine.inOut over a power curve:
 * lower peak rate (1.57× average vs 2×), which matters with the span already at its ceiling.
 */
export const MARK_SLIDE_EASE = gsap.parseEase("sine.inOut");

/**
 * The wordmark dissolves in place — letterforms only. The three dots are separate solid
 * elements already sitting on the artwork's own, so the "ikra." melts away and leaves its
 * dots behind, hanging in mid-air.
 *
 * LOGO_FADE_ABOVE_FRAC is a measured condition, not a fraction of the climb: the share of
 * the definition standing above the fold depends on H/D (viewport height vs. block
 * height), which varies 2.0–4.2 across viewports — so a fixed fraction of the climb left
 * anywhere from 22% to 54% of the block actually above the fold. This states the picture
 * directly and ./sequence reads it per frame off the definition's rendered `y`.
 *
 * LOGO_FADE_CAP_FRAC / LOGO_FADE_AT is the constant backstop: PIN_VH is the section's CSS
 * height and can't depend on anything measured, so the cue fires at whichever of the
 * measured condition or this cap comes first. It doesn't bind on any measured viewport.
 *
 * The floor under both is paint order: the dots paint above the definition and are lit as
 * this cue fires, so it must land after the definition's bottom edge clears the wordmark's
 * top — asserted in ./measure against the real boxes.
 *
 * It's the tail's first beat (see TAIL_AT), not a scrubbed phase in front of it, because a
 * scrub freezes wherever the reader stops — and a wordmark half-dissolved under three solid
 * dots, or three solid dots alone on flat gray, has no good reading. On the tail's clock the
 * whole run from first letterform to last dot is one gesture.
 *
 * LOGO_FADE_SECONDS is its length on that clock; DOT_CROSSFADE_LEAD is how far into it the
 * dots' own crossfade begins — lagged so the artwork's fading dot and the overlay always
 * read as one solid dot rather than the overlay snapping on.
 */
export const LOGO_FADE_ABOVE_FRAC = 0.35;
export const LOGO_FADE_CAP_FRAC = 0.9;
export const LOGO_FADE_AT = DICT_AT + DICT_VH * LOGO_FADE_CAP_FRAC;
export const LOGO_FADE_SECONDS = 0.8;
export const DOT_CROSSFADE_LEAD = 0.2;

/**
 * The tail — camera onto the footer, dots' fall, wordmark dissolve — is the one thing here
 * that is NOT scrubbed. Crossing TAIL_AT fires a timed timeline that runs to completion on
 * its own clock, same reasoning as HeroNarrative's wash: everything before this point holds
 * a pose when scroll stops, and a thrown ball frozen mid-air does not read as a ball.
 *
 * The dissolve is inside this timeline (not before it) so the ordering — dots must outlast
 * the wordmark — holds by construction on one clock, rather than depending on a scrubbed
 * fade finishing before scroll happens to reach here.
 *
 * ./sequence fires this on the measured condition (LOGO_FADE_ABOVE_FRAC) or this mark as
 * backstop, either way through one latch (`runTail`) so both directions agree.
 */
export const TAIL_AT = LOGO_FADE_AT;

/**
 * Pinned scroll given to the gesture. Not a scrub — the animation finishes in
 * TAIL_SECONDS regardless; this only keeps an ordinary scroll from outrunning it.
 *
 * Held small (24) deliberately: it can't work as a guard against every scroll speed
 * anyway (the gesture is clocked, this is scroll), so a large buffer only punishes the
 * reader who stops to watch — they'd get the animation for free and then grind through
 * whatever vh is left over a finished footer. CaseStudies follows this section, so being
 * outrun is not free the way it once was — but nothing tears: dots and footer are both
 * inside the stage and `tailTween` paints through `renderTail` independent of the pin, so
 * the composition leaves as one piece if the pin releases mid-flight.
 *
 * The one knob for the hand-off to CaseStudies — raising it delays that hand-off vh for vh.
 */
export const TAIL_VH = 24;

/**
 * The camera onto the footer — not animated content, just the camera moving down a
 * measured distance onto the track's second screen, coming to rest with the footer's
 * bottom edge on the viewport's. Must finish before the earliest dot touches down, or a
 * dot lands on a still-moving floor.
 */
export const PAN_SECONDS = 0.9;

/**
 * When the camera starts, on the tail's clock — after the dissolve, not over it: the
 * dots are children of the stage but the wordmark is inside the track the camera moves,
 * so panning early would slide the letterforms out from under their own dots.
 */
export const PAN_AT = LOGO_FADE_SECONDS;
export const PAN_END = PAN_AT + PAN_SECONDS;

/**
 * The longest fall — every other dot's flight is a fraction of this (see planFall), which
 * puts all three under one shared gravity. All three let go at the same instant:
 * staggering their release was what could leave the composition with no reading (wordmark
 * gone, one dot falling, two still hanging) — they still separate and land at different
 * times since their lift, restitution, drift, drag and kick all differ.
 */
export const DROP_SECONDS = 2;

/** Slack between the camera stopping and the first touchdown. */
export const DROP_MARGIN_SECONDS = 0.1;

/**
 * How much of a fall has gone by its first touchdown, at its smallest across every
 * viewport — the room the camera has to fit into. Small because a dot spends only about a
 * third of its flight descending; binds on a short phone, where the stacked footer can
 * leave a slot almost level with its own dot. A floor on the measured value, used only to
 * size TAIL_SECONDS — the real release is solved per viewport in `measure`.
 */
export const DROP_LEAD_MIN = 0.11;

/**
 * The gesture's length: the latest a release can be placed, plus the longest fall that
 * then has to play out. From PAN_END rather than PAN_SECONDS, so it carries the dissolve
 * the camera now waits behind.
 */
export const TAIL_SECONDS =
  PAN_END + DROP_MARGIN_SECONDS - DROP_LEAD_MIN * DROP_SECONDS +
  DROP_SECONDS;

/**
 * Rewinding is quicker than playing — the reader turned round and wants the previous
 * composition back, not a replay. Held as a ratio rather than a fixed number, so it scales
 * if TAIL_SECONDS does.
 */
export const TAIL_BACK_SECONDS = 1.4;

/**
 * The three photographs above the footer's columns, and their merge into one.
 *
 * On the tail's clock, not the scrub — mixing clocks over a shared moment (this merge and
 * the dots' fall) is this codebase's most expensive recurring bug, since two clocks drift
 * apart by exactly the reader's speed. On one clock the merge is frame-locked to the fall
 * at every speed and in both directions.
 *
 * IMAGE_IN is when the three resolve, as a fraction of the camera's pan — with the camera,
 * finishing before it stops, so there's a beat where they read as three separate
 * photographs before anything converges. The merge itself runs over exactly the dots'
 * flight, so the photograph locks up as the last dot lands.
 *
 * The merge closes gaps; it does not stack — each panel keeps its width and height and
 * only slides horizontally until edges meet, so the end state is one continuous
 * photograph. Travel per panel is solved from the measured boxes (see ./measure) rather
 * than the grid's gap value, so it tracks breakpoint changes without restating them.
 */
export const IMAGE_IN = [0, 0.75] as const;

/**
 * Which panel holds still, and so where the combined image ends up. The middle one, so the
 * block closes inward symmetrically with its centre never moving — anchoring an end panel
 * would drag the whole block sideways as it closed.
 */
export const IMAGE_ANCHOR = 1;

/**
 * How far past touching each seam closes, in px. Equal edges alone aren't enough —
 * ScrollSmoother scrolls by fractional pixels, so rounding can leave a hairline of footer
 * showing at the join. Same problem and fix as the hero's door panels (DOOR_PANEL_BLEED_PX).
 */
export const IMAGE_SEAM_BLEED_PX = 1;

export const IMAGE_IN_EASE = gsap.parseEase("power2.out");
export const IMAGE_MERGE_EASE = gsap.parseEase("power2.inOut");

export const PIN_VH = TAIL_AT + TAIL_VH;
export const SECTION_VH = PIN_VH + 100;

/**
 * Mobile-only: shortens the statement's entrance span (see statementTrigger) — nothing
 * else about the section's timing changes on mobile.
 *
 * STATEMENT_REVEAL_AT_PCT stays fixed (hero-linked), so the span shrinks from this end
 * instead. Bounded by the same rate ≤ 1 requirement as the desktop assertion — push this
 * above ~83 and the paragraph would visibly move down the screen while scrolling down.
 */
export const DEF_MOBILE_STATEMENT_LIFT_END_PCT = 78;

if (process.env.NODE_ENV !== "production") {
  const span = STATEMENT_REVEAL_AT_PCT - DEF_MOBILE_STATEMENT_LIFT_END_PCT;
  const rate = STATEMENT_LIFT_VH * 100 / span;
  if (rate > 1) {
    console.error(
      `[DefinitionSection] DEF_MOBILE_STATEMENT_LIFT_END_PCT=${DEF_MOBILE_STATEMENT_LIFT_END_PCT} ` +
      `leaves only a ${span}-unit span, which is narrower than the ${(STATEMENT_LIFT_VH * 100).toFixed(0)}-unit ` +
      "lift needs (rate " + rate.toFixed(2) + " > 1) — the statement would move down the screen " +
      "while scrolling down on mobile. Lower DEF_MOBILE_STATEMENT_LIFT_END_PCT.",
    );
  }
}

/**
 * The cross-fade out of the hero — see the veil in the markup. Spans HERO_GRAY_TAIL_VH
 * (imported, not copied, so it can't drift from the hero's own value) plus the 100vh after
 * it, where the hero's released stage scrolls up and this section's top edge scrolls in.
 *
 * Spans the wash itself, not just the dead tail after it: the wash is a timed tween, so a
 * fast reader can un-pin the hero while it's still part orange — this fade covers the rest
 * of the distance to the same gray, so the two ramps compose into one monotonic fade with
 * no hand-over.
 */
export const VEIL_VH = HERO_GRAY_TAIL_VH + 100;

/**
 * How far the veil overhangs past this section's own top edge, in px. Without it a
 * hairline of the hero's bright orange flickers along that edge, since three
 * separately-rounded boxes meet there and ScrollSmoother scrolls by fractional pixels.
 */
export const VEIL_OVERHANG_PX = 4;

/**
 * CSS `ease-out`, which is what RevealBlock used and therefore what this has to keep:
 * cubic-bezier(0, 0, 0.58, 1) sits within a couple of percent of power1.out across the
 * whole curve, and on a fade that difference is not visible.
 */
export const STATEMENT_REVEAL_EASE = gsap.parseEase("power1.out");

/**
 * The statement's fade, read off the hero's wash rather than scroll. Ease-in, the opposite
 * of a normal reveal: the wash is already sine.inOut and comes up quickly through its
 * middle, so a reveal curve on top would show the words at half strength while the stage
 * was still half orange. Easing in holds the paragraph back until the gray is most of the
 * way home, so it arrives onto gray rather than over the turnover.
 */
export const STATEMENT_FADE_EASE = gsap.parseEase("power2.in");

/** Soft at both ends, so the camera starts and stops like a scroll would. */
export const PAN_EASE = gsap.parseEase("power1.inOut");

/** A dissolve wants no accent at either end. */
export const LOGO_FADE_EASE = gsap.parseEase("sine.inOut");

/**
 * The footer's contents resolving in — on the tail's clock, across exactly the dots'
 * flight, so the two are one gesture and can't drift (reads the same m.releaseAt and
 * DROP_SECONDS the falls do).
 *
 * All of it together, no stagger — a stagger guarantees a stretch where some blocks are
 * resolved and others aren't, the same half-finished state the dots' simultaneous release
 * exists to avoid.
 *
 * Opacity only — no rise or scale, since the dots aim at slots measured out of this layout
 * and a transform here would move them without moving what was measured.
 */
export const FOOTER_REVEAL_EASE = gsap.parseEase("sine.inOut");
