/**
 * A case study, as typed data — the one file to edit for copy and imagery.
 *
 * The page in `components/study` renders this shape and knows nothing else about any
 * particular client: a second case study is another record here plus a route that passes it
 * to `<CaseStudyPage>`. Nothing in the layout counts paragraphs or looks for a client name,
 * so the two cannot drift.
 *
 * ## The schema is the reference page and nothing more
 *
 * Four bands, in this order: a masthead over the client's facts, a pull quote over two
 * columns of narrative, a testimonial on a tinted photograph, and the outcome beside a
 * mockup of the delivered site. There is no services list, no metric row, no gallery and no
 * next/previous pager — an earlier draft of this file carried a `stats` array and it was an
 * invention, so it is gone rather than hidden.
 *
 * ## The imagery is placeholder, and knowingly so
 *
 * `public/img` holds one photograph shot for this study (`Coffee-Shop-Vibes.avif`), which the
 * testimonial band uses and the outcome band's mockup borrows. The masthead's own mockup was
 * drawn (`SitePreview`) for the same reason — no capture of the homepage existed — until a
 * real video walkthrough arrived; see `masthead.media` and `CAFE_HERO_ASPECT`. The outcome
 * band still draws its own, since that capture hasn't arrived.
 */

import {
  CAFE_HERO_ASPECT,
  CARD_TINT_CRUSHED,
  CARD_MAX_VH,
  CRM_HERO_ASPECT,
  QCIF_HERO_ASPECT,
} from "./metrics";
import type { CardTint } from "./metrics";
import type { Tone } from "./primitives";

/**
 * Which bands a study has, and the order they appear in.
 *
 * The two studies are not the same page with different words: Cafe Technica runs nine bands
 * and QCIF six, and the ones they share are not in the same order — QCIF puts the chart third
 * and its lead statement fourth, where Cafe Technica opens with the pull quote. So the order
 * is data rather than a fixed sequence in `CaseStudyPage`, and the difference between the two
 * pages is one legible array per record instead of a spread of conditionals.
 *
 * A key whose data is absent renders nothing, and says so in development.
 */
export type BandKey =
  | "masthead"
  | "brand"
  | "glance"
  | "quote"
  | "testimonial"
  | "outcome"
  | "applications"
  | "identity"
  | "deliverables"
  | "credits";

/**
 * One band of copy beside one piece of media — the shape the last two bands share.
 *
 * `heading` takes an array when the reference breaks its display line somewhere its own
 * measure would not; a plain string lets it wrap.
 */
export type MediaSplit = {
  heading: string | readonly string[];
  paragraphs: readonly string[];
  photo: {
    src: string;
    alt: string;
    focus?: string;
    /** Renders `src` as a looping, muted `<video>` instead of an `<Image>` — see masthead.media. */
    video?: boolean;
  };
  /**
   * `cover` — the default — fills the frame, which is what a photograph wants. `contain`
   * is for artwork with its own edges: QCIF's band puts a logo here, and a logo cropped to
   * fill a frame is a logo with its ends cut off.
   */
  fit?: "cover" | "contain";
  /**
   * The frame's ratio, when the study supplies a capture rather than the photograph the band
   * was measured against. Defaults to the band's own figure in ./metrics — see
   * `APPLY_PHOTO_ASPECT` and `IDENTITY_MEDIA_ASPECT`, both transcribed off the reference.
   *
   * Stated as the asset's `width / height`, so `object-cover` has nothing to crop. A
   * screenshot is the case that needs it: cropping a photograph to a measured frame is a
   * composition choice, cropping an interface is a bug.
   */
  aspect?: number;
};

