import { TONES, type Field, type Tone } from "./primitives";

/**
 * The masthead's field, resolved from the one value the client types into the CMS.
 *
 * **A hex code cannot simply replace the word, and that is the whole of this file.** The
 * `Tone` enumeration in ./primitives is not a list of backgrounds — each entry *pairs* a
 * ground with the ink that is legible on it, and `accentFor` read a second decision off the
 * same name. A free colour has nobody to make either call, so both are derived here: give the
 * client a colour picker without this and the first pale field they choose renders white type
 * on it.
 *
 * ## What is derived, and from what
 *
 * **The ink** is white or black by the field's WCAG relative luminance — pure black and pure
 * white, which is what the named table already uses rather than `--color-ink`. The two are
 * equal at a luminance of 0.179, so that is where it flips. It reproduces four of the five
 * named pairings exactly; `ember` is the deliberate exception and is reached by its name, not
 * by this (see below).
 *
 * **Whether the headline takes the accent** was `tone === "navy" || tone === "ember"`, i.e.
 * "is this field *coloured*" — the accent on a coloured ground is either the only orange
 * within three bands of itself or a second orange. That generalises as two tests, and both
 * are needed: the field must be near-neutral in chroma, *and* the accent must clear 3:1
 * against it, which is the WCAG minimum for large text and the headline is 37px. Chroma alone
 * would hand a mid-grey field (`#808080`, where the accent measures **1.27:1**) an invisible
 * orange headline, and contrast alone would keep the accent on navy, which measures a
 * perfectly legible 4.20:1 and is exactly the field the rule exists to strip it from.
 *
 * **What the wordmark is drawn in** is a lower bar on purpose. It is a 104px graphic rather
 * than type, so what matters is that it is distinguishable, not that it is readable at 3:1 —
 * and the case worth preventing is a client picking their own orange, where the accent's
 * contrast against the ground collapses toward 1. The accent measures **1.24:1** on ember and
 * **2.91:1** on paper, so the floor sits between them with room on both sides.
 *
 * ## The five names still work, and they are not resolved through any of this
 *
 * The client's rows already say `navy` and `dark`, so a hex-only reader would turn the QCIF
 * study black until somebody re-typed its field. More than compatibility, though, the named
 * entries carry two hand-made decisions this arithmetic would overturn: `ember`'s ink is
 * white where black measures higher (3.85:1 against 5.45:1) because the field is the brand's,
 * and the mark is the accent on every named field because that pairing was checked by eye
 * against the reference. So a name is looked up, a hex is derived, and **anything else is
 * `dark`** — which is the same fallback the column had when it only ever took words.
 *
 * One consequence to know: `#f7f7f7` typed as a hex drops the accent where the named `paper`
 * — the same colour — keeps it, because accent-on-paper measures **2.91:1** and fails the 3:1
 * it is held to. The derived side is the correct one; the named side is the reference's own
 * setting, preserved for fidelity on a field no study currently uses. Pure white keeps the
 * accent either way, at 3.12:1.
 */

/**
 * The brand accent as a number, and the one place in this repo a token is restated.
 *
 * `app/globals.css` owns it — that is the copy the page paints with, and the case-study
 * palette's own docblock is emphatic that these values live in CSS. This decision is made on
 * the server while assembling a record, where there is no document to read a computed style
 * from, so the arithmetic needs the value in hand. Nothing renders from it.
 */
const ACCENT = "#fa5e3c";

/** How the accent is written when it is used, i.e. the token rather than this file's copy. */
const ACCENT_TOKEN = "var(--color-accent)";

/** Pure, as in the named table: the reference sets black and white here, not `--color-ink`. */
const INK_LIGHT = "#ffffff";
const INK_DARK = "#000000";

/** Chroma above this and the field counts as *coloured*. Navy measures 0.29, ember 0.72. */
const NEUTRAL_MAX = 0.12;

/** The accent's floor against the field: WCAG large text for the 37px headline… */
const HEADLINE_MIN_CONTRAST = 3;

/** …and a lower one for the wordmark, which is a graphic. See the head of this file. */
const MARK_MIN_CONTRAST = 1.8;

type Rgb = [number, number, number];

/**
 * A hex code as three channels, or `null` for anything that is not one.
 *
 * Forgiving about the form and strict about the content: `#` optional, either case, and the
 * 3- and 4-digit shorthands expanded. An alpha channel is accepted and **discarded** — a
 * band has to be opaque or the page's cream ground shows through it — because a colour
 * picker that hands back eight digits is a likelier input than a client who means 50%.
 *
 * Nothing the client typed is returned: the background is rebuilt from the parsed channels,
 * so only six hex digits of our own making ever reach a `style`.
 */
function parseHex(text: string): Rgb | null {
  const digits = text.trim().replace(/^#/, "");
  if (!/^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(digits)) return null;
  const full = digits.length <= 4 ? digits.replace(/./g, (d) => d + d) : digits;
  return [0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16)) as Rgb;
}

const hexOf = ([r, g, b]: Rgb) =>
  `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;

/** sRGB → linear, per WCAG 2.x. */
const linear = (value: number) => {
  const channel = value / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
};

const luminanceOf = ([r, g, b]: Rgb) =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);

const contrastBetween = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Colourfulness, as the spread between the strongest and weakest channel. */
const chromaOf = ([r, g, b]: Rgb) =>
  (Math.max(r, g, b) - Math.min(r, g, b)) / 255;

const ACCENT_LUMINANCE = luminanceOf(parseHex(ACCENT) as Rgb);

/**
 * Everything the masthead reads off its field: the ground, and the two colour decisions the
 * named tones used to carry in their names.
 */
export type ResolvedField = {
  /** What `Band` paints — a named tone, or a ground with its derived ink. */
  band: Tone | Field;
  /** The headline's class: the accent, or nothing, which inherits the band's ink. */
  headlineClassName: string;
  /** What the wordmark is drawn in. `currentColor` inherits the band's ink. */
  markColor: string;
};

const isTone = (value: string): value is Tone =>
  (TONES as readonly string[]).includes(value);

/** Resolves the CMS column: a tone's name, a hex code, or `dark` for anything else. */
export function fieldFor(text: string): ResolvedField {
  const named = text.trim().toLowerCase();
  if (isTone(named)) {
    return {
      band: named,
      // Preserved exactly as the enumeration had it: the coloured fields are the client's
      // own ground or this site's, and an accent line on either is an orange with nothing
      // else orange near it, or two oranges.
      headlineClassName: named === "navy" || named === "ember" ? "" : "text-accent",
      markColor: ACCENT_TOKEN,
    };
  }

  const rgb = parseHex(text);
  if (!rgb) return fieldFor("dark");

  const luminance = luminanceOf(rgb);
  const accentContrast = contrastBetween(luminance, ACCENT_LUMINANCE);
  const neutral = chromaOf(rgb) <= NEUTRAL_MAX;

  return {
    band: {
      background: hexOf(rgb),
      // Whichever of the two reads better on it. White's luminance is 1 and black's is 0 by
      // definition, and the two contrasts are equal at a field luminance of 0.179.
      ink:
        contrastBetween(luminance, 1) >= contrastBetween(luminance, 0)
          ? INK_LIGHT
          : INK_DARK,
    },
    headlineClassName:
      neutral && accentContrast >= HEADLINE_MIN_CONTRAST ? "text-accent" : "",
    markColor:
      accentContrast >= MARK_MIN_CONTRAST ? ACCENT_TOKEN : "currentColor",
  };
}
