/**
 * Every beat in the bars' entrance. Pure numbers — nothing here touches the DOM.
 *
 * ## The reference is scrubbed; this is not, deliberately
 *
 * In the recording the bars are welded to the scroll: across twelve consecutive frames where
 * the page did not move (t=6.83–7.23, pixel-identical) not one bar grew, and every frame
 * where the scroll advanced they advanced with it. So the durations below are **not**
 * transcriptions — a scrub has no duration. What was transcribed is the *shape*: the ease,
 * the order the bars arrive in, the ratio of the stagger to a bar's own rise, and where in
 * that rise the cap appears. The clock is ours, because a scrubbed bar parks half-grown the
 * moment the reader stops, and a chart frozen mid-column reads as broken rather than as
 * paused.
 *
 * ## The order is set by each bar's own value, not by its position
 *
 * This is the one finding here that looks like a bug and is not. At every instant of the
 * recording the taller bars are further along: at t=6.40 the second row stood at 0.868 /
 * 0.766 / 0.691 / 0.868 / 0.498 of its five targets, which is descending by *height* and not
 * by column — the fourth bar is level with the first, not behind the third. And it is level
 * to the pixel, in both directions, on every frame of both the forward run and the reverse.
 * Two bars of equal height moving in exact lockstep three columns apart rules out a
 * positional stagger of any kind, including a random one, and leaves the value as the only
 * thing their timing can be derived from.
 *
 * `STAGGER_SPAN` is that relation. Read as a picture, it is a line sweeping down the track
 * releasing each bar as it passes the bar's own target: the tallest goes first because its
 * target is highest. Measured against scroll rather than against the recorder's clock — which
 * the frame drops make useless — it comes out at 250–261px of scroll per unit of value across
 * four independent bars of the second row, against ~441px for a bar's whole rise. That ratio,
 * 0.58, is what is preserved below; the absolute figures are chosen to sit inside a single
 * comfortable gesture.
 */

/** One bar's rise, and the curve it decelerates on. */
export const BAR_GROW_SECONDS = 1.1;

/**
 * `power2.out`, from the shape of the climb rather than from taste.
 *
 * The first row's progress against its own scroll runs 0.463 → 0.551 → 0.682 → 0.868 → 0.964
 * → 0.995 over an even spread of positions: the ratio of progress to elapsed distance falls
 * 1.77 → 1.57 → 1.25 → 1.13 → 1.08, i.e. it decelerates the whole way and never accelerates.
 * A quadratic out is the closest standard curve; the exact exponent is not recoverable,
 * because the start of the rise happens below the fold where nothing can be measured.
 */
export const BAR_GROW_EASE = "power2.out";

/**
 * The delay a bar of value 0 would take relative to the row's tallest, in seconds.
 *
 * 0.58 × `BAR_GROW_SECONDS` — see the header. Each bar's own delay is that span scaled by how
 * far short of the row's peak it falls, so the tallest starts at once and nothing waits on an
 * empty screen. Scaled against the row's own peak rather than a fixed 100, so a row whose
 * tallest bar is 60 still opens immediately instead of holding for 40% of the sweep; the
 * reference cannot settle that either way, since both of its rows peak at 100.
 */
export const STAGGER_SPAN = 0.64;

/**
 * When a bar's cap appears, as a fraction of that bar's own rise, and how long it takes.
 *
 * The cap is not painted on the fill — it waits at the bar's target while the fill climbs to
 * meet it, which is the whole reason the mid-flight frames show a rule floating over a gap of
 * black. It is also not there from the start: probed frame by frame at the target row, its
 * brightness runs 0.1 → 13.7 → 29.1 → 125.2 → 184.8 → 221.0 → 242.3 → 245.8 over eight
 * frames, so it fades in rather than popping, and it does so while the fill is between 0.65
 * and 0.75 of the way up — under `power2.out` that is 0.42 to 0.50 of the elapsed rise.
 *
 * `CAP_AT` takes the near end of that window as measured. `CAP_SECONDS` is longer than the
 * measurement's own 0.09 of a rise: at this duration that would be a 95ms flick, which reads
 * as a pop, and the recording cannot tell us what fraction was intended because its clock is
 * the reader's wheel. 0.18s lands the cap fully lit at 0.56 of the rise against a measured
 * 0.50 — a frame or two late, and visibly a fade.
 *
 * Note that a cap that fades in correctly and then *disappears* as the bar arrives is not a
 * timing bug — it is paint order. See the note on the cap element in ./GrowthBars.
 */
export const CAP_AT = 0.4;
export const CAP_SECONDS = 0.18;

/**
 * Where a row is on screen when it starts.
 *
 * Keyed to the row's **bottom** edge, which is the part that matters: a bar grows upward from
 * the foot of its track, so a trigger on the row's top would start the climb 419px below the
 * fold and the reader would meet a chart already built. The 10% is the head start the
 * reference itself takes — its first row was already 44% grown when its baseline was still
 * below the viewport — kept small enough that the arrival is what lands on screen.
 */
export const ROW_START = "bottom bottom+=10%";
