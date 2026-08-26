"use client";

import type { CSSProperties, FormEvent } from "react";
import { CASE_REVEAL } from "./projects";

/**
 * The panel's scale unit: the width its block would like to be, bounded three ways.
 *
 * Everything below is a share of this one figure, so the whole composition scales as a single
 * piece and the comp's proportions survive at any size — the same reason `study/BrowserMock`
 * sizes its chrome in `cqw`.
 *
 *   `55.6vw`  the comp's own block, at 0.8 (see the note under the constant). See the note on the heading's break below for why that
 *             number comes from the break rather than from the block's edges.
 *   `128vh`   the bound that keeps the panel inside the stage. Without it the block's *height*
 *             is a pure function of the viewport's *width* — a share of it over a ratio fixed
 *             by the copy — and takes no notice of a short window: measured, the block held
 *             661px at 1920 wide whatever the height, which fits 1920x700 with 19px to spare
 *             and overflowed 1920x640. The stage is `overflow-hidden`, so overflowing it does
 *             not scroll, it clips the button off. Stated in vh and spent on the *width*, so
 *             the proportions are never broken to satisfy it — the same shape of answer as
 *             `CARD_MAX_VH` on the testimonial. The block is 0.527u tall (the shares below,
 *             summed), so 128vh holds it to 67% of the window and binds only past a 2.3:1
 *             viewport; 1920x1080 and 2560x1440 never reach it.
 *   `1056px`  the top end, so the type stops growing on a very wide screen.
 */
// Scaled to 0.8 of the comp's own figures, which read too large on a laptop. All three
// bounds move together, so every share below is untouched and the heading keeps its break.
const U = "min(55.6vw, 128vh, 1056px)";

/**
 * Every size on this panel, as a share of `U`. Read off the comp; see the component's docblock
 * for what could and could not be measured from it.
 *
 * Applied as inline styles rather than as Tailwind bracket strings for the reason
 * `study/metrics` gives: written out at each call site the figure disappears into a class
 * attribute, and the figure is the only thing anyone will want to check.
 */
const S = {
  heading: 0.0805,
  headingLead: 1.16,
  bodyTop: 0.0468,
  body: 0.0273,
  bodyLead: 1.55,
  formTop: 0.0585,
  fieldGap: 0.039,
  field: 0.0247,
  fieldPad: 0.0129,
  buttonTop: 0.0416,
  buttonPad: 0.0159,
} as const;

/** A share of the unit, with a floor so the type stays readable on a phone. */
const size = (share: number, floor: number) =>
  `max(${floor}px, calc(var(--u) * ${share}))`;

/**
 * The panel standing behind the case studies, uncovered as the track slides off to the left:
 * the waitlist form.
 *
 * ## It does not move, and that is the measured half of the effect
 *
 * In the reference this panel is bolted to the screen: across every frame of both the opening
 * and the closing its widest line held its right edge at x=1394, its left edge at 526 and its
 * cap line at y=489 — no drift, no scale, no parallax, no fade. All the motion belongs to the
 * layer in front. So there is nothing animated in this file and nothing for it to expose:
 * `./sequence` positions the window it is seen through, and this component only has to fill
 * the stage and hold still. It takes no props for the same reason — a whole screen of content
 * with no relationship to the track's geometry.
 *
 * ## It paints its own field, and the door is why
 *
 * The comp's ground is a grey close enough to this section's own that the panel was first built
 * transparent — nothing to paint, no seam where the section's gradient has already darkened
 * toward `#cfcece`. That is faithful to the comp and it costs the effect: the door is a *reveal*,
 * and a layer sliding off to uncover the identical field behind it reads as the track leaving
 * rather than as anything arriving. So the panel carries `bg-cream`, the same near-white the
 * body uses, and the moving edge is a visible boundary between two grounds for the whole of its
 * travel. The seam that ruled a panel out is not reachable: this fills the stage exactly, and
 * the stage is `overflow-hidden`.
 *
 * ## What was measured, and what was derived
 *
 * The comp is a screenshot at an unstated scale, so only the ratios in it can be trusted: the
 * heading is 8.05% of the block, the body 2.73%, the field gap 3.9%, the button 6.5%. Those
 * are in `S` above, against the unit in `U`.
 *
 * **The block's own width is derived from the heading's line break, not read off its edges.**
 * Measuring those gives 68.4% of the frame, and at that the comp's first line ("Ready to give
 * your brand") wants 758.0px against 756.5 and wraps a word early — a 0.2% miss, well inside
 * what can be read off a screenshot. The break is the reliable observation and the edge is
 * not, so the width comes from the break with a margin: at 69.5vw the line has 10.7px of
 * slack, and because both the type and the block scale with the same unit that slack is the
 * same fraction at every size. Verified as two lines from 360 to 2560 wide.
 *
 * The block is centred and its contents are flush left. Both halves matter: every line in the
 * comp starts on the same edge, and the ragged right is what stops the short lines ("a new
 * life?", the button label) reading as centred captions.
 *
 * ## The form
 *
 * Uncontrolled, reading `FormData` on submit rather than holding three pieces of state. There
 * is nowhere to send it yet, so the values go to the console; when there is, the change is
 * inside `onSubmit` and nothing else here moves.
 *
 * Two accessibility details the comp cannot show. Each field carries a real `<label>`,
 * visually hidden — a placeholder is not a label, since it disappears the moment anyone types
 * and takes the field's name with it. And the whole panel is marked `inert` by `./sequence`
 * while the door is shut: it is off-screen behind a clipping window, but off-screen is not out
 * of the tab order, and without it a keyboard reader tabs into three invisible fields.
 */
