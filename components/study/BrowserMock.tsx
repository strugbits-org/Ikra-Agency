import type { ReactNode } from "react";
import { MOCK_ASPECT } from "./metrics";

/**
 * The browser chrome the reference shows a delivered site inside. Frame only — whatever it
 * is framing is `children`.
 *
 * ## Everything inside is sized in `cqw`, and that is the whole trick
 *
 * The frame appears at two very different sizes on one page (roughly 705px in the masthead
 * and 683px in the outcome band) and has to hold its proportions at both, plus at every
 * width between a phone and a 4K monitor. Declaring the frame a size container and sizing
 * its contents in `cqw` — percent of the *frame's* own inline size — makes every figure
 * below a share of the artwork rather than of the viewport, so the chrome scales as one
 * piece and none of it has to be restated per breakpoint. The measured pixel value at the
 * reference's 683px frame is given beside each one.
 *
 * The alternative, a `scale()` transform on a fixed-size frame, was rejected: it blurs the
 * text and the hairlines on every non-integer factor, and this thing is mostly hairlines.
 */
export default function BrowserMock({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  /** Announced to assistive tech. The chrome itself is decorative. */
  label: string;
}) {
  return (
    <figure
      role="img"
      aria-label={label}
      className={`relative flex flex-col overflow-hidden rounded-[1.2cqw] border border-black/45 bg-white ${className}`}
      style={{ containerType: "inline-size", aspectRatio: MOCK_ASPECT }}
    >
      {/* The chrome bar: 38px of a 425px-tall frame at the reference, i.e. 5.56% of its
          width. Everything in it is stroked rather than filled — including the three
          window dots, which are outlined circles in the reference and not the usual
          traffic lights. */}
      <div
        aria-hidden
        className="flex w-full shrink-0 items-center gap-[1.6cqw] border-b border-black/20 px-[1.6cqw]"
        style={{ height: "5.56cqw" }}
      >
        <div className="flex items-center gap-[0.62cqw]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block rounded-full border border-black/70"
              style={{ width: "1.1cqw", height: "1.1cqw" }}
            />
          ))}
        </div>

        <svg
          viewBox="0 0 62 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-black/75"
          style={{ height: "2.6cqw" }}
        >
          {/* back, forward, reload */}
          <path d="M9 4 3 10l6 6" />
          <path d="M17 4l6 6-6 6" />
          <path d="M40 6.5a6 6 0 1 0 1.8 4.3" />
          <path d="M40.4 2.6V7h-4.4" />
        </svg>

        {/* The address field: a full-height pill that takes the remaining width. */}
        <div
          className="flex min-w-0 flex-1 items-center justify-between rounded-full border border-black/55 px-[1.2cqw]"
          style={{ height: "3.4cqw" }}
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-black/70"
            style={{ width: "1.7cqw", height: "1.7cqw" }}
          >
            <circle cx="7" cy="7" r="4.6" />
            <path d="M10.4 10.4 14 14" strokeLinecap="round" />
          </svg>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
            className="text-black/70"
            style={{ width: "1.9cqw", height: "1.9cqw" }}
          >
            <path d="m8 1.6 1.9 4 4.4.6-3.2 3 .8 4.3L8 11.5l-3.9 2 .8-4.3-3.2-3 4.4-.6z" />
          </svg>
        </div>

        <svg
          viewBox="0 0 18 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="shrink-0 text-black/75"
          style={{ width: "2.4cqw" }}
        >
          <path d="M1 1h16M1 7h16M1 13h16" />
        </svg>
      </div>

      {/* The framed site. `min-h-0` so a tall child cannot push the chrome out of the
          frame's fixed aspect ratio — without it the flex item's automatic minimum size is
          its content, and a long caption would grow the figure past the ratio it declares. */}
      <div className="relative min-h-0 flex-1">{children}</div>
    </figure>
  );
}
