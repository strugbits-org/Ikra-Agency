/**
 * The site's one Wix client: an anonymous visitor token, and the two reads built on it.
 *
 * **Why a visitor token and not a key.** `WIX_OAUTH_CLIENT_ID` is not itself a bearer
 * credential — it only proves a request is coming from this site's headless app, and it is
 * already scoped to one site because it was created inside that site's own Headless Settings,
 * which is why no site ID or client secret appears anywhere here. It is traded for a
 * short-lived token carrying exactly the identity an anonymous visitor on the Wix site would
 * have. So everything this module can read is already public, and the collections it reads
 * have to be set to `read: ANYONE` in the CMS or the query comes back empty rather than
 * failing — see FOUNDERS_COLLECTION.
 *
 * **Raw REST rather than `@wix/sdk`**, which is in `package.json` and unused. The site's one
 * other Wix call — `app/api/waitlist/route.ts` — is two `fetch`es against the same two
 * endpoints, and a second style for one POST would cost more in unfamiliarity than the SDK
 * saves; the token exchange below is the only thing it would have done for us. If the SDK is
 * ever adopted, it should take that route with it rather than sit beside it.
 *
 * Nothing here is a secret, so there is no `server-only` guard: a headless client ID is
 * designed to be used from browsers. What keeps this on the server is that `process.env`
 * reads it and only server components import it, which is also what lets the token cache
 * below be module scope rather than per visitor.
 */

const TOKEN_URL = "https://www.wixapis.com/oauth2/token";
const QUERY_URL = "https://www.wixapis.com/wix-data/v2/items/query";

/**
 * The collection behind the founders section. Created through the Data Collections API rather
 * than by hand so the schema is written down somewhere — `read: ANYONE`, everything else
 * `ADMIN`.
 */
export const FOUNDERS_COLLECTION = "Founders";

/**
 * The collection behind the approach section's three points. Same shape of thing as
 * FOUNDERS_COLLECTION and created the same way — `read: ANYONE`, everything else `ADMIN`.
 */
export const APPROACH_COLLECTION = "Approach";

/**
 * How long a page holds its copy of the CMS before asking again.
 *
 * **A minute, and the argument for it is that both alternatives were worse.** This started at
 * an hour, on the reasoning that a founders' section is not a feed — true about how often the
 * copy changes, and wrong about the only moment anyone looks at it, which is the client
 * reloading straight after an edit to check their own wording.
 *
 * The textbook answer to that is on-demand revalidation — tag the fetch, and have Wix call a
 * route handler that drops the tag. It was built and then removed, because driving it from Wix
 * costs **three automations per collection** (created, updated, deleted, each naming exactly one
 * collection): six to set up and keep in step today, three more for every collection added
 * later, and a shared secret to carry through every environment. That is a standing maintenance
 * cost, paid by whoever inherits this, to save fifty-nine seconds.
 *
 * So the poll is the update path and there is nothing to wire up. The cost is one Wix round trip
 * per minute **per page somebody actually asks for** — Next only refetches on a request that
 * finds the cache stale, so a quiet site makes none at all, and a busy one makes sixty an hour
 * against a rate limit measured in hundreds per minute. If this ever needs to be instant, the
 * shape of the answer is `next: { tags }` here plus a route handler calling `revalidateTag(tag,
 * { expire: 0 })` — the arithmetic above is what to re-check first, not the code.
 */
export const WIX_REVALIDATE_SECONDS = 60;

/**
 * The token is cached in module scope, not fetched per request, and the margin is what makes
 * that safe: a token handed out with one second left on it would be spent by the time the
 * query using it lands. Wix returns `expires_in` in seconds.
 *
 * This is deliberately not a `Promise` cache — two concurrent cold renders each doing a token
 * exchange is a wasted request, not a bug, and the alternative keeps a rejected promise alive
 * for every later caller.
 */
const EXPIRY_MARGIN_MS = 60_000;
let cached: { token: string; expiresAt: number } | null = null;

/**
 * How long Next's own data cache may hold the token *response*, which is a separate question
 * from the module cache above and is the one that decides whether a page using this can be
 * prerendered at all.
 *
 * It cannot be `cache: "no-store"`, which is the obvious thing to write for a credential and
 * is wrong here: a single uncached fetch opts the whole route segment out of static
 * rendering, and `/playground` went dynamic for exactly this reason before this constant
 * existed. Half an hour against a token Wix issues with four hours on it leaves three and a
 * half hours of life on the stalest one this can serve, and the margin above covers the rest.
 * TOKEN_LIFE_FLOOR asserts that relation rather than trusting it.
 */
const TOKEN_CACHE_SECONDS = 1800;
const TOKEN_LIFE_FLOOR = TOKEN_CACHE_SECONDS * 4;

