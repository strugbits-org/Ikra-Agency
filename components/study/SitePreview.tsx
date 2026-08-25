import Image from "next/image";
import type { CaseStudy } from "./content";

/**
 * The delivered site, drawn inside `<BrowserMock>`.
 *
 * ## Markup rather than a screenshot, deliberately
 *
 * The reference frames a real capture of the client's homepage. We have no such capture, and
 * a stock photograph dropped into the frame would read as a photograph in a browser rather
 * than as a website. Rebuilding the two-panel layout in markup costs about eighty lines, is
 * sharp at every size the frame appears at, and keeps the copy in `content.ts` where the
 * rest of the page's words already live. Swap it for the real thing by pointing
 * `masthead.hero` at an image and rendering that instead — the frame does not care.
 *
 * Sized in `cqw` throughout for the reason given at the head of ./BrowserMock: this is drawn
 * at two different widths on one page. The measured pixel value at the reference's 683px
 * frame follows each figure.
 *
 * The mono face is the browser's own (`ui-monospace`), not a webfont: the reference sets
 * this panel in a technical monospace, and matching the *category* is what carries the
 * impression here — nobody reads a 12px caption inside a mockup, they read its texture.
 */
export default function SitePreview({ preview }: { preview: CaseStudy["preview"] }) {
  return (
    <div className="flex h-full w-full font-mono text-black">
      {/* The white panel: 28.5% of the frame's width, measured 195px of 683. */}
      <div
        className="flex shrink-0 flex-col justify-between border-r border-black/15 bg-white py-[2.4cqw] pr-[1.4cqw] pl-[2.2cqw]"
        style={{ width: "28.5%" }}
      >
        <div className="flex items-start justify-between gap-[1cqw]">
          <span
            className="leading-none font-bold tracking-[0.02em]"
            style={{ fontSize: "1.72cqw" }}
          >
            {preview.brand}
            <sup style={{ fontSize: "0.62em" }}>™</sup>
          </span>
          <svg
            viewBox="0 0 16 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            className="mt-[0.3cqw] shrink-0 text-black/80"
            style={{ width: "2.1cqw" }}
          >
            <path d="M1 1h14M1 5h14M1 9h14" />
          </svg>
        </div>

        {/* The headline sits on the panel's own optical centre, which is why the panel is a
            three-part `justify-between` column rather than a stack with margins. */}
        <p
          className="leading-[1.28] font-normal"
          style={{ fontSize: "3.55cqw" }}
        >
          {preview.headline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>

        <div style={{ fontSize: "1.62cqw" }} className="leading-[1.5]">
          <p className="font-bold">{preview.address[0]}</p>
          {preview.address.slice(1).map((line, i) => (
            <p key={line} className="text-black/45">
              {line}
              {/* The location pin closes the last address line in the reference. */}
              {i === preview.address.length - 2 ? (
                <span className="text-[#e0362b]"> ⚲</span>
              ) : null}
            </p>
          ))}
          <p className="mt-[1.7cqw] text-black/45">{preview.phone}</p>
        </div>
      </div>

      {/* The photograph, and the three things the reference floats over it. */}
      <div className="relative min-w-0 flex-1">
        <Image
          src={preview.photo.src}
          alt=""
          fill
          sizes="(min-width: 1024px) 30vw, 70vw"
          className="object-cover"
          style={{ objectPosition: preview.photo.focus }}
        />

        <span
          className="absolute top-[2.4cqw] right-[2.2cqw] bg-[#e7dfc6] px-[1cqw] py-[0.35cqw] leading-none text-black/85"
          style={{ fontSize: "1.6cqw" }}
        >
          {preview.tag}
        </span>

        {/* Caption and call-to-action share the panel's foot. The caption is capped at a
            measure rather than the panel's width — in the reference it stops well short of
            the pill, which is what keeps the two from colliding. */}
        <div className="absolute inset-x-[2.4cqw] bottom-[2.2cqw] flex items-end justify-between gap-[2cqw]">
          <p
            className="max-w-[74%] font-sans leading-[1.42] text-white/95"
            style={{ fontSize: "1.85cqw" }}
          >
            {preview.caption}
          </p>
          <span
            className="flex shrink-0 items-center gap-[0.6cqw] rounded-full bg-ember px-[1.4cqw] py-[0.7cqw] leading-none font-sans whitespace-nowrap text-white"
            style={{ fontSize: "1.5cqw" }}
          >
            <svg
              viewBox="0 0 12 12"
              fill="currentColor"
              style={{ width: "1.3cqw", height: "1.3cqw" }}
              aria-hidden
            >
              <path d="M6 0c.4 2.6 1.4 3.6 4 4-2.6.4-3.6 1.4-4 4-.4-2.6-1.4-3.6-4-4 2.6-.4 3.6-1.4 4-4Z" />
            </svg>
            {preview.cta}
          </span>
        </div>
      </div>
    </div>
  );
}
