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
 * testimonial band uses and the two site mockups borrow. The masthead has no photograph at
 * all — the space beside its mockup is a line of copy, not a frame.
 */

/**
 * One band of copy beside one piece of media — the shape the last two bands share.
 *
 * `heading` takes an array when the reference breaks its display line somewhere its own
 * measure would not; a plain string lets it wrap.
 */
export type MediaSplit = {
  heading: string | readonly string[];
  paragraphs: readonly string[];
  photo: { src: string; alt: string; focus?: string };
};

export type CaseStudy = {
  /** The route segment, and the key `CASE_PROJECTS` links against. */
  slug: string;
  /** Sentence-case, for `<title>`. The masthead sets the client line in caps of its own. */
  title: string;
  /** One sentence, for the route's meta description. */
  summary: string;

  masthead: {
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
    /** The two narrative columns beside the client block. */
    columns: readonly (readonly string[])[];
  };

  /** The serif pull quote and the two columns of narrative under it. */
  quote: {
    text: string;
    columns: readonly (readonly string[])[];
  };

  /** The client's words, over a photograph the band tints with its own field colour. */
  testimonial: {
    photo: { src: string; alt: string; focus?: string };
    paragraphs: readonly string[];
    name: string;
    role: string;
  };

  /** What was shipped, beside a mockup of it. */
  outcome: {
    heading: string;
    paragraphs: readonly string[];
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
  glance: {
    title: string;
    items: readonly { label: string; value: number }[];
  };

  /**
   * Where the identity ended up in the world, beside a photograph of it. Copy on the left.
   */
  applications: MediaSplit;

  /**
   * The visual system — palette, typeface, imagery — beside a grid of it in use. Copy on the
   * right; the media here stands in for a video, which is why it is one asset and not four.
   */
  identity: MediaSplit;


  /**
   * The deliverables table: a column of terms against a column of what each one meant.
   *
   * A row carries either prose or a grid of cards, never both — the reference gives the
   * website row a grid because it is six deliverables under one term, and the other three a
   * paragraph each.
   */
  deliverables: {
    title: string;
    rows: readonly {
      label: string;
      paragraphs?: readonly string[];
      cards?: readonly { title: string; paragraphs: readonly string[] }[];
    }[];
  };

  /** Who did what. Two columns, set at the page's small size. */
  credits: {
    title: string;
    rows: readonly { role: string; name: string }[];
  };

  /**
   * The site rendered inside both browser mockups. Copy rather than a screenshot, so the
   * frame stays sharp at any width and the words stay editable — swap `hero` to
   * `{ kind: "image", ... }` above once a real capture exists.
   */
  preview: {
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

  masthead: {
    date: "MAY 2026",
    client: ["CAFE TECHNICA", "COFFEE EQUIPMENT SERVICES", "TASMANIA, AUSTRALIA"],
    headline: [
      "They bring coffee machines back to life.",
      "We did the same for their brand.",
    ],
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
      src: "/img/cafe-gallery.avif",
      alt: "The Café Technica identity in use — uniform, brandbook, typography and tote",
      focus: "50% 50%",
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
