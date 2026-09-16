import {
  APPROACH_COLLECTION,
  wixParagraphs,
  wixQuery,
  wixText,
} from "@/lib/wix";

/**
 * The approach section's three points, which live in the client's Wix CMS rather than in this
 * repo — same arrangement as the founders section, and for the same reason: this is the
 * client's own copy about their own process, and they should be able to reword it without a
 * deploy.
 *
 * This module is the boundary. A CMS row is not typed, not validated and not guaranteed to be
 * there, so **every field is defended here and nowhere else**: a row missing its heading or its
 * body is dropped rather than rendered as a gap, and an unreachable CMS yields an empty array
 * rather than an exception (see `approachFromWix`). Nothing downstream knows Wix exists.
 *
 * There is no geometry here — the shape below is the whole of what the layers are handed, and
 * everything the section does with it (the cell count, the rail, the walk) is derived from the
 * *number* of points rather than from anything in a row. So a fourth point is a CMS row and
 * nothing else.
 */

export type ApproachPoint = {
  id: string;
  /** The heading, as one line. It wraps on its own; the CMS holds no break. */
  heading: string;
  /** The body, already split into paragraphs — all three currently hold exactly one. */
  paragraphs: string[];
};

function normalise(row: Record<string, unknown>): ApproachPoint | null {
  const id = wixText(row._id);
  const heading = wixText(row.title);
  const paragraphs = wixParagraphs(row.body);
  // A point is a heading and a body. Missing either, there is nothing to set, so the row is
  // dropped rather than rendered as a half-empty column.
  if (!id || !heading || paragraphs.length === 0) return null;

  return { id, heading, paragraphs };
}

/**
 * Every approach point, in the order the CMS's own `order` field gives.
 *
 * Returns an empty array rather than throwing when the CMS is unreachable or the collection is
 * empty, for the reason `foundersFromWix` sets out: one band of a page whose other sections are
 * in the repo, and a page that still scrolls with a band missing beats a route that 500s
 * because a third party is down. `wixQuery` logs the reason server-side either way.
 */
export async function approachFromWix(): Promise<ApproachPoint[]> {
  const rows = await wixQuery(APPROACH_COLLECTION, { sortField: "order" });
  if (!rows) return [];
  return rows
    .map(normalise)
    .filter((p): p is ApproachPoint => p !== null);
}