export async function wixVisitorToken(): Promise<string> {
  const clientId = process.env.WIX_OAUTH_CLIENT_ID;
  if (!clientId) throw new Error("[wix] WIX_OAUTH_CLIENT_ID is not set");

  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, grantType: "anonymous" }),
    next: { revalidate: TOKEN_CACHE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`[wix] token exchange failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as { access_token: string; expires_in?: number };

  if (process.env.NODE_ENV !== "production" && body.expires_in) {
    if (body.expires_in < TOKEN_LIFE_FLOOR) {
      console.error(
        `[wix] the visitor token now lives ${body.expires_in}s, but its response is cached ` +
        `for ${TOKEN_CACHE_SECONDS}s — the stalest one this can serve would have ` +
        `${body.expires_in - TOKEN_CACHE_SECONDS}s left. Lower TOKEN_CACHE_SECONDS.`,
      );
    }
  }

  cached = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 14400) * 1000 - EXPIRY_MARGIN_MS,
  };
  return cached.token;
}

export type WixDataItem = Record<string, unknown>;

/**
 * A CMS TEXT field as a trimmed string, or `""` for anything that is not one.
 *
 * Here rather than in a section's own content module because a CMS row is not typed and every
 * section reading one has the same problem: a field can be absent, `null`, or a number because
 * somebody typed a year into a text box. One coercion, used at every boundary.
 */
export const wixText = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * A CMS TEXT field split into paragraphs on blank lines, with single newlines inside a
 * paragraph treated as wrapping rather than as breaks.
 *
 * **Blank-line separation is this site's CMS authoring convention, not one section's**, which
 * is why it lives here and is named in the `displayName` of every field that uses it
 * ("Body (blank line between paragraphs)"). The alternative at the time was a rich-text field,
 * which arrives as Wix's own Ricos JSON and would need a renderer for markup none of these
 * sections use, or a repeater, which makes one block several rows to edit. A blank line is what
 * the person typing it will type anyway.
 */
export const wixParagraphs = (v: unknown) =>
  wixText(v)
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.replace(/\s*\r?\n\s*/g, " ").trim())
    .filter(Boolean);

/**
 * One page of a collection, sorted. Returns the `data` objects rather than the envelope,
 * because nothing here wants the envelope.
 *
 * Callers get `null` on any failure rather than an exception, and that is the whole
 * availability story for this site: a section built on the CMS falls back to nothing on the
 * page instead of taking the route down with it (see `foundersFromWix`).
 */
export async function wixQuery(
  dataCollectionId: string,
  { sortField, limit = 50 }: { sortField?: string; limit?: number } = {},
): Promise<WixDataItem[] | null> {
  try {
    const token = await wixVisitorToken();
    const res = await fetch(QUERY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify({
        dataCollectionId,
        query: {
          ...(sortField ? { sort: [{ fieldName: sortField, order: "ASC" }] } : {}),
          paging: { limit },
        },
      }),
      next: { revalidate: WIX_REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      console.error(`[wix] query ${dataCollectionId} failed`, res.status, await res.text());
      return null;
    }
    const body = (await res.json()) as { dataItems?: { data?: WixDataItem }[] };
    return (body.dataItems ?? []).map((i) => i.data ?? {});
  } catch (err) {
    console.error(`[wix] query ${dataCollectionId} threw`, err);
    return null;
  }
}

/**
 * A Media Manager image, as the CMS stores it and as the browser needs it.
 *
 * An IMAGE field comes back as a `wix:image://v1/<fileId>/<display name>#originWidth=…` URI,
 * which is a Wix-internal address and not something a browser can load. The file ID inside it
 * is the path segment on `static.wixstatic.com`, and the rest of the path is Wix's own image
 * service: `/v1/fill/w_…,h_…,al_c,q_…,enc_auto/<name>` returns that file resized and
 * re-encoded on their CDN.
 *
 * **Sizing happens there rather than through `next/image`**, and that is a choice worth
 * stating: the founders' photographs are 2MB PNGs a third of a screen wide, so they have to
 * be resized by *somebody*, and doing it at the CDN keeps the origin out of the path
 * entirely — no `remotePatterns`, no optimiser round trip on a cold cache, and a URL whose
 * dimensions are legible at the call site. The cost is that the `srcset` is hand-built rather
 * than generated, which is `wixSrcSet` below and is four lines.
 */
export type WixImage = { fileId: string; name: string; width: number; height: number };

export function parseWixImage(value: unknown): WixImage | null {
  if (typeof value !== "string" || !value.startsWith("wix:image://")) return null;
  // wix:image://v1/<fileId>/<name>#originWidth=<w>&originHeight=<h>
  const [path, hash = ""] = value.slice("wix:image://".length).split("#");
  const parts = path.split("/");
  if (parts.length < 3) return null;
  const params = new URLSearchParams(hash);
  return {
    fileId: parts[1],
    name: parts.slice(2).join("/"),
    width: Number(params.get("originWidth")) || 0,
    height: Number(params.get("originHeight")) || 0,
  };
}

/** One CDN URL, filled to a box. `fill` crops to the box rather than letterboxing it. */
export function wixImageUrl(img: WixImage, w: number, h: number, quality = 85) {
  const box = `w_${Math.round(w)},h_${Math.round(h)},al_c,q_${quality},enc_auto`;
  return `https://static.wixstatic.com/media/${img.fileId}/v1/fill/${box}/${encodeURIComponent(img.name)}`;
}

/**
 * 1× and 2× of the same box. Two entries and not a ladder because every place this is used
 * renders at a size the layout already knows — there is no `sizes` guesswork to cover, only
 * pixel density.
 */
export function wixSrcSet(img: WixImage, w: number, h: number) {
  return `${wixImageUrl(img, w, h)} 1x, ${wixImageUrl(img, w * 2, h * 2)} 2x`;
}