export type CaseStudy = {
  /** The route segment, and the key `CASE_PROJECTS` links against. */
  slug: string;
  /** Sentence-case, for `<title>`. The masthead sets the client line in caps of its own. */
  title: string;
  /** One sentence, for the route's meta description. */
  summary: string;

  /** The bands this study has, in order. See BandKey. */
  bands: readonly BandKey[];

  masthead: {
    /** The field the band sits on. `dark` unless the client brings its own — QCIF does. */
    tone?: Tone;
    /** Set as written — the reference shows a month and a year, in caps. */
    date: string;
    /** The client block: name, sector, place. Three lines in the reference. */
    client: readonly string[];
    /**
     * The line beside the site mockup, set large in the serif and in the brand accent.
     *
     * One entry per line: the reference breaks after the first sentence, and letting it
     * wrap on its own measure would put the break in the middle of the second one.
     */
    headline: readonly string[];
    /**
     * What the headline is set in. The accent is the Cafe Technica reference's; on QCIF's
     * navy it would be an orange line on a blue field with no other orange anywhere near it,
     * so that study takes the band's own ink instead.
     */
    headlineClassName?: string;
    /**
     * A supplied image or video in place of the drawn site mockup.
     *
     * `SitePreview` exists because there was no capture of the Cafe Technica homepage and a
     * stock photograph in a browser frame reads as a stock photograph in a browser frame.
     * QCIF supplied a real capture — first a screenshot, now a video walkthrough, both
     * already carrying their own chrome/framing — so it is placed as-is, with nothing drawn
     * over it. `aspect` is the asset's own, so the frame never crops it; `video` switches the
     * element from `<Image>` to `<video>` without touching anything else here.
     */
    media?: {
      src: string;
      alt: string;
      aspect: number;
      focus?: string;
      /** Renders `src` as a looping, muted `<video>` instead of an `<Image>`. */
      video?: boolean;
    };
    /** The two narrative columns beside the client block. */
    columns: readonly (readonly string[])[];
  };

  /** The serif pull quote and the two columns of narrative under it. */
  quote?: {
    text: string;
    columns: readonly (readonly string[])[];
    /** The field. `paper` unless the study puts this band somewhere else. */
    tone?: Tone;
    /**
     * Whether to hang the quotation marks. Default true.
     *
     * QCIF uses the same composition — a display line over two unequal columns — for a lead
     * statement that quotes nobody. Marks on it would attribute the studio's own summary of
     * the client's services to the client.
     */
    marks?: boolean;
  };

  /** The client's words, over a photograph the band tints with its own field colour. */
  testimonial: {
    photo: { src: string; alt: string; focus?: string };
    /**
     * Which way the photograph tints the field. See ./Testimonial, which carries the
     * contrast arithmetic — the short version is that `screen` only ever lightens, and
     * white type on a lightened ember field is not legible where the photograph is bright.
     */
    blend?: "screen" | "multiply";
    /**
     * How the photograph is mapped before it multiplies over the field. Defaults to
     * `CARD_TINT`.
     *
     * It is per-study because the transfer maps a *nominal* range and the two studies'
     * photographs use very different parts of it — see `CARD_TINT_CRUSHED`. Ignored on the
     * `screen` path, which relies on the blacks this would lift.
     */
    tint?: CardTint;
    /**
     * The card's shape. Defaults to `CARD_ASPECT`, the 1045 x 824 measured off the Cafe
     * Technica capture.
     *
     * That figure belongs to a card holding two long paragraphs. A study with one short
     * quote gets the same tall box with the difference as dead space, so a study may state
     * its own — QCIF's is its photograph's, which is what its comp shows.
     */
    aspect?: number;
    /**
     * A ceiling on the card's height, in vh. Absent means none. See `CARD_MAX_VH` for why
     * this is opt-in rather than global.
     */
    maxVh?: number;
    paragraphs: readonly string[];
    name: string;
    role: string;
  };

  /** What was shipped, beside a mockup of it. */
  outcome?: {
    heading: string;
    paragraphs: readonly string[];
    /**
     * A supplied capture in place of the drawn mockup — the same story as `masthead.media`,
     * and the same reason: `SitePreview` exists for a client with no screenshot of what was
     * shipped, and drawing one over a client who supplied theirs invents an interface.
     *
     * A supplied capture also takes the whole half-column rather than the mockup's 39.9%
     * inset, which is what the comp for it shows.
     */
    media?: { src: string; alt: string; aspect: number; focus?: string };
    /** A line under the media. Only read when there is media to put it under. */
    caption?: readonly string[];
  };

  /**
   * The same deliverables as the table below, read as a skyline: one labelled column each,
   * growing out of the floor as the band arrives.
   *
   * `value` is a share of the track in percent, and it is decorative — the reference gives no
   * axis, no legend and no unit, so these are a designed profile rather than a measurement of
   * anything. The ten below are transcribed from it; see `components/growth/metrics.ts` for
   * how they were recovered. The shape is stated here rather than imported from
   * `components/growth` so this file stays free of component dependencies, the same way
   * `MediaSplit` above is declared locally.
   */
  glance?: {
    title: string;
    items: readonly { label: string; value: number }[];
  };

  /**
   * The new brand beside the mark itself: copy left, logo right, on the study's dark field.
   * QCIF's second band.
   */
  brand?: MediaSplit;

  /**
   * Where the identity ended up in the world, beside a photograph of it. Copy on the left.
   */
  applications?: MediaSplit;

  /**
   * The visual system — palette, typeface, imagery — beside a grid of it in use. Copy on the
   * right; the media here stands in for a video, which is why it is one asset and not four.
   */
  identity?: MediaSplit;


  /**
   * The deliverables table: a column of terms against a column of what each one meant.
   *
   * A row carries either prose or a grid of cards, never both — the reference gives the
   * website row a grid because it is six deliverables under one term, and the other three a
   * paragraph each.
   */
  deliverables?: {
    title: string;
    rows: readonly {
      label: string;
      paragraphs?: readonly string[];
      cards?: readonly { title: string; paragraphs: readonly string[] }[];
    }[];
  };

  /** Who did what. Two columns, set at the page's small size. */
  credits?: {
    title: string;
    rows: readonly {
      role: string;
      /** The attribution, as type. Omitted on a row whose partner is a mark, or on none. */
      name?: string;
      /**
       * A partner's logo in place of that line. `aspect` is the asset's own `width / height`,
       * which is what gives the box its height — see `CREDITS_LOGO_WIDTH`.
       */
      logo?: { src: string; alt: string; aspect: number };
    }[];
  };

  /**
   * The site rendered inside both browser mockups. Copy rather than a screenshot, so the
   * frame stays sharp at any width and the words stay editable — swap `hero` to
   * `{ kind: "image", ... }` above once a real capture exists.
   */
  preview?: {
    brand: string;
    headline: readonly string[];
    address: readonly string[];
    phone: string;
    caption: string;
    tag: string;
    cta: string;
    photo: { src: string; alt: string; focus?: string };
  };
};

