/**
 * The case studies, as typed data — the one file to edit for content.
 *
 * Deliberately the whole of the section's copy and imagery: the track is one cell per
 * project plus the heading and the closing panel, and the pin's length is that track's
 * measured overflow (see ./sequence), so adding or removing an entry retimes the section and
 * needs no other change. Nothing else in ./cases knows how many there are.
 *
 * ## The schema is the reference's caption, and nothing more
 *
 * Frame analysis of the reference shows a caption of exactly three parts under each image —
 * a title, a two-line description, and a right-aligned link. There is no category line, no
 * tag row and no per-project accent colour; earlier versions of this file carried all three
 * and they were inventions. They are gone rather than hidden.
 *
 * ## Both entries are real, and the stand-ins are gone
 *
 * Café Technica and QCIF each point at a full page built from that client's own material —
 * `app/work/cafe-technica` and `app/work/qcif`. The two caviar stand-ins that used to sit
 * under them have been removed rather than left unlinked: an unclickable card next to two
 * clickable ones reads as a broken link, and naming clients this studio may not have is a
 * claim rather than a layout.
 *
 * **Two cells is now the count, and the section retimes itself for it.** The track's length,
 * the pin's length and every cell's entrance are all derived from this array — see
 * `./sequence` — so adding a third study is one more entry here and nothing else. The
 * reference recording happens to show three, which is why `TRACK_TAIL_VW` and the pace knob
 * were tuned against that count; at two the traverse is simply shorter, and the dev
 * assertions in `./timeline` are written in vw rather than in cells so they still hold.
 */
export type CaseProject = {
  id: string;
  /** The display title, set immediately under the image. */
  title: string;
  /** Two lines under the title. The reference wraps at two; three would push the rule down. */
  description: string;
  imageSrc: string;
  /**
   * `null` until there is somewhere to go. The link renders as a `<span>` while it is null
   * and as an `<a>` once it is a path — an `href="#"` is worse for a keyboard or a screen
   * reader than no link at all, and a link to a route that 404s is worse still.
   */
  link: string | null;
  /** `object-position` — these are crops of frames that were not shot for this. */
  focus: string;
  /**
   * The frame's own ratio, when the artwork must not be cropped. Defaults to the reference's
   * measured `IMAGE_ASPECT` of 1.45, which is what a photograph takes: a crop of a street is
   * still a street, and holding one ratio across the row is the reference's own choice.
   *
   * A screen capture is the exception, twice over. Both site captures are wider than 1.45
   * (1.653 and 1.687), so covering scales them to the frame's height and takes ~12% off their
   * sides — on an interface that is the CRM's right-hand panel and the edge of the QCIF page
   * simply missing, and `focus` cannot re-frame it because the subject is the whole screen.
   * And `object-contain` inside a 1.45 box is no answer either: it shows the capture whole but
   * stands it on a slab of `bg-ink/5` that reads as a grey mat around the picture. Giving the
   * frame the asset's own ratio is the one arrangement with neither a crop nor a mat — the
   * image *is* the frame. The cost is that a wider card is shorter, so its caption sits a
   * little higher than its neighbour's; the width cap in ./CaseLayers is unaffected, being
   * derived from the tallest ratio.
   */
  aspect?: number;
};

