import { gsap } from "@/lib/gsap";

/**
 * A line that walks a list of stops, one at a time, and never skips one.
 *
 * This is the approach section's clock, and it is deliberately **not** `hero/flooredCue` —
 * which is what it was built on first, and which is the wrong shape for this brief in a way
 * worth writing down, because the two look similar enough to be swapped back by accident.
 *
 * `flooredCue` is a move played by a clock and **bounded by the reader's own position**:
 * `p = max(clock, ramp(vh))` going down, `min` coming back. That bound is exactly right when a
 * move has one destination — the clock gives the whole gesture at any scroll rate, and the
 * floor guarantees where it lands. It cannot express this section, and the reason is the bound
 * rather than the clock:
 *
 *   - **Going down**, a gesture large enough to cross two stops' worth of scroll puts the floor
 *     two stops ahead, and `max` pays that difference on a single frame. The line does not draw
 *     from the second dot to the third; it is already there. That is the "sometimes it jumps
 *     straight to the third one" the client reported, and "sometimes" is exactly right — it
 *     depends on how big the wheel gesture was.
 *   - **Coming back**, it is worse and it is unconditional. The bound going up is the stop
 *     *below* the reader, so `min(clock, bound)` hands the line its destination on the first
 *     frame of the gesture and the whole rewind is a snap. There is no scroll rate at which the
 *     reverse draws.
 *
 * So the position guarantee has to go, because "every step is visible" and "the line is always
 * exactly where your scroll says" are not both available above the crossover speed, and the
 * brief is the first one. What replaces it is a **lag bound**: the walk compresses as the reader
 * gets further ahead (`maxCatchUp`), so the line is never more than `seconds` behind them at the
 * point counts this section actually carries, and every step in between is still drawn. Nothing
 * downstream needs the tighter guarantee — the traverse rides the same number, so it arrives
 * with the line rather than against it, and a reader who outruns the walk gets the same thing
 * `DefinitionSection`'s tail gives them: the clock keeps painting after the trigger lets go.
 *
 * The stops themselves are ./measure's `stopsFor`. This module only knows there are some.
 */
export type Stepper = {
  /** Where the line is now, as a fraction of the rail. */
  read(): number;
  /**
   * Walk to stop `index`, one stop at a time. `-1` is the rail's start, before any stop.
   * Idempotent, so it is safe to call on every scroll event.
   */
  aim(index: number): void;
  /** Swap the stop table after a remeasure, keeping the line on the stop it is resting on. */
  retable(next: number[]): void;
  kill(): void;
};

export function createStepper({
  stops,
  seconds,
  ease,
  reverseSpeed,
  maxCatchUp,
  onUpdate,
}: {
  /** Where the line may rest, as ascending fractions of the rail. */
  stops: number[];
  /** How long one step takes when the reader is not ahead of it. */
  seconds: number;
  /** The ease on one step's arrival. Applied to the tween, because a step *is* one gesture. */
  ease: string;
  /** Multiplier on a backwards step's speed. Below 1 makes the rewind slower. */
  reverseSpeed: number;
  /**
   * The most a step may be sped up when the reader is ahead of the walk, as a multiple of its
   * own rate. This is the whole of the lag bound: `n` steps behind are covered in
   * `n / min(n, maxCatchUp)` steps' worth of time, so below this many the catch-up always
   * takes `seconds` flat however far behind the line is.
   */
  maxCatchUp: number;
  /** Called on every frame of the walk, so the caller can repaint. */
  onUpdate: () => void;
}): Stepper {
  const value = { p: 0 };

  let table = stops;
  /** The last stop the line actually reached. `-1` is the rail's start. */
  let at = -1;
  /** The stop the reader's scroll has paid for, which the walk is heading towards. */
  let goal = -1;
  /** The stop the step in flight is heading to, so a re-aim can tell it apart from a reversal. */
  let stepTo: number | null = null;
  let tween: gsap.core.Tween | null = null;

  const posOf = (i: number) =>
    i < 0 ? 0 : table[Math.min(i, table.length - 1)] ?? 1;

  const walk = () => {
    const dir = goal > at ? 1 : goal < at ? -1 : 0;
    const next = at + dir;
    const to = posOf(next);

    // `dir === 0` is not always "nothing to do": the reader can turn round in the middle of a
    // step and land back on the stop the line set out from, and simply stopping there would
    // park it between two dots for good. So the no-op is the *position* being right, not the
    // index, and a change of mind walks back to where it started like any other step.
    if (dir === 0 && value.p === to) {
      tween?.kill();
      tween = null;
      stepTo = null;
      return;
    }

    // How far behind the reader the line is, which is what buys the speed-up. The reverse leg
    // is scaled here rather than in the duration so both live in one term, and the floor of 1
    // is what keeps that abandoned step above from tweening at zero rate.
    const speed =
      Math.max(1, Math.min(Math.abs(goal - at), maxCatchUp)) *
      (to < value.p ? reverseSpeed : 1);

    // Already walking to this stop: the reader has only got further ahead, so the step keeps
    // its curve and changes pace. Rebuilding the tween instead would re-ease from wherever it
    // had got to, which is a visible hitch in the middle of the one move this exists to draw.
    if (tween && stepTo === next) {
      tween.timeScale(speed);
      return;
    }

    tween?.kill();
    stepTo = next;
    tween = gsap.to(value, {
      p: to,
      duration: seconds,
      ease,
      onUpdate,
      onComplete() {
        at = next;
        stepTo = null;
        // Straight into the next one, on the same frame, so a reader who is several stops
        // ahead sees the line run the dots rather than arrive at the last of them.
        walk();
      },
    });
    tween.timeScale(speed);
  };

  return {
    read: () => value.p,

    aim(index: number) {
      const next = gsap.utils.clamp(-1, table.length - 1, Math.round(index));
      if (next === goal) return;
      goal = next;
      walk();
    },

    retable(next: number[]) {
      table = next.length > 0 ? next : [1];
      at = Math.min(at, table.length - 1);
      goal = Math.min(goal, table.length - 1);
      // A refresh moves every stop, so a line at rest has to be put back on its own dot. One
      // that is mid-step is left alone: it is already heading for a stop read from the new
      // table, and snapping it would undo the step the reader is watching.
      if (!tween) {
        value.p = posOf(at);
        onUpdate();
      }
    },

    kill() {
      tween?.kill();
    },
  };
}