export const CAFE_TECHNICA: CaseStudy = {
  slug: "cafe-technica",
  title: "Café Technica",
  summary:
    "Naming, brand and a new website for the coffee-machine service business Tasmania calls first.",

  // Unchanged from before `bands` existed — this is the order CaseStudyPage used to hard-code.
  bands: [
    "masthead",
    "quote",
    "testimonial",
    "outcome",
    "glance",
    "applications",
    "identity",
    "deliverables",
    "credits",
  ],

  masthead: {
    date: "MAY 2026",
    client: ["CAFE TECHNICA", "COFFEE EQUIPMENT SERVICES", "TASMANIA, AUSTRALIA"],
    headline: [
      "They bring coffee machines back to life.",
      "We did the same for their brand.",
    ],
    media: {
      src: "https://video.wixstatic.com/video/f415e2_81d9014a017b460094db1910806fe86a/720p/mp4/file.mp4",
      alt: "A walkthrough of the Café Technica website",
      aspect: CAFE_HERO_ASPECT,
      video: true,
    },
    columns: [
      [
        "Café Technica sell, service and rent coffee machines across Tasmania, supply spare parts and give quality second-hand machines another working life.",
        "They know their industry inside out. They also understood that their website no longer reflected the business they had built. So they came to us for a new one.",
      ],
      [
        "There was just one problem: we couldn’t responsibly build a new website that took them forward, based on a brand (and strategy) that were already underperforming.",
      ],
    ],
  },

  quote: {
    text:
      "We always pick up the phone, even on weekend of Christmas Eve. We understand that for a cafe owner with a broken coffee machine at 6am we can be a lifeline.",
    columns: [
      [
        "Once we started digging into the reality of their customers’ lives, it became obvious that Café Technica treat every service call as an emergency. Just like 000 they turn up, triage and fix things. To a tight-knit community of coffee lovers they can be a lifeline.",
        "We wanted to position them as the emergency service of the coffee industry. That is how we arrived at Esprescue™: a punchy combination of two words that captures the role Café Technica already plays for its customers.",
        "It is short, memorable, cheeky and unmistakably connected to the business. Most importantly, it is an ownable word rather than another generic coffee-industry phrase. It has everything we look for in a strong name.",
      ],
      [
        "We believed Esprescue™ was strong enough to become the company name and recommended exploring a complete rename. Café Technica considered the idea but made the strategic decision to retain its established name. We fully understand it is a next level commitment. We encouraged the client to move forward with trademark registration.",
        "It now works as Café Technica’s brand promise, its central campaign message and a memorable shorthand for the care and urgency behind its service.",
      ],
    ],
  },

  testimonial: {
    // `multiply`, like QCIF's. The reference capture for this band is a `screen` blend and
    // this record followed it, faithfully and unreadably: screen can only lighten, and this
    // photograph is a sunlit shopfront, so the copy sat on a background measured at 1.04:1
    // — white type on white. Multiply inverts the guarantee, making the flat ember the
    // *lightest* the card can get. See the head of ./Testimonial.
    blend: "multiply",
    // ...but not QCIF's transfer. This photograph's shadows are already crushed — nearly half
    // the card lands on the floor of the default band — so they need lifting rather than
    // scaling, which is a gamma. See CARD_TINT_CRUSHED for the measurement and the bound.
    tint: CARD_TINT_CRUSHED,
    photo: {
      src: "/img/Coffee-Shop-Vibes.avif",
      alt: "Café Technica’s customers on a Hobart street",
      focus: "50% 50%",
    },
    paragraphs: [
      "We wanted to take a moment to say thank you. Trusting you with our website was one thing, but extending that trust to our brand name and creative direction as well was a bigger decision and it's paid off. Your expertise and guidance made all the difference.",
      "Looking back, we're genuinely glad we chose to put our creativity in your hands rather than leaning on AI tools. It confirmed what we suspected: there's no substitute for a real creative partner who understands the brand and brings their own judgment to it.",
    ],
    name: "Luba Lynch",
    role: "Café Technica, COO",
  },

  outcome: {
    heading:
      "With the brand in place, we could build the website the client had originally asked for, only now it had a clear idea behind it.",
    paragraphs: [
      "Designed and developed in Wix Studio, the new site brings machine sales, servicing, rentals, spare parts and second-hand equipment into one confident digital home.",
      "It also works hard behind the scenes, combining an online store, CRM and automation to reduce repetitive management for the team.",
      "Custom scroll interactions translate Café Technica’s identity into motion, creating a polished digital experience uncommon in the industry. The movement strengthens brand recognition, reinforces the company’s position as a forward-thinking industry leader and guides visitors towards key services and calls to action—all without compromising usability or performance.",
    ],
  },

  glance: {
    title: "Project Deliverables at a Glance",
    items: [
      { label: "Brand Strategy", value: 100 },
      { label: "Brand Narratives", value: 100 },
      { label: "Naming & IP", value: 85 },
      { label: "Brand Identity", value: 100 },
      { label: "Content Strategy", value: 100 },
      { label: "UX/UI", value: 100 },
      { label: "Custom Development", value: 80 },
      { label: "Animation", value: 64 },
      { label: "Accessibility", value: 100 },
      { label: "SEO", value: 35 },
    ],
  },

  applications: {
    heading:
      "We extended the new identity across a range of practical brand applications, including team uniforms and vehicle wraps.",
    paragraphs: [
      "When the first vehicle-wrap concept produced by an external supplier didn’t reflect the new identity, Café Technica recognised the disconnect and brought us back in.",
      "Vehicle branding is often underestimated. A service vehicle is a moving billboard that can carry the brand into almost any street, neighbourhood or business district—without the ongoing cost of traditional advertising. That visibility deserves proper creative thinking. An effective wrap isn’t a logo repeated across a vehicle; it is a considered composition of colour, typography, messaging and the actual vehicle form.",
      "Working with Untold, we translated the Café Technica identity properly across the fleet and developed other practical brand applications, including team uniforms.",
      "Now, the vehicles don’t simply carry the Café Technica name—they get noticed, attract attention and make the business recognisable wherever the team goes.",
    ],
    photo: {
      src: "/img/cafe-car.avif",
      alt: "A Café Technica service van in the new Esprescue™ wrap",
      focus: "50% 50%",
    },
  },

  identity: {
    heading: [
      "As one influential creative director put it:",
      "“In the beginning was the Word.”",
      "The design came afterwards.",
    ],
    paragraphs: [
      "Esprescue™ led the visual identity, starting with bright orange as the primary colour—urgent, energetic and impossible to miss. Espresso brought in deep coffee brown, while warm taupe, cream and touches of yellow gave the palette balance and freshness.",
      "To express Café Technica’s technical expertise, we chose monospaced typography. Few typographic styles feel more technical: every character occupies equal space, recalling diagnostic screens, machinery labels, service manuals and functional documentation.",
      "That precision is balanced by retro-inspired coffee imagery. The result doesn’t feel like a cold engineering company or a generic lifestyle coffee brand. It is technical, yet human and full of character.",
    ],
    photo: {
      src: "https://video.wixstatic.com/video/f415e2_3e4af18e47ef4df9884f3507e3de455c/720p/mp4/file.mp4",
      alt: "The Café Technica identity in use — uniform, brandbook, typography and tote",
      video: true,
    },
  },

  deliverables: {
    title: "SUMMARY OF DELIVERABLES",
    rows: [
      {
        label: "Brand Strategy",
        paragraphs: [
          "Researching the existing brand and business model, then working with Café Technica to clarify and agree on its future commercial direction. This exploration revealed that the business needed more than a new website—it needed a clear brand strategy and a narrative aligned with where it was going.",
        ],
      },
      {
        label: "Naming and Copywriting",
        paragraphs: [
          "Creating the new brand word, memorable and ownable by Café Technica",
          "— Esprescue™",
        ],
      },
      {
        label: "Brand Identity & Applications",
        paragraphs: [
          "New logo and Visual Strategy. Developing a cohesive suite of brand applications, including vehicle wraps, uniforms, merchandise, social-media assets and digital touchpoints—ensuring Café Technica remained recognisable and consistent wherever the brand appeared.",
        ],
      },
      {
        label: "Website Design and Development",
        cards: [
          {
            title: "Wix Store",
            paragraphs: [
              "A clearly organised online store that makes it easy to browse coffee machines, spare parts and other products by category and brand.",
              "Built using native Wix Stores functionality, it gives the Café Technica team a straightforward way to update products, prices, stock and content as part of their daily operations—without relying on a developer.",
            ],
          },
          {
            title: "Content Strategy",
            paragraphs: [
              "Café Technica offers nine services across its domestic and commercial divisions.",
              "We developed a clear content structure that gives visitors a quick overview of the complete offering without overwhelming them, then guides each customer towards the service that best matches their needs.",
            ],
          },
          {
            title: "Brand-Led Copywriting",
            paragraphs: [
              "Website copy written in Café Technica’s confident, warm and technically precise voice—bringing the Esprescue™ promise into every part of the customer journey.",
            ],
          },
          {
            title: "Custom Service Request and Payment System",
            paragraphs: [
              "A tailored submission process that guides customers through service options, helping each audience quickly find the right path. The system works with applicable conditions and upfront payment when the service is out of warranty.",
            ],
          },
          {
            title: "Bespoke Scrolling Experience",
            paragraphs: [
              "Custom scroll interactions translate Café Technica’s identity into motion, creating a polished digital experience uncommon in the industry. The movement strengthens brand recognition, reinforces the company’s position as a forward-thinking industry leader and guides visitors towards key services and calls to action—all without compromising usability or performance.",
            ],
          },
          {
            title: "Connected Business Systems",
            paragraphs: [
              "Connecting the website with Café Technica’s wider software ecosystem, including technician scheduling and spare-parts inventory. Bringing these tools together reduces duplicated administration, keeps information moving between systems and gives the team a more efficient way to manage daily operations.",
            ],
          },
        ],
      },
    ],
  },

  credits: {
    title: "CREDITS",
    rows: [
      {
        role: "Brand Strategy, Creative Direction, Naming, Visual Identity, Copywriting, Website Design & Development",
        name: "Olya Black®",
      },
      { role: "Vehicle Branding & Wrap Design", name: "Untold®" },
      {
        role: "Systems Integration & Custom Development",
        name: "CODENAME™",
      },
    ],
  },

  preview: {
    brand: "CAFÉ TECHNICA",
    headline: ["Esprescue™", "Parts \\ Services"],
    address: ["Based in Hobart.", "Unit 4 , 6 Kyeema place,", "Cambridge. TAS. 7170"],
    phone: "0466 080 667",
    caption:
      "We save machines, mornings, and grey hairs. Just like 000 we turn up, triage and fix things (if possible). To a tight-knit community of coffee lovers we can be a lifeline.",
    tag: "Esprescue™",
    cta: "Any Questions?",
    photo: {
      src: "/img/Coffee-Shop-Vibes.avif",
      alt: "The Café Technica website",
      focus: "50% 50%",
    },
  },
};

