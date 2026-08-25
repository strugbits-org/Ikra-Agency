import type { CSSProperties } from "react";
import { Band, Measure, Prose } from "./primitives";
import type { CaseStudy } from "./content";
import {
  CARD_BOX_PAD,
  CARD_GRID_GAP,
  CARD_TITLE_GAP,
  DELIVERABLES_COLS,
  DELIVERABLES_GRID_MEASURE,
  DELIVERABLES_HEAD_GAP,
  DELIVERABLES_MEASURE,
  DELIVERABLES_ROW_GAP,
  LEADING,
  TYPE,
} from "./metrics";

type Row = CaseStudy["deliverables"]["rows"][number];

/**
 * Band 7: the deliverables, as a column of terms against a column of what each one meant.
 *
 * ## The heading sits in the content column, not over the labels
 *
 * "SUMMARY OF DELIVERABLES" starts where the paragraphs start, leaving the label column
 * empty beside it. That is what makes the labels read as a margin of terms rather than as a
 * first column of a table, and it is the one placement here that looks like a mistake
 * written down and is right on the page.
 *
 * ## A row is prose or a grid, never both
 *
 * Three of the four rows are a paragraph; the website row is six deliverables under one term
 * and the reference gives it a grid of bordered cards. Rather than a `kind` discriminator the
 * shape just carries whichever field applies — the union is two optional keys, so adding a
 * row is writing the one you want and the component picks.
 *
 * The prose rows stop at `DELIVERABLES_MEASURE` of the column while the grid takes it whole,
 * so the two do not line up on the right. That is deliberate: the cards are the wider thing
 * and squaring them to the paragraphs above would flatten the difference.
 */
export default function Deliverables({ study }: { study: CaseStudy }) {
  const { title, rows } = study.deliverables;

  // The leftover as a fourth track — see the note in ./Credits. Without it these three are
  // renormalised against their own sum of 84.6 rather than against 100, which pushes the
  // content column ~84px right of where the figures say it is.
  const cols = [
    DELIVERABLES_COLS.label,
    DELIVERABLES_COLS.gap,
    DELIVERABLES_COLS.body,
    100 - DELIVERABLES_COLS.label - DELIVERABLES_COLS.gap - DELIVERABLES_COLS.body,
  ]
    .map((n) => `${+n.toFixed(4)}fr`)
    .join(" ");

  return (
    <Band tone="paper">
      <Measure>
        <div
          className="grid grid-cols-1 lg:[grid-template-columns:var(--deliv-cols)]"
          style={{ "--deliv-cols": cols } as CSSProperties}
        >
          {/* Column 3, with nothing beside it — see the head of this file. */}
          <h2
            className="lg:col-start-3"
            style={{ fontSize: TYPE.body, lineHeight: LEADING.body }}
          >
            {title}
          </h2>

          {rows.map((row, i) => (
            <DeliverableRow
              key={row.label}
              row={row}
              gap={i === 0 ? DELIVERABLES_HEAD_GAP : DELIVERABLES_ROW_GAP}
            />
          ))}
        </div>
      </Measure>
    </Band>
  );
}

/**
 * One row: its term, and its content in the column beside it.
 *
 * The two halves are separate grid items of the *band's* grid rather than a nested one, so
 * the label sits on the first line of its content at every row height without either side
 * having to know how tall the other is. `marginTop` on both, so the pair moves together.
 */
function DeliverableRow({ row, gap }: { row: Row; gap: string }) {
  const { label, paragraphs, cards } = row;

  return (
    <>
      <p
        className="font-medium lg:col-start-1"
        style={{ marginTop: gap, fontSize: TYPE.body, lineHeight: LEADING.body }}
      >
        {label}
      </p>

      <div className="lg:col-start-3" style={{ marginTop: gap }}>
        {paragraphs && (
          <Prose
            paragraphs={paragraphs}
            leading="dense"
            className="lg:[max-width:var(--measure)]"
            style={{ "--measure": `${DELIVERABLES_MEASURE}%` } as CSSProperties}
          />
        )}

        {cards && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:[max-width:var(--grid-measure)]"
            style={
              {
                gap: CARD_GRID_GAP,
                "--grid-measure": `${DELIVERABLES_GRID_MEASURE}%`,
              } as CSSProperties
            }
          >
            {cards.map((card) => (
              <div
                key={card.title}
                // `border-black/10` rather than a token: the reference's rule is a hairline
                // of the field's own darkness, so it holds against paper and would have to
                // be restated for any other tone.
                className="border border-black/10 bg-white"
                style={{ padding: CARD_BOX_PAD }}
              >
                <h3 style={{ fontSize: TYPE.cardTitle, lineHeight: LEADING.dense }}>
                  {card.title}
                </h3>
                <Prose
                  paragraphs={card.paragraphs}
                  leading="dense"
                  style={{ marginTop: CARD_TITLE_GAP }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
