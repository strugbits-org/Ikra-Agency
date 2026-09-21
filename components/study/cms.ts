import {
  CASE_STUDY_DELIVERABLES_COLLECTION,
  CASE_STUDY_PAGES_COLLECTION,
  parseWixImage,
  parseWixVideo,
  wixLines,
  wixOriginalUrl,
  wixParagraphs,
  wixPosterUrl,
  wixQuery,
  wixText,
  wixVideoSources,
  type WixDataItem,
  type WixImage,
} from "@/lib/wix";
import {
  APPLY_FRAME,
  CARD_FRAME,
  CARD_TINT_CRUSHED,
  HERO_FRAME,
  IDENTITY_FRAME,
  OUTCOME_FRAME,
  frameRatio,
  type MediaFrame,
} from "./metrics";
import type { CaseStudy, MediaSplit, StudyMedia } from "./content";
import { fieldFor } from "./field";

/**
 * The case studies, as the client's Wix CMS holds them.
 *
 * **This module is the boundary**, in the same sense as `components/cases/content.ts` and the
 * two on `/playground`: a CMS row is untyped, partly filled and may not be there at all, so
 * every field is defended here and nothing downstream knows Wix exists. `./content` keeps the
 * type, `./CaseStudyPage` renders it, and neither imports anything from `lib/wix`.
 *
 * ## An absent field is a band that isn't there, not a band that's broken
 *
 * The three studies are one template now (see the head of ./content), and what distinguishes
 * them is which parts are filled in — QCIF has no applications band because its row's
 * applications fields are empty, not because its record says so. So every optional band here
 * returns `undefined` unless it has the one field that makes it worth drawing, and
 * `./CaseStudyPage` skips it. That is also what a half-written fourth study looks like while
 * somebody is writing it: the bands they have finished, in order, and nothing else.
 *
 * ## What the client is not asked
 *
 * Two fields on the collection are marked internal and hidden from the CMS: the testimonial
 * card's tint and its height cap. Both are answers to "how dark is this photograph" and "is
 * this quote short", which are real per-asset decisions that no useful wording could put in
 * front of somebody editing copy — the same judgement, and the same CMS field plugin, as the
 * home page's `aspect` column.
 *
 * Alt text is not asked for either, and is derived per band from the study's own title. That
 * is a deliberate trade and the weaker half of it: a hand-written alt (\"A Café Technica
 * service van in the new Esprescue™ wrap\") says more than anything derivable. Against that,
 * five more fields on an already long form are five fields that get left empty, and an empty
 * alt field is worse than a derived one. The testimonial's photograph is the exception in the
 * other direction — it is a tint behind a quote and carries nothing the quote doesn't say, so
 * its alt is empty on purpose rather than for want of a field.
 */

/* ── small readers ───────────────────────────────────────────────────────── */

/**
 * One media slot: the clip if the row names one, the picture otherwise, nothing if neither.
 *
 * The clip wins when both are set, and the field descriptions say so — a row that has had a
 * video added to it is a row whose picture is now a leftover.
 */
function mediaOf(
  imageValue: unknown,
  videoValue: unknown,
  alt: string,
  frame: MediaFrame,
): StudyMedia | undefined {
  const video = parseWixVideo(videoValue);
  if (video) {
    return {
      src: wixPosterUrl(video),
      alt,
      // The poster is a frame of the clip, so its dimensions are the clip's. A URI without
      // one falls back to the slot's measured figure — see `frameRatio`.
      aspect: frameRatio(video.width, video.height, frame),
      sources: wixVideoSources(video),
    };
  }

  const image = parseWixImage(imageValue);
  if (!image) return undefined;
  return {
    src: wixOriginalUrl(image),
    alt,
    aspect: frameRatio(image.width, image.height, frame),
  };
}

/** A copy-beside-media band, or nothing when its heading is empty. */
function splitOf(
  row: WixDataItem,
  prefix: "applications" | "identity",
  alt: string,
  frame: MediaFrame,
): MediaSplit | undefined {
  const heading = wixLines(row[`${prefix}Heading`]);
  const paragraphs = wixParagraphs(row[`${prefix}Body`]);
  const media = mediaOf(row[`${prefix}Image`], row[`${prefix}Video`], alt, frame);
  // The heading is what makes this band; without media it would be a column of copy beside a
  // hole, and without copy a picture with no reason to be there.
  if (heading.length === 0 || paragraphs.length === 0 || !media) return undefined;
  return { heading, paragraphs, media };
}

/**
 * The chart's bars, one per line, written `Brand Strategy | 100`.
 *
 * Split at the **last** pipe, so a label may contain one; the value is the numeric tail. A
 * line that doesn't parse is dropped rather than drawn at zero, because a zero-height bar
 * under a label reads as a measurement rather than as a typo.
 */