/**
 * The second study, and the one that turned `bands` from a fixed sequence into data.
 *
 * Six bands against Cafe Technica's nine, in a different order, on a different field. What
 * they share is every component and every measured figure — see BandKey above, and the head
 * of ./CaseStudyPage for why the difference is expressed as a list rather than as guards.
 *
 * Three assets came with it. The masthead's hero was a screenshot at first and is now a
 * supplied video walkthrough of the delivered site — see `masthead.media` and `video`; the
 * aspect box existed for exactly this swap, so it cost one flag and one constant
 * (`QCIF_HERO_ASPECT`, now the clip's own 1080 x 1350). `qcif-logo.png` is the client's mark,
 * cropped to its alpha for the reason `BRAND_MARK_ASPECT` records, and still stands in for a
 * video of its own that hasn't arrived yet.
 */
export const QCIF: CaseStudy = {
  slug: "qcif",
  title: "QCIF",
  summary:
    "A brand, a sub-brand system and a website that let Queensland’s digital research partner restructure how it works.",

  bands: ["masthead", "brand", "glance", "quote", "testimonial", "deliverables"],

  masthead: {
    // The client's own navy, sampled off the screenshot they supplied — see --color-navy.
    tone: "navy",
    // On navy the accent would be the only orange within three bands of itself; the field's
    // own ink is what the comp sets this in.
    headlineClassName: "",
    date: "SEPTEMBER 2025",
    client: ["QCIF", "NOT FOR PROFIT", "DIGITAL RESEARCH PARTNERS"],
    // One entry, so it wraps on its own measure. Cafe Technica's is broken by hand because
    // its two sentences would otherwise break mid-clause; this is one sentence and has no
    // such seam to protect.
    headline: [
      "How a hyper-intelligent team made a quantum-leap in branding and used their website to restructure workflow.",
    ],
    media: {
      src: "https://video.wixstatic.com/video/f415e2_cd72b016cd814670ad6ba7dc07493a99/720p/mp4/file.mp4",
      alt: "A walkthrough of the QCIF website",
      aspect: QCIF_HERO_ASPECT,
      video: true,
    },
    columns: [
      [
        "In every challenge lies an opportunity. When we first met QCIF they were moving from beneath a university umbrella structure and into an independent tour-de-force. The future was bright, and so were the team. QCIF (pronounced Q-SYF) are experts in digital research. Covering a wide spread of expertise, and also having the deepest levels of experience available.",
        "What struck us immediately is that despite the humbling number of PhDs, they were one of the friendliest and most modest teams we have ever met.",
      ],
      [
        "The brief was for a fresh website that reflected the organisation changes, but after a fluid discussion it was clear that the opportunities were greater, and so were the challenges.",
      ],
    ],
  },

  brand: {
    // One entry, so it wraps on its own measure. The comp breaks it after "as it" at 1920,
    // but that is where *that* width runs out — hard-coded here it strands "it" alone on a
    // second line by 1440 and the third line is the rest of the sentence.
    heading: [
      "The new brand reflects QCIF’s renewed clarity as it steps forward into the next chapter.",
    ],
    paragraphs: [
      "QCIF are at the technological bleeding edge and their branding needed to reflect that status. Branding in the technology space is particularly difficult as it is a saturated industry sector, and there’s a real risk of looking too similar to another brand.",
      "Their story needs to reflect the power of 3 sector services, making the uber-complexity simple (and all in a digital first age). The icon is deceptively simple, an isometric arrangement, evocative of computer iconography, that tricks the eye into seeing a cube.",
      "All the typography is custom drawn type, designed to work digitally, retain legibility, and convey a sense of order and confidence. Within the visual identity, the icon is transformed into 3 dimensions, and colour coded for their 3 sector services. In short, its simplified and smart, just like their offering. This visual brand narrative adds to the brand story, without creating weight or noise.",
    ],
    // `contain`, because this is a mark and not a photograph — cropping it to fill the frame
    // would cut its own edges off. See BRAND_MARK_ASPECT.
    fit: "contain",
    photo: {
      src: "/img/qcif-logo.png",
      alt: "The QCIF Digital Research³ wordmark and icon",
    },
  },

  glance: {
    title: "Project Deliverables at a Glance",
    items: [
      { label: "Brand Research & Discovery", value: 100 },
      { label: "Brand Strategy", value: 88 },
      { label: "Brand Narratives", value: 74 },
      { label: "Naming & IP", value: 100 },
      { label: "Sub-Brand System", value: 100 },
      { label: "Brand Identity", value: 100 },
      { label: "Content Strategy", value: 80 },
      { label: "UX/UI", value: 100 },
      { label: "Custom Development", value: 92 },
      { label: "SEO", value: 40 },
    ],
  },

  quote: {
    // The lead statement, in the pull quote's composition but with nothing in quotation
    // marks — this is the studio describing the client, not the client speaking.
    marks: false,
    text:
      "QCIF offer a multitude of digital research services (including quantum computing, research skills/training and bioinformatics). They also service 3 core industry verticals (academia, government & industry) with relevant bespoke solutions.",
    columns: [
      [
        "QCIF realised that their brand strategy and 4 brand narratives required specific expertise to distil and simplify. We brought in the leading industry experts in brand strategy (Untold®) to run a BRAD® process, ensuring we were starting with the best possible insights from the beginning. Untold® challenged the team to re-think and reposition for the next stage of brand growth, and identified areas of risk and opportunity commercially, and within existing intellectual property.",
      ],
      [
        "With new insights we were able to begin rebuilding the brand for the future. It was important to capitalise on the opportunities afforded by the organisational change. It was clear that QCIF could streamline and consolidate many systems into the new website platform. In doing so, not only could reduce overheads, make software redundancies, and improve transparency — we could also create a responsive and editable capability framework that evolved with the team.",
      ],
    ],
  },

  testimonial: {
    // `multiply`, not the reference's `screen`. The screen blend can only lighten, and white
    // type on a lightened ember field is not legible where the photograph is bright — this
    // photograph's highlights reach 241 of 255. See the head of ./Testimonial for the
    // arithmetic; the short version is that multiply holds the card at 5:1 or better.
    blend: "multiply",
    // The photograph's own 869 x 580, not Cafe Technica's measured 1045 x 824. That figure
    // is the shape of a card holding two long paragraphs; this quote is four lines, so the
    // taller box would be dead space under the attribution. The comp agrees — its card
    // measures 868 x 577, i.e. this ratio at CARD_MAX_VH.
    aspect: 869 / 580,
    maxVh: CARD_MAX_VH,
    photo: {
      src: "/img/qcif-girl.avif",
      alt: "A student at dusk on a city street",
      focus: "50% 45%",
    },
    paragraphs: [
      "A lot of websites can be really overwhelming and overcrowded for me and a lot of other ND people to read. This one is incredible, easy to read, and has such an awesome interface!",
    ],
    name: "Thalia Greinke",
    role: "PhD Student & Tutor at the ANU",
  },

  deliverables: {
    title: "SUMMARY OF DELIVERABLES",
    rows: [
      {
        label: "Brand Research & Discovery (BRAD®) Process",
        paragraphs: [
          "Research and exploration of the existing brand system. Establishing and agreeing on the future commercial strategy. Reviewing existing brand narratives and identifying the need for a new brand strategy, and aligned brand narratives.",
        ],
      },
      {
        label: "Naming and Copywriting",
        paragraphs: [
          "Coining a registrable term for QCIF’s function, in a manner that ties to a system of 3s. E.g.: academia, government & industry / discovery, innovation, impact etc. and that ties to the visual brand narrative of our new pseudo-cube brand icon.",
          "— Digital Research³",
        ],
      },
      {
        label: "Sub Brand Management",
        paragraphs: [
          "Consolidating all 9 sub brands into a functioning and simplified visual system with accessible colour standards",
        ],
      },
      {
        label: "Website Custom Features",
        cards: [
          {
            title: "Dynamic skills matrix",
            paragraphs: [
              "Scalable and editable with constant changes. QCIF became the first in the industry to offer this feature. Users can filter experts by area of expertise, experience and skill level",
            ],
          },
          {
            title: "Advanced CMS for scalable content",
            paragraphs: [
              "A custom-built content system enables seamless updates across the entire website, ensuring consistency while allowing the team to easily manage and expand content over time.",
            ],
          },
          {
            title: "Multi-layered structure for complex information",
            paragraphs: [
              "The website clearly separates key sectors — government, academia, and science — while using smart filtering and cross-referencing to connect projects, people, and capabilities, making complex information easy to explore.",
            ],
          },
          {
            title: "Automated ticketing and routing system",
            paragraphs: [
              "All incoming requests are automatically categorised by domain and integrated into the client’s internal system, streamlining distribution, reducing manual handling, and ensuring enquiries reach the right teams instantly.",
            ],
          },
        ],
      },
    ],
  },
};

