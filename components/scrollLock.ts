"use client";

/**
 * Whether the initial load is still gating scroll, as a tiny external store — same
 * shape as ./routeTransition and for the same reason: the piece that knows when the
 * page is actually ready (the hero's load timeline, see hero/intro) and the piece
 * that can stop scrolling (SmoothScrollProvider, which owns the ScrollSmoother
 * instance on desktop and has to reach for plain event prevention on mobile, where
 * there isn't one — see its own docblock on why that split exists) are in different
 * subtrees.
 *
 * Starts unlocked. Only the home page's hero ever locks it, in the same effect that
 * starts its load timeline, so a route with no hero — every case study — is never
 * touched by this at all.
 */

let locked = false;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

export function lockInitialScroll() {
  if (locked) return;
  locked = true;
  emit();
}

export function unlockInitialScroll() {
  if (!locked) return;
  locked = false;
  emit();
}

export function subscribeInitialScrollLock(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export const readInitialScrollLock = () => locked;