function barsOf(value: unknown) {
  return wixLines(value).flatMap((line) => {
    const at = line.lastIndexOf("|");
    if (at < 0) return [];
    const label = line.slice(0, at).trim();
    const height = Number(line.slice(at + 1).trim());
    if (!label || !Number.isFinite(height)) return [];
    // A share of the track, so anything outside 0–100 is a slip rather than a taller bar.
    return [{ label, value: Math.min(100, Math.max(0, height)) }];
  });
}

/** The token a credits row puts where a name would go when the partner is a mark. */
const CREDITS_LOGO = "@logo";

type CreditLogo = { src: string; alt: string; aspect: number };
type CreditRow = { role: string; name?: string; logo?: CreditLogo };

/**
 * The credits rows, one per line, written `Role | Name`.
 *
 * Three shapes, all of them in the reference: a role with a name, a role with the partner's
 * mark (`@logo`, which is the one place this file asks the client to write a token — there is
 * one logo per study and the alternative was a whole collection for three lines), and a role
 * with no attribution at all, which is what the Auto Maxx comp shows for two of its three.
 */
function creditsOf(value: unknown, logo?: CreditLogo): CreditRow[] {
  return wixLines(value).flatMap<CreditRow>((line) => {
    const at = line.lastIndexOf("|");
    const role = (at < 0 ? line : line.slice(0, at)).trim();
    if (!role) return [];
    const name = at < 0 ? "" : line.slice(at + 1).trim();
    if (name === CREDITS_LOGO) return logo ? [{ role, logo }] : [{ role }];
    return [name ? { role, name } : { role }];
  });
}

/**
 * The deliverables table, assembled from one collection row per paragraph or card.
 *
 * Rows sharing a `group` become one term, in first-appearance order, and a row with a `title`
 * is a card while a row without one is prose. Grouping is by label across the whole study
 * rather than only over neighbours, so two runs of the same term merge instead of producing
 * two rows with the same heading — which `./Deliverables` keys by.
 */
function deliverablesOf(rows: WixDataItem[]) {
  type Row = {
    label: string;
    paragraphs?: string[];
    cards?: { title: string; paragraphs: string[] }[];
  };
  const byLabel = new Map<string, Row>();

  for (const raw of rows) {
    const label = wixText(raw.group);
    const title = wixText(raw.title);
    const paragraphs = wixParagraphs(raw.body);
    // A term with neither a card title nor a word under it is an empty line in the table.
    if (!label || (!title && paragraphs.length === 0)) continue;

    let row = byLabel.get(label);
    if (!row) {
      row = { label };
      byLabel.set(label, row);
    }
    if (title) (row.cards ??= []).push({ title, paragraphs });
    else (row.paragraphs ??= []).push(...paragraphs);
  }

  return [...byLabel.values()];
}

/** A Media Manager file name, as a last-resort description. `strugbits.png` → `strugbits`. */
const nameOf = (image: WixImage) =>
  image.name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

/* ── the record ──────────────────────────────────────────────────────────── */