export default function RevealPanel() {
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    // Nowhere to post yet. Prevented rather than left alone so the page does not navigate.
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    console.log("[waitlist]", values);
  };

  return (
    <div
      className="flex h-full w-full items-center justify-center bg-cream px-[6vw]"
      style={{ "--u": U } as CSSProperties}
    >
      {/* Centred, and bounded by the unit from `md` up. Full width only below that, where the
          screen is a phone's and a 55.6vw column would set the heading as a stack of short
          lines. `lg` was the first cut and it left every window between 768 and 1024 running
          the block edge to edge. */}
      <div className="w-full md:[width:var(--u)]">
        <h2
          className="font-medium tracking-[-0.02em] text-ink"
          style={{ fontSize: size(S.heading, 30), lineHeight: S.headingLead }}
        >
          {CASE_REVEAL.heading}
        </h2>

        <p
          className="text-ink/85"
          style={{
            marginTop: size(S.bodyTop, 18),
            fontSize: size(S.body, 15),
            lineHeight: S.bodyLead,
          }}
        >
          {CASE_REVEAL.body.before}
          {/* Plain text in the comp; a link here, styled to inherit so it is identical at rest
              and the only difference is that it can be clicked. */}
          <a
            href={`mailto:${CASE_REVEAL.body.email}`}
            className="underline-offset-4 hover:underline"
          >
            {CASE_REVEAL.body.email}
          </a>
          {CASE_REVEAL.body.after}
        </p>

        <form onSubmit={onSubmit} style={{ marginTop: size(S.formTop, 24) }}>
          {/* One column on a phone, the comp's three across from `sm`. The gap is the comp's
              3.9% of the block, which is what makes three fields of 30.7% close it exactly. */}
          <div className="grid sm:grid-cols-3" style={{ gap: size(S.fieldGap, 18) }}>
            {CASE_REVEAL.fields.map((field) => (
              <div key={field.name}>
                <label htmlFor={`reveal-${field.name}`} className="sr-only">
                  {field.label}
                </label>
                <input
                  id={`reveal-${field.name}`}
                  name={field.name}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  placeholder={field.label}
                  /* Bottom rule only, and the rule is the field. `bg-transparent` so the
                     panel's cream runs through it uninterrupted; `rounded-none` and the
                     appearance reset because iOS otherwise draws its own inset box.
                     `focus-visible` rather than `focus`, so a pointer user does not get a ring
                     they never asked for — and an outline rather than a heavier rule, because
                     a 1px underline going to 2px is not an indicator anyone can find. */
                  className="w-full appearance-none rounded-none border-0 border-b border-ink/30 bg-transparent text-ink transition-colors outline-none placeholder:text-ink/55 hover:border-ink/50 focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                  style={{
                    paddingBottom: size(S.fieldPad, 8),
                    fontSize: size(S.field, 14),
                  }}
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="w-full cursor-pointer bg-accent font-medium text-white transition-colors outline-none hover:bg-[#e8502f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            style={{
              marginTop: size(S.buttonTop, 20),
              paddingBlock: size(S.buttonPad, 9),
              fontSize: size(S.field, 14),
            }}
          >
            {CASE_REVEAL.submit}
          </button>
        </form>
      </div>
    </div>
  );
}
