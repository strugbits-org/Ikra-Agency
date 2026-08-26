/**
 * The route-level fallback for both case studies, and the other half of the answer to the
 * white flash on navigation.
 *
 * `components/RouteCover` covers the swap itself — the frames between the old page going and
 * the new one painting. This covers the window *before* that: the router fetching the
 * destination segment. In production the two studies are prerendered and prefetched, so it
 * rarely appears; in development the segment compiles on demand and this is what stands in
 * for the seconds that takes. It is also what a reader gets if they land here on a slow
 * connection, where no client-side cover exists yet because there was no click.
 *
 * Next's own guidance is to prefer this over an inline pending state — see
 * `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-link-status.md`.
 *
 * Deliberately the same near-black and the same ring as the client cover, so a navigation
 * that crosses both windows does not change appearance halfway through.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen w-full items-center justify-center bg-[#0b0b0b]"
    >
      <span className="sr-only">Loading</span>
      <span
        aria-hidden
        className="h-11 w-11 animate-spin rounded-full border-2 border-accent/20 border-t-accent"
      />
    </div>
  );
}
