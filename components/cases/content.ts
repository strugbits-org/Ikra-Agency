import {
  CASE_STUDIES_COLLECTION,
  parseWixImage,
  wixOriginalUrl,
  wixQuery,
  wixText,
} from "@/lib/wix";
import { caseStudySlugsFromWix } from "@/components/study/cms";
import { CASE_PROJECTS, type CaseProject } from "./projects";

/**
 * The case-study cards, as the client's Wix CMS holds them — the same arrangement as the
 * founders and the approach points, and the first one on `app/page.tsx` rather than
 * `/playground`.
 *
 * **This module is the boundary.** A CMS row is not typed, not validated and not guaranteed
 * to be there, so every field is defended here and nowhere else; `./projects` keeps the type
 * and `./CaseLayers` renders whatever comes out of this, knowing nothing about Wix.
 *
 * ## What a row may leave out, and what happens when it does
 *
 * Only four fields are load-bearing — a title, a description, an image and an id — and a row
 * missing any of them is dropped rather than rendered as a half-built card. The rest carry
 * the defaults the three current cards already use, so **a row the client fills in with
 * nothing but those four renders exactly like Café Technica's**: cropped to the row's shared
 * frame, centred, rounded, and with no link.
 *
 *   - **The link is not a field at all** — it is this row's id under `/work/`, and the card is
 *     clickable exactly when a study page exists at it. A `link` column used to carry the path
 *     and was deleted: once the study pages became CMS rows keyed by the same slug, the column
 *     held nothing but `/work/` plus the id it sat beside, so the only thing it could
 *     contribute was a typo — and a typo there is a card that looks right in the CMS and 404s
 *     on the site, with nothing to warn anyone. What it *did* earn was the empty case, which
 *     is preserved below rather than dropped: a card whose study hasn't been written yet is an
 *     unclickable caption, not a dead link.
 *   - `rounded` absent → **rounded**, which inverts the field's default in `./projects`. Every
 *     card on the page opts in there, so "unset" meaning square would make a new row the odd
 *     one out; a client who wants square corners unticks a box.
 *   - `aspect` absent → the card takes the row's shared frame and `object-cover` crops to it.
 *     That is the right default and the reason it is worth understanding before adding an
 *     image: see the note on the field in `./projects`. A photograph loses its top and bottom
 *     and is still the same photograph; a *screenshot* loses the edge of the interface, which
 *     is why the two capture cards state a ratio and the photograph does not.
 *
 * ## The fallback is the in-repo array, and it is not belt-and-braces
 *
 * The founders and approach bands render nothing when the CMS is unreachable, because they
 * are bands of a page whose other sections are in the repo. This section cannot take that
 * deal: the *contact panel* is inside it (see `./RevealPanel`), so an empty case-studies
 * section would take the site's one point of contact off the home page because a third party
 * was down. `CASE_PROJECTS` therefore stands behind it — the same three cards, from `/public`
 * — and is used whenever the CMS yields nothing usable.
 */

function normalise(
  row: Record<string, unknown>,
  /** The slugs that have a study page. See `linkFor` below. */
  pages: ReadonlySet<string>,
): CaseProject | null {
  const id = wixText(row._id);
  const title = wixText(row.title);
  const description = wixText(row.description);
  const img = parseWixImage(row.image);
  // A card is a title, a line of description and a picture. Missing any of them there is no
  // cell to build, and an empty one still costs the track a whole pitch of travel.
  if (!id || !title || !description || !img) return null;

  // Positive and finite or it doesn't count: this number becomes an `aspectRatio`, and it is
  // the *row's* frame that `Math.max`es over it, so one bad value in one row would reshape
  // every card beside it.
  const aspect =
    typeof row.aspect === "number" && Number.isFinite(row.aspect) && row.aspect > 0
      ? row.aspect
      : undefined;

  return {
    id,
    title,
    description,
    imageSrc: wixOriginalUrl(img),
    link: pages.has(id) ? `/work/${id}` : null,
    ...(aspect === undefined ? {} : { aspect }),
    // Only an explicit `false` turns it off — see the docblock above on why absent is `true`.
    rounded: row.rounded !== false,
  };
}

/**
 * Every case-study card, in the order the CMS's own `order` field gives, falling back to the
 * three in `./projects` when the CMS gives nothing usable.
 *
 * "Nothing usable" covers both an unreachable CMS (`wixQuery` returns `null`) and a response
 * whose every row was dropped by `normalise`. They are treated the same deliberately: from
 * the page's side there is no difference between the two, and neither is a reason to serve a
 * home page with no work on it and no way to make contact.
 */
export async function caseStudiesFromWix(): Promise<CaseProject[]> {
  // Two reads, and the second is what decides whether a card is a link: a card points at
  // `/work/<its id>`, so the only question is whether a study has been written there. Both are
  // ordinary cached fetches on the same revalidate, so this stays one build step and the page
  // stays static — see `revalidate` in `app/page.tsx`.
  const [rows, slugs] = await Promise.all([
    wixQuery(CASE_STUDIES_COLLECTION, { sortField: "order" }),
    caseStudySlugsFromWix(),
  ]);
  const pages = new Set(slugs);

  const projects = (rows ?? [])
    .map((row) => normalise(row, pages))
    .filter((p): p is CaseProject => p !== null);

  return projects.length > 0 ? projects : CASE_PROJECTS;
}