function normalise(row: WixDataItem, deliverableRows: WixDataItem[]): CaseStudy | null {
  const slug = wixText(row._id);
  const title = wixText(row.title);
  const client = wixLines(row.heroClient);
  const headline = wixLines(row.heroHeadline);
  // A study is a name, a masthead and somebody's words. Short of those there is no page to
  // draw, and half of one is worse than the 404 the route falls back to.
  if (!slug || !title || client.length === 0 || headline.length === 0) return null;

  // The hero's field, and the two colour decisions that follow from it — see ./field. The
  // column takes a hex code now as well as one of the five names, so neither of those can be
  // read off a name any more.
  const field = fieldFor(wixText(row.tone));
  const testimonialPhoto = parseWixImage(row.testimonialImage);
  const testimonialText = wixParagraphs(row.testimonialText);
  if (!testimonialPhoto || testimonialText.length === 0) return null;

  const outcomeHeading = wixText(row.outcomeHeading);
  const outcomeImage = parseWixImage(row.outcomeImage);
  const quoteText = wixText(row.quoteText);
  const glanceTitle = wixText(row.glanceTitle);
  const glanceItems = barsOf(row.glanceBars);
  const creditsTitle = wixText(row.creditsTitle);
  const creditsLogoImage = parseWixImage(row.creditsLogo);
  const creditsRows = creditsOf(
    row.credits,
    creditsLogoImage
      ? {
          src: wixOriginalUrl(creditsLogoImage),
          alt: nameOf(creditsLogoImage),
          aspect: creditsLogoImage.width / creditsLogoImage.height || 2,
        }
      : undefined,
  );
  const deliverableTable = deliverablesOf(deliverableRows);
  const deliverablesTitle = wixText(row.deliverablesTitle);

  const maxVh =
    typeof row.testimonialMaxVh === "number" && row.testimonialMaxVh > 0
      ? row.testimonialMaxVh
      : undefined;

  return {
    slug,
    title,
    summary: wixText(row.summary),

    masthead: {
      tone: field.band,
      headlineClassName: field.headlineClassName,
      markColor: field.markColor,
      date: wixText(row.heroDate),
      client,
      headline,
      media: mediaOf(
        row.heroImage,
        row.heroVideo,
        `A walkthrough of the ${title} website`,
        HERO_FRAME,
      ),
      columns: [wixParagraphs(row.introLeft), wixParagraphs(row.introRight)].filter(
        (column) => column.length > 0,
      ),
    },

    ...(quoteText
      ? {
          quote: {
            text: quoteText,
            // Only an explicit `false` turns the marks off, so a row nobody has touched
            // reads as somebody speaking — which is what the composition is for.
            marks: row.quoteMarks !== false,
            columns: [wixParagraphs(row.quoteLeft), wixParagraphs(row.quoteRight)].filter(
              (column) => column.length > 0,
            ),
          },
        }
      : {}),

    testimonial: {
      // Every study multiplies now. The `screen` path is still in ./Testimonial for the
      // measurements behind it, and nothing reaches it.
      blend: "multiply",
      ...(wixText(row.testimonialTint) === "crushed" ? { tint: CARD_TINT_CRUSHED } : {}),
      aspect: frameRatio(testimonialPhoto.width, testimonialPhoto.height, CARD_FRAME),
      ...(maxVh === undefined ? {} : { maxVh }),
      photo: {
        src: wixOriginalUrl(testimonialPhoto),
        // Empty on purpose: the picture is a tint under the quote and says nothing the
        // quote doesn't. See the head of this file.
        alt: "",
        focus: "50% 50%",
      },
      paragraphs: testimonialText,
      name: wixText(row.testimonialName),
      role: wixText(row.testimonialRole),
    },

    ...(outcomeHeading
      ? {
          outcome: {
            heading: outcomeHeading,
            paragraphs: wixParagraphs(row.outcomeBody),
            ...(outcomeImage
              ? {
                  media: {
                    src: wixOriginalUrl(outcomeImage),
                    alt: `${title} — the work as delivered`,
                    aspect: frameRatio(
                      outcomeImage.width,
                      outcomeImage.height,
                      OUTCOME_FRAME,
                    ),
                    focus: "50% 50%",
                  },
                }
              : {}),
            ...(wixParagraphs(row.outcomeCaption).length > 0
              ? { caption: wixParagraphs(row.outcomeCaption) }
              : {}),
          },
        }
      : {}),

    ...(glanceTitle && glanceItems.length > 0
      ? { glance: { title: glanceTitle, items: glanceItems } }
      : {}),

    ...(() => {
      const applications = splitOf(
        row,
        "applications",
        `${title} — the identity in use`,
        APPLY_FRAME,
      );
      return applications ? { applications } : {};
    })(),

    ...(() => {
      // The identity band's media keeps the band's own measured frame rather than the
      // asset's, and it is the one slot that does — see IDENTITY_MEDIA_ASPECT. Its clip is a
      // portrait slice of a repeating grid, so the crop *is* the composition.
      const identity = splitOf(
        row,
        "identity",
        `${title} — the visual system`,
        IDENTITY_FRAME,
      );
      return identity ? { identity } : {};
    })(),

    ...(deliverablesTitle && deliverableTable.length > 0
      ? { deliverables: { title: deliverablesTitle, rows: deliverableTable } }
      : {}),

    ...(creditsTitle && creditsRows.length > 0
      ? { credits: { title: creditsTitle, rows: creditsRows } }
      : {}),
  };
}

/* ── the two reads ───────────────────────────────────────────────────────── */

/**
 * One study, or `null` when the CMS has no usable row for that slug.
 *
 * Two queries rather than one, because the deliverables are their own collection — filtered
 * to this study and sorted by the client's own `order`, so the table reads down the page in
 * the order the CMS shows it in.
 */
export async function caseStudyFromWix(slug: string): Promise<CaseStudy | null> {
  const [pages, deliverables] = await Promise.all([
    wixQuery(CASE_STUDY_PAGES_COLLECTION, { filter: { _id: slug }, limit: 1 }),
    wixQuery(CASE_STUDY_DELIVERABLES_COLLECTION, {
      filter: { study: slug },
      sortField: "order",
    }),
  ]);

  const row = pages?.[0];
  if (!row) return null;
  return normalise(row, deliverables ?? []);
}

/**
 * Every slug the CMS has a study for, for `generateStaticParams`.
 *
 * Returns what it finds and nothing on failure — the route unions this with `STUDY_SLUGS`, so
 * an unreachable CMS at build time still leaves the three existing studies in the manifest.
 */
export async function caseStudySlugsFromWix(): Promise<string[]> {
  const rows = await wixQuery(CASE_STUDY_PAGES_COLLECTION, { sortField: "order" });
  return (rows ?? []).map((row) => wixText(row._id)).filter(Boolean);
}
