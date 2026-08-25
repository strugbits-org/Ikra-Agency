import type { CSSProperties } from "react";
import { Band, Measure } from "./primitives";
import type { CaseStudy } from "./content";
import {
  CREDITS_COLS,
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
 */
function Row({ role, name, gap }: { role: string; name: string; gap: string }) {
  return (
    <>
      {/* Medium, matching the deliverables' terms above — the same relation of a term to
          its entry, so the two tables read as one pair. */}
      <p className="font-medium lg:col-start-1" style={{ marginTop: gap }}>
        {role}
      </p>
      <p className="lg:col-start-3" style={{ marginTop: gap }}>
        {name}
      </p>
    </>
  );
}
