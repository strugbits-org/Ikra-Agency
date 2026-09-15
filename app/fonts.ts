import localFont from "next/font/local";
import { Playfair_Display } from "next/font/google";

/**
 * The display italic behind the founders section's pull quotes, and the *only* thing on the
 * site that reads it — see `about/metrics`' QUOTE for how the face was identified off the
 * reference recording, and `--font-display` in globals.css for the token.
 *
 * Two settings here are deliberate and are both about the mistake the last Playfair in this
 * file made, which was being loaded everywhere and rendered nowhere:
 *
 *   `preload: false`  — no `<link rel=preload>` on any route. The section this serves is one
 *                       band a long way down one page, so preloading it would compete with
 *                       the hero's own work for the first screen's bandwidth on every route.
 *   italic 400 only   — the only cut the section sets. The full family is four weights in two
 *                       styles; asking for the rest would be eight files nothing renders.
 *
 * The variable is applied on `AboutSection`'s own element rather than in the root layout, so
 * the stylesheet carrying it belongs to the route that uses it.
 */
export const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400"],
  variable: "--font-playfair",
  display: "swap",
  preload: false,
});

export const zalando = localFont({
  src: [
    {
      path: "../public/fonts/ZalandoSansSemiExpanded-VariableFont_wght.ttf",
      style: "normal",
      weight: "200 900",
    },
    {
      path: "../public/fonts/ZalandoSansSemiExpanded-Italic-VariableFont_wght.ttf",
      style: "italic",
      weight: "200 900",
    },
  ],
  variable: "--font-zalando",
  display: "swap",
});
