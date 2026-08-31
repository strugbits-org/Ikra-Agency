"use client";

/**
 * Whether the tail's own clock (see ./timeline's TAIL_SECONDS) still has gesture
 * left to play once the pin's scroll allowance (TAIL_VH) has run out — a tiny
 * external store, same shape as ../scrollLock and for the same reason: the piece
 * that knows the gesture isn't finished (this section's sequence) and the piece
 * that can actually stop scrolling (SmoothScrollProvider, which owns the
 * ScrollSmoother on desktop and has to reach for plain event prevention below
 * `md`, where there isn't one) are in different subtrees.
 *
 * TAIL_VH is deliberately short (see its own docblock) so a reader who stops to
 * watch isn't punished with a long grind of finished footer before CaseStudies —
 * but that means an ordinary scroll speed empties the allowance before the ~3.6s
 * gesture (wordmark dissolve, camera pan, footer resolving, dots falling) is
 * done, and the pin releases mid-flight: the stage scrolls away and CaseStudies
 * arrives underneath while the video/footer/dots are still only partway resolved.
 *
 * Locking here holds scroll for exactly what's left of the gesture, and only
 * once a reader has actually outrun it — see ./sequence's render(), the only
 * caller of lockTailScroll. A reader whose scroll speed never catches up to the
 * clock never triggers it at all, so nothing here changes their experience.
 */

let locked = false;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

export function lockTailScroll() {
  if (locked) return;
  locked = true;
  emit();
}

export function unlockTailScroll() {
  if (!locked) return;
  locked = false;
  emit();
}

export function subscribeTailScrollLock(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export const readTailScrollLock = () => locked;