export const CASE_PROJECTS: CaseProject[] = [
  {
    id: "cafe-technica",
    title: "Café Technica",
    description:
      "Naming, brand and a new website for the coffee-machine service Tasmania calls first.",
    imageSrc: "/img/Coffee-Shop-Vibes.avif",
    link: "/work/cafe-technica",
    focus: "50% 45%",
  },
  {
    id: "qcif",
    title: "QCIF",
    description:
      "A brand, a sub-brand system and a website that let Queensland’s digital research partner restructure how it works.",
    // The delivered site itself. It is the only QCIF asset that is *about the work* rather
    // than about the client's people, which is what a case-study card should show. Flattened
    // to drop its alpha channel — a handful of corner pixels from the mockup's own rounded
    // chrome were transparent, which under `object-cover` would show the frame's bg-ink/5
    // through as a faint grey nick at each corner. 1325 x 800.
    imageSrc: "/img/qcif-hero-2.png",
    // A capture: the frame takes its ratio so nothing is cropped and no mat shows.
    aspect: 1325 / 800,
    link: "/work/qcif",
    focus: "50% 50%",
  },
  {
    id: "auto-maxx",
    title: "Auto Maxx Pensacola",
    description:
      "A custom AI-powered CRM and calling system that chases every enquiry for a dealership’s sales team.",
    // The product itself, which is what the study is about — this client's work has no
    // photography and a stock forecourt would be a picture of a car dealership rather than
    // a picture of the job. The capture is 835px wide, so it upscales past ~1900; a wider
    // one is the only thing that would improve this card.
    imageSrc: "/img/WowImage.png",
    // A capture: the frame takes its ratio so nothing is cropped and no mat shows.
    // Matches the current file's own dimensions (794 x 490) — the previous 835/495
    // was measured off an earlier crop of this same screenshot that had a grey mat
    // baked in around the browser mockup; the file has since been replaced with a
    // tighter crop, so this ratio was re-measured to match it.
    aspect: 794 / 490,
    link: "/work/auto-maxx",
    focus: "50% 50%",
  },
  // A fourth study goes here. Not a limit — the track grows by one cell and the pin by 50vw,
  // which is half a screen more scrolling at a 2:1 viewport, and nothing else has to change.
];

/** The heading cell — the track's first cell, not a banner above it. */
export const CASE_HEADING = ["Selected work", "& explorations"] as const;

/** The closing cell — the track's last. Three lines in the reference; the breaks are its. */
export const CASE_CLOSING = [
  "Discover our complete collection",
  "of digital experiences, brands,",
  "and platforms.",
] as const;

export const CASE_VIEW_ALL = "View all projects";
export const CASE_EXPLORE = "Explore project";

/**
 * The panel the door uncovers: the site's one point of contact.
 *
 * Transcribed from the supplied comp, whose block is 68.4% of its frame with every line in it
 * flush left — the heading, the body, the three fields and the button all start on the same
 * edge, and the block as a whole is centred. Every figure in `./RevealPanel` is a share of
 * that frame rather than a pixel count, because the comp is a screenshot at an unstated scale
 * and only the ratios in it are trustworthy.
 *
 * The words live here with the rest of the section's copy and the markup lives there, which is
 * the same split the case cells use. The door measures nothing about any of it.
 *
 * Two transcriptions worth knowing about before editing:
 *
 *   - **"You Name" is the comp's own wording**, not a slip in the transcription. It is set
 *     verbatim rather than silently corrected, because the copy is the client's.
 *   - The e-mail address is plain text in the comp. It is a `mailto:` here, styled to inherit
 *     so it is identical at rest — the only difference is that it can be clicked.
 */
export const CASE_REVEAL = {
  heading: "Ready to give your brand a new life?",
  /** Split so the address can be a link without the sentence being assembled in the markup. */
  body: {
    before: "Join the list for first access to a limited number of founding-client projects " +
      "or just send an e-mail to ",
    email: "info@ikra.agency",
    after: ".",
  },
  /**
   * The three fields, in the comp's order.
   *
   * `label` is the comp's placeholder text and is used as both: the visible placeholder and a
   * screen-reader label, because a placeholder is not a label — it is gone the moment anyone
   * types, which is exactly when the field most needs naming.
   */
  fields: [
    { name: "name", label: "Your Name", type: "text", autoComplete: "name" },
    { name: "email", label: "Your Email", type: "email", autoComplete: "email" },
    { name: "company", label: "Company Name", type: "text", autoComplete: "organization" },
  ],
  submit: "Join The Waitlist",
} as const;
