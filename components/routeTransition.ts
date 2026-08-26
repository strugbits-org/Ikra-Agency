/**
 * Whether a route change is currently covered, as a tiny external store.
 *
 * Two components need to agree on this and they are in different subtrees: the link that
 * starts a navigation lives inside the case-studies track, and the overlay that covers the
 * screen is mounted by `SmoothScrollProvider` in the root layout. A context would work and
 * would re-render everything under it on every change; this is two booleans and a set.
 *
 * `useSyncExternalStore` rather than `useState` in an effect, which is the convention
 * `CaseStudies` already establishes here: a `setState` in an effect body is what
 * `react-hooks/set-state-in-effect` objects to, and those call sites are the whole of this
 * repo's lint error count.
 */

let shown = false;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

/**
 * Cover the screen. Called from the click rather than from a router event, because the click
 * is the earliest signal there is — in development the destination segment has not been
 * compiled yet, so everything between the click and the new page's first paint is a window
 * the router itself cannot tell us about.
 */
export function showRouteCover() {
  if (shown) return;
  shown = true;
  emit();
}

export function hideRouteCover() {
  if (!shown) return;
  shown = false;
  emit();
}

export function subscribeRouteCover(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export const readRouteCover = () => shown;

/** No navigation is in flight during a server render, and there is no window to cover. */
export const readRouteCoverOnServer = () => false;
