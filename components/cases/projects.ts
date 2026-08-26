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
    // than about the client's people, which is what a case-study card should show — but it
    // is only 557px wide, so it upscales past about a 1300px viewport. A wider capture is
    // the one thing that would improve this card.
    imageSrc: "/img/qcif-hero.jpg",
    link: "/work/qcif",
    focus: "50% 50%",
  },
  // A third study goes here. Not a limit — the track grows by one cell and the pin by 50vw,
  // which is half a screen more scrolling at a 2:1 viewport, and nothing else has to change.
  // {
  //   id: "northern-waters",
  //   title: "Northern Waters",
  //   description:
  //     "Commercial strategy for a wholesaler stepping out from behind its own customers.",
  //   imageSrc: "/img/scenic-view-rocks-sea.jpg",
  //   link: null,
  //   focus: "50% 50%",
  // },
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
 * The panel the door uncovers — placeholder copy, and knowingly so.
 *
 * A contact form is going here. Until it does the panel holds one large line, which is what
 * the reference puts behind its own door (a four-line statement, nothing else on the screen
 * with it), so the reveal can be built and tuned against the right amount of ink. Replacing
 * this with a form is a change to `./RevealPanel` and this record; the door itself measures
 * nothing about what is behind it.
 */
export const CASE_REVEAL = {
  /** Set as one block, one line per entry. The breaks are deliberate, not wrapping. */
  lines: ["Tell us what", "you're making."] as const,
  /** Under the statement. Placeholder for the form's own first field. */
  note: "A contact form lands here.",
} as const;
