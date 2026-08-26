import Image from "next/image";
import type { CSSProperties } from "react";
import { Band, Measure } from "./primitives";
import type { CaseStudy } from "./content";

type Credit = NonNullable<CaseStudy["credits"]>["rows"][number];
import {
  CREDITS_COLS,
  CREDITS_LOGO_WIDTH,
  CREDITS_HEAD_GAP,
  CREDITS_ROW_GAP,
  LEADING,
  TYPE,
} from "./metrics";

/**
 * Band 8: who did what — the last thing on the page before the footer.
 *
 * On pure white rather than on `paper`, which is the only place those two are set against
 * each other and the reason the step is visible at all. It is also what separates the
 * credits from the deliverables above without a rule between them.
 *
 * Set at `TYPE.role`, the page's small size — the same one the testimonial's attribution
 * uses, and for the same reason: this is a colophon, not copy.
 *
 * The two columns sit one point apart. That looks too tight written down and is right: each
 * row is one fact and its attribution, and a real gap between them reads as two lists that
 * happen to have the same number of entries.
 */
export default function Credits({ study }: { study: CaseStudy }) {
  // Optional since the second study has no such band — see BandKey in ./content.
  if (!study.credits) return null;
  const { title, rows } = study.credits;

  // A fourth track for whatever the three shares leave, and it is load-bearing rather than
  // tidy: `fr` is a share of the *free space*, so three tracks summing to 57 are renormalised
  // to 24/57, 3/57 and 30/57 — 42%, 5% and 53% — and the 43% that is supposed to stand empty
  // at the right is swallowed instead. Stating the remainder is what makes each figure mean
  // the percentage of the content box it is written as. The two MediaSplit bands escape this
  // only because their own shares happen to sum to 100.
  const cols = [
    CREDITS_COLS.role,
    CREDITS_COLS.gap,
    CREDITS_COLS.name,
    100 - CREDITS_COLS.role - CREDITS_COLS.gap - CREDITS_COLS.name,
  ]
    .map((n) => `${+n.toFixed(4)}fr`)
    .join(" ");

  return (
    <Band tone="white">
      <Measure>
        <div
          className="grid grid-cols-1 lg:[grid-template-columns:var(--credit-cols)]"
          style={
            {
              "--credit-cols": cols,
              fontSize: TYPE.role,
              lineHeight: LEADING.body,
            } as CSSProperties
          }
        >
          <h2>{title}</h2>

          {rows.map((row, i) => (
            <Row
              key={row.role}
              {...row}
              gap={i === 0 ? CREDITS_HEAD_GAP : CREDITS_ROW_GAP}
              span={rows.length - i}
            />
          ))}
        </div>
      </Measure>
    </Band>
  );
}

/**
 * Both halves are items of the band's own grid rather than of a nested one, so a role that
 * wraps to three lines keeps its name on the first of them with nothing to align.
 *
 * The second half is a line of type, a partner's mark, or nothing — the third study credits
 * one studio with a logo and leaves its other two rows unattributed, and an empty grid item
 * keeps the rows' spacing without a placeholder in it — an unattributed row emits *no*
 * second item at all, because an empty one cannot be auto-placed into a column the mark's
 * span already occupies and lands in a row of its own instead, which is 20px of white
 * between two credits and the mark no longer centred on them.
 *
 * **A mark spans the rows below it rather than sitting in its own**, and that is the whole
 * difference between this reading as one attribution and as a gap in the list. A logo is
 * several lines tall where a name is one, so left in its own row it pushes the role under it
 * down by its full height — measured, 118px of white between the first credit and the second,
 * with the mark level with the first line rather than with the block. Spanning to the last
 * row and centring on it leaves the roles evenly spaced, which is what the comp shows.
 */
function Row({ role, name, logo, gap, span }: Credit & { gap: string; span: number }) {
  return (
    <>
      {/* Medium, matching the deliverables' terms above — the same relation of a term to
          its entry, so the two tables read as one pair. */}
      <p className="font-medium lg:col-start-1" style={{ marginTop: gap }}>
        {role}
      </p>
      {logo ? (
        // The asset's own ratio on the box, so `object-contain` has nothing to letterbox and
        // one width is the only figure the mark needs. The span is a variable rather than a
        // literal class because Tailwind needs its class strings whole at build time and the
        // row count is data — the same dodge the column templates above use.
        <div
          className="mt-8 lg:col-start-3 lg:mt-0 lg:self-center lg:[grid-row:span_var(--mark-span)]"
          style={
            {
              "--mark-span": span,
              "--mark-aspect": logo.aspect,
              maxWidth: CREDITS_LOGO_WIDTH,
            } as CSSProperties
          }
        >
          <div className="relative w-full [aspect-ratio:var(--mark-aspect)]">
            <Image src={logo.src} alt={logo.alt} fill sizes="30vw" className="object-contain" />
          </div>
        </div>
      ) : name ? (
        <p className="lg:col-start-3" style={{ marginTop: gap }}>
          {name}
        </p>
      ) : null}
    </>
  );
}
