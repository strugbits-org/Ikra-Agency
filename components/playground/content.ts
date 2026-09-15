/**
 * The section's words, transcribed from the reference recording.
 *
 * Kept apart from the layer that sets them for the reason `study/content.ts` is: the copy is
 * the one thing here anyone will want to edit without reading a line of geometry.
 */

export const PLAYGROUND_COPY = [
  "After the journey against the current, a new genesis begins. That's how we work. " +
  "We go back to the source of a business to find what makes it strong, and shape " +
  "what comes next from there.",
  "ikra.agency* began with the belief that strategy, creative direction and development " +
  "belong in the same conversation. It was built to keep all three perspectives " +
  "together: three co-founders, one to lead each direction.",
] as const;

/**
 * The footnote under the rule. The asterisk is what the first paragraph's `ikra.agency*`
 * points at, so the two travel together.
 */
export const PLAYGROUND_NOTE = [
  "*/ɪˈkrɑ/ noun, uncount.",
  "from Russian икра (caviar)",
] as const;

/** The lockup under the wordmark, set on a line height of exactly 1 — see MARK_META. */
export const PLAYGROUND_DESCRIPTOR = ["rebranding", "agency"] as const;
