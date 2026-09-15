import {
  FOUNDERS_COLLECTION,
  parseWixImage,
  wixQuery,
  wixSrcSet,
  wixImageUrl,
  type WixImage,
} from "@/lib/wix";
import type { Shape } from "./timeline";
import { FLANK_H, FLANK_W, MEDIA } from "./metrics";

/**
 * The founders section's words and photographs, which live in the client's Wix CMS rather
 * than in this repo.
 *
 * **Why the CMS and not a typed record like `study/content.ts`.** The case studies are
 * finished documents that ship with a release; this is the client's own copy about their own
 * people, and they already had the photographs in their Wix Media Manager. So the collection
 * (`Founders`, created through the Data Collections API with `read: ANYONE`) is the source of
 * truth and this module is the boundary: everything below turns whatever the CMS hands back
 * into the small closed type the layers render, and nothing downstream knows Wix exists.
 *
 * That boundary is the point. A CMS row is not typed, not validated and not guaranteed to be
 * there, so **every field is defended here and nowhere else** — a row missing its quote is
 * dropped rather than rendered as a gap, an unrecognised `layout` falls back to the one the
 * section is mostly made of, and a failed request renders no section at all rather than an
 * empty grey band (see `foundersFromWix`).
 *
 * The photographs come back as `wix:image://` URIs, which no browser can load; `lib/wix`
 * turns them into CDN URLs at the sizes the layout already knows, which is why the boxes
 * below are imported from ./metrics rather than restated.
 */

/** Which composition a block takes. Stored per row as `layout`. */
export type Layout = "media-left" | "flanked";

export type FounderMedia = {
  src: string;
  srcSet: string;
  width: number;
  height: number;
};

export type Founder = {
  id: string;
  /** The person's name. Used for the photograph's alt text and nothing else. */
  name: string;
  /** The display quote, set in the display serif in the accent. */
  quote: string;
  /** The story, already split into paragraphs. */
  paragraphs: string[];
  /** The attribution line, exactly as it should be set — the reference uses two dashes. */
  attribution: string;
  photo: FounderMedia;
  layout: Layout;
  shape: Shape;
};

const LAYOUTS: Layout[] = ["media-left", "flanked"];
const SHAPES: Shape[] = ["round-to-square", "square-to-round"];

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Paragraphs are blank-line separated in one TEXT field rather than a rich-text field or a
 * repeater. Rich text would arrive as Wix's own Ricos JSON and need a renderer for markup
 * this section does not use — there is no bold, no link and no list anywhere in the reference
 * — and a repeater would make one block four rows to edit. A blank line is what the person
 * typing it will type anyway.
 */
const paragraphsOf = (v: unknown) =>
  str(v)
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/\s*\r?\n\s*/g, " ").trim())
    .filter(Boolean);

/**
 * The CDN boxes each layout asks for. Requested at the reference's own rendered size — the
 * `2x` of `wixSrcSet` covers dense screens, and nothing on this page ever draws a photograph
 * larger than its measured box.
 */
function mediaFor(img: WixImage, layout: Layout): FounderMedia {
  const [w, h] =
    layout === "flanked" ? [FLANK_W, FLANK_H] : [MEDIA, MEDIA];
  return {
    src: wixImageUrl(img, w, h),
    srcSet: wixSrcSet(img, w, h),
    width: w,
    height: h,
  };
}

function normalise(row: Record<string, unknown>): Founder | null {
  const quote = str(row.quote);
  const paragraphs = paragraphsOf(row.story);
  const img = parseWixImage(row.photo);
  const id = str(row._id);
  // A block is its quote, its story and its photograph. Missing any of the three, there is no
  // composition to lay out, so the row is dropped rather than half-rendered.
  if (!id || !quote || paragraphs.length === 0 || !img) return null;

  const layout = (LAYOUTS as string[]).includes(str(row.layout))
    ? (str(row.layout) as Layout)
    : "media-left";
  const shape = (SHAPES as string[]).includes(str(row.shape))
    ? (str(row.shape) as Shape)
    : "square-to-round";

  return {
    id,
    // The attribution first and the CMS title only as a fallback: the title is the
    // collection's display field and has to tell two rows about the same person apart in the
    // dashboard ("Olya Black (flanked)"), which is not what should be read out beside her
    // photograph. The attribution is already the name as the page sets it, minus its dash.
    name: str(row.attribution).replace(/^[-–—]\s*/, "") || str(row.title),
    quote,
    paragraphs,
    attribution: str(row.attribution),
    photo: mediaFor(img, layout),
    layout,
    shape,
  };
}

/**
 * Every founders block, in the order the CMS's own `order` field gives.
 *
 * Returns an empty array rather than throwing when the CMS is unreachable or the collection
 * is empty, and the section renders nothing at all in that case. That is the deliberate
 * choice: this is one band of a page whose other sections are in the repo, and a page that
 * still scrolls with a band missing is better than a route that 500s because a third party is
 * down. `wixQuery` logs the reason server-side either way.
 */
export async function foundersFromWix(): Promise<Founder[]> {
  const rows = await wixQuery(FOUNDERS_COLLECTION, { sortField: "order" });
  if (!rows) return [];
  return rows
    .map(normalise)
    .filter((f): f is Founder => f !== null);
}
