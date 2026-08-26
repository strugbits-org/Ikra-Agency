import { CASE_REVEAL } from "./projects";

/**
 * The panel standing behind the case studies, uncovered as the track slides off to the left.
 *
 * ## It does not move, and that is the measured half of the effect
 *
 * In the reference this panel is bolted to the screen: across every frame of both the
 * opening and the closing its widest line held its right edge at x=1394, its left edge at
 * 526 and its cap line at y=489 — no drift, no scale, no parallax, no fade. All the motion
 * belongs to the layer in front. So there is nothing animated in this file and nothing for
 * it to expose: `./sequence` positions the window it is seen through, and this component
 * only has to fill the stage and hold still.
 *
 * That is also why it takes no props. It is a whole screen of content with no relationship
 * to the track's geometry, and when the contact form replaces the placeholder below it will
 * still have none.
 *
 * ## Ownership
 *
 * The copy lives in `./projects` with the rest of the section's words (`CASE_REVEAL`); the
 * markup lives here. A contact form is what this becomes — it wants a client component and
 * its own state, and dropping one in is a change to this file alone, because the door
 * measures nothing about what is behind it.
 */
export default function RevealPanel() {
  return (
    /* `bg-cream` — the site's own ground, and the reference's relationship rather than its
       palette: a light panel behind a grey door. `--color-gray` is the field in front and
       `#484848` is the footer below, so this is the lightest thing in the run and reads as
       the page opening up rather than as another band. */
    <div className="flex h-full w-full flex-col items-center justify-center bg-cream px-[6vw] text-center">
      <p className="text-[clamp(38px,7vw,140px)] leading-[1.02] font-light tracking-[-0.03em] text-ink">
        {CASE_REVEAL.lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </p>

      <p className="mt-10 text-[clamp(11px,0.8vw,16px)] font-normal tracking-[0.2em] text-ink/45 uppercase lg:mt-14">
        {CASE_REVEAL.note}
      </p>
    </div>
  );
}