/**
 * The third study, and the first that is only partly written.
 *
 * `bands` is three long — masthead, pull quote, testimonial — because that is what the comp
 * covers. The rest of the record is genuinely absent rather than filled with plausible copy:
 * the band table renders what the list asks for and nothing else, so the page ends at the
 * testimonial and picking up where the comp leaves off is adding keys to that array.
 *
 * It is the closest of the three to Cafe Technica — the same dark masthead with an accent
 * serif headline, the same ember testimonial over the same photograph and the same crushed
 * transfer, since it is the same crushed-shadow source.
 *
 * Two transcription notes. The comp's client block still reads "CAFE TECHNICA / COFFEE
 * EQUIPMENT SERVICES / TASMANIA, AUSTRALIA", which is the artwork it was built over showing
 * through rather than this client's details; the copy beside it names Auto Maxx Pensacola, a
 * pre-owned dealership, so that is what the block says here. And the attribution under the
 * quote is a placeholder in the comp ("Name of client:"), kept verbatim rather than invented
 * — a name is the one thing on this page that cannot be guessed at.
 */
export const AUTO_MAXX: CaseStudy = {
  slug: "auto-maxx",
  title: "Auto Maxx Pensacola",
  summary:
    "A custom AI-powered CRM and calling system that chases every enquiry so a dealership’s sales team doesn’t have to.",

  bands: [
    "masthead",
    "quote",
    "testimonial",
    "outcome",
    "glance",
    "applications",
    "identity",
    "deliverables",
    "credits",
  ],

  masthead: {
    date: "MAY 2026",
    client: ["AUTO MAXX PENSACOLA", "PRE-OWNED VEHICLE DEALERSHIP", "PENSACOLA, FLORIDA"],
    headline: [
      "Let AI handle the enquiries while you",
      "focus on closing deals.",
    ],
    media: {
      src: "/img/WowImage.png",
      alt: "The Auto Maxx CRM, open on a lead’s conversation and call history",
      aspect: CRM_HERO_ASPECT,
      focus: "50% 50%",
    },
    columns: [
      [
        "Auto Maxx Pensacola is an automotive dealership selling pre-owned vehicles across a wide range of categories, from cars and SUVs to trucks and luxury vehicles.",
        "Alongside vehicle sales, the dealership also supports customers through financing and other parts of the buying process.",
      ],
      [
        "The real challenge? Every new enquiry triggered another wave of calls, messages, emails, follow-ups, and appointments. As leads grew, so did the pressure, making it harder to respond fast, retain context, and keep opportunities moving. Auto Maxx did not need more people to manage the process, it needed a system that could.",
      ],
    ],
  },

  quote: {
    text:
      "We went beyond the traditional CRM to design an all in one AI-powered system built for their sales process.",
    columns: [
      [
        "We saw the problem clearly: every new enquiry meant more calls to make, messages to send, follow-ups to chase, and appointments to manage. As opportunities grew, so did the time spent keeping up with them.",
        "So we built a custom AI-powered CRM and calling system that does the chasing for them. Calls, SMS, emails, follow-ups, appointments, AI agents, IVR, and workflows now run through one intelligent system built around Auto Maxx’s sales process.",
      ],
      [
        "Instead of the team constantly checking who needs a call, who needs a follow-up, or which appointment is next, the system keeps each opportunity moving automatically. Every lead has a clear next step, while the team has the visibility to step in when their attention matters most.",
        "The goal was never to automate the sales team out of the process. It was to remove the repetitive work around them. Less time spent managing leads. Less chasing. Less manual coordination. More time spent talking to customers, building relationships, and closing deals. The system works in the background while the sales team focuses on the front line.",
      ],
    ],
  },

  testimonial: {
    // Cafe Technica's treatment exactly, because it is Cafe Technica's photograph: multiply
    // so the flat ember is the lightest the card can get, and the crushed transfer because
    // this source's shadows need lifting rather than scaling. See ./Testimonial.
    blend: "multiply",
    tint: CARD_TINT_CRUSHED,
    photo: {
      src: "/img/Coffee-Shop-Vibes.avif",
      alt: "A dealership forecourt at dusk",
      focus: "50% 50%",
    },
    paragraphs: [
      "“We want to thank you for everything you have done for us. Your solution has made our processes more efficient and saved us valuable time, allowing us to focus on what truly needs our attention. What impressed us most was how thoughtfully you approached the project. You did not just build a CRM or AI calling system. You understood our challenges, guided us through the process, and created a seamless system that has made our day-to-day work much easier. We are genuinely happy with the results and truly appreciate the expertise, commitment, and ease you brought to the project”",
    ],
    name: "Name of client:",
    role: "Designation at Auto Maxx.",
  },

  outcome: {
    heading:
      "We connected their entire sales process into one intelligent system, making the business easier to run",
    paragraphs: [
      "The solution brought lead management, communication, follow-ups, and appointment bookings into one structured, automated workflow. From the moment an enquiry came in, the system knew what needed to happen next.",
      "Every opportunity was brought into one AI-powered workflow, giving the team a simpler way to manage leads from beginning to the end. We turned a time consuming follow-up process into an organised, configurable workflow that keeps leads moving without constant manual effort.",
      "With the system handling configured follow ups and keeping every opportunity visible, the team spends less time chasing updates, remembering the next action, or switching between platforms. They now have more clarity across the pipeline and more time to focus on the conversations that actually drive sales.",
    ],
    // The same capture as the masthead's — it is the thing that was shipped, and there is
    // one screenshot of it. Placed bare for the same reason: it carries its own chrome.
    media: {
      src: "/img/WowImage.png",
      alt: "The Auto Maxx CRM, open on a lead’s conversation and call history",
      aspect: CRM_HERO_ASPECT,
      focus: "50% 50%",
    },
    caption: [
      "The result was a simpler, more responsive, and scalable way of working. The business no longer had to work harder as it grew. The system did more of the work for them.",
    ],
  },

  // The same skyline the other two studies use, so this is the record and nothing else.
  // The values are the comp's own bar heights against its tallest, which is a designed
  // profile rather than a measurement of anything — see the note on `glance` above.
  glance: {
    title: "Project Deliverables",
    items: [
      { label: "AI-Powered CRM", value: 100 },
      { label: "AI Calling System", value: 100 },
      { label: "Lead Management", value: 85 },
      { label: "AI Follow-Up Automation", value: 100 },
      { label: "SMS & Email Automation", value: 100 },
      { label: "AI Agents & Responders", value: 100 },
      { label: "IVR Configuration", value: 81 },
      { label: "Appointment & Calendar Management", value: 66 },
      { label: "Lead Pipeline", value: 100 },
      { label: "Dealership & User Management", value: 20 },
    ],
  },

  // Both captures are the client's own screens, so both frames take the asset's ratio rather
  // than the reference photograph's — see `aspect` on MediaSplit.
  applications: {
    heading:
      "We built the system around what happens after the enquiry, not just where the lead comes from.",
    paragraphs: [
      "A lead is only valuable if something happens next. For Auto Maxx, that meant making sure every enquiry could move through the right sequence without depending on someone remembering the next call, message, follow-up, or appointment.",
      "We connected the different parts of that journey into one system. New enquiries enter the CRM, communication can be triggered through configured workflows, follow-ups can happen automatically, and appointments stay connected to the same customer journey. The important part was not simply adding more automation. It was creating a system that understands the sales process well enough to know what needs to happen next and keeps the opportunity moving.",
      "That gives the Auto Maxx team something a traditional collection of tools could not: a connected view of the entire journey, from the first enquiry to the conversations that can turn an opportunity into a sale.",
    ],
    aspect: 836 / 711,
    photo: {
      src: "/img/WowImage2.png",
      alt: "The CRM’s settings, showing the configured AI conversation triggers",
    },
  },

  identity: {
    // One entry, so it wraps on its own measure — the comp breaks it after "sales", which
    // is where that width runs out rather than where the sentence wants a seam.
    heading: [
      "The AI handles the repetition. The sales team stays with the customers.",
    ],
    paragraphs: [
      "AI works best when it takes care of the work that does not need a salesperson. For Auto Maxx, that meant handling configured calls, responses, follow-ups, reminders, and communication while keeping the team in control of the moments that require a human conversation.",
      "AI agents, responders, IVR, SMS, email, and calling workflows were brought together as part of the same sales infrastructure. Instead of treating each interaction as a separate task, the system gives every lead a connected path forward.",
      "The result is not automation for its own sake. It is a sales process designed to let technology carry the repetitive load while the people behind Auto Maxx focus on customers, conversations, and closing deals.",
    ],
    aspect: 836 / 679,
    photo: {
      src: "/img/Container.png",
      alt: "The CRM’s SMS templates, with an AI-drafted message ready to send",
    },
  },

  // One term with a grid of cards under it, which is the shape the other two studies give
  // their website row — here it is the whole table, because the comp has one term.
  deliverables: {
    title: "SUMMARY OF DELIVERABLES",
    rows: [
      {
        label: "Website Design and Development",
        cards: [
          {
            title: "AI-Powered CRM & Lead Management",
            paragraphs: [
              "A custom CRM that brings Auto Maxx’s leads, customer information, communication history, and sales pipeline into one connected system, giving the team a clearer view of every opportunity.",
            ],
          },
          {
            title: "AI Calling & Communication",
            paragraphs: [
              "An integrated AI calling system connecting calls, SMS, and email, allowing Auto Maxx to manage customer conversations and follow-ups through a single workflow.",
            ],
          },
          {
            title: "Automated Follow-Up",
            paragraphs: [
              "AI-powered triggers, responders, and scheduled follow-ups that keep leads engaged without requiring the team to manually coordinate every interaction.",
            ],
          },
          {
            title: "AI Agents & Call Management",
            paragraphs: [
              "Configurable AI agents, responders, call workflows, and IVR controls built around Auto Maxx’s operating process, giving the team greater control over automated customer interactions.",
            ],
          },
          {
            title: "Appointments & Sales Pipeline",
            paragraphs: [
              "Calendar and appointment management connected to the lead pipeline, keeping customer activity, appointments, and next steps organized within the same system.",
            ],
          },
          {
            title: "Dealership & User Management",
            paragraphs: [
              "Administrative controls for dealership operations, users, business hours, AI settings, and communication preferences, giving Auto Maxx the flexibility to manage the platform day to day.",
            ],
          },
          {
            title: "Connected Sales Infrastructure",
            paragraphs: [
              "A unified system that brings CRM, AI calling, communication, lead management, and follow-up into one environment, reducing manual coordination and creating a more efficient process for managing leads.",
            ],
          },
        ],
      },
    ],
  },

  credits: {
    title: "CREDITS",
    rows: [
      {
        role: "Brand Strategy, Creative Direction, Naming, Visual Identity, Copywriting, Website Design & Development",
        // The comp attributes this row with a mark rather than a name, and leaves the other
        // two unattributed — transcribed as it stands.
        logo: {
          src: "/img/strugbits.png",
          alt: "Strugbits",
          aspect: 387 / 173,
        },
      },
      { role: "Vehicle Branding & Wrap Design" },
      { role: "Systems Integration & Custom Development" },
    ],
  },
};
