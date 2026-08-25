import localFont from "next/font/local";
import { Playfair_Display } from "next/font/google";

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

/**
 * The editorial serif the case-study pages set their display copy in.
 *
 * Not used anywhere on the home page — the marketing site is Zalando throughout — so it is
 * only ever downloaded by a route that actually renders a `<Display>`; `next/font/google`
 * self-hosts it at build time, so this costs no runtime request either way.
 *
 * Playfair Display is a **stand-in**, chosen by matching the reference capture rather than
 * from a spec: single-storey `g`, crossed `W` apex, straight `y` tail, high x-height and
 * hairline serifs all agree, and the fitted size is the same. If the real licensed face
 * turns up later, swapping it is this declaration plus nothing else — every call site reads the
 * `--font-serif` theme token, which globals.css maps onto whatever is declared here.
 */
export const playfair = Playfair_Display({
  subsets: ["latin"],
  // No `weight` and no `style`: Playfair Display is a variable font on Google Fonts, so the
  // default pulls the whole `wght` axis in one file. Naming a range here is what Turbopack
  // rejects — it wants discrete weights or the word `variable`, and the default is already
  // that. The page only ever sets 400, but the axis costs nothing extra to have.
  variable: "--font-playfair",
  display: "swap",
});
