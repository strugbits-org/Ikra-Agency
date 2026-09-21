import Image from "next/image";
import type { CSSProperties } from "react";
import type { StudyMedia } from "./content";
import { MEDIA_RADIUS } from "./metrics";

/**
 * One supplied asset in a ratio box — the only place on a case study that draws a picture or
 * a clip.
 *
 * ## The box is a ratio, not an intrinsic image
 *
 * `fill` inside a box whose `aspect-ratio` the record already resolved, so the frame is exact
 * at every width, the row's height is a function of its column rather than of the asset, and
 * nothing reflows while the picture loads. That ratio is the asset's own wherever the layout
 * can hold it (see `frameRatio` and the `MediaFrame`s in ./metrics), so a normal upload is
 * never cropped; outside the range the box keeps the band's proportions and `object-cover`
 * takes the difference. It is also what makes a picture and a clip interchangeable here — the
 * space is reserved either way.
 *
 * ## A clip is several sources, and that is not belt-and-braces
 *
 * Wix transcodes an upload only as far up as its source resolution, so naming a resolution in
 * the URL is a guess about the asset: measured on this site's own clips, `720p` — which the
 * previous hard-coded URLs asked for — answers `403` on the re-cropped hero footage. The
 * record carries a short list instead (`wixVideoSources`), best first, and the browser walks
 * it until one loads. Now that the client can swap the clip, nothing here may assume anything
 * about which sizes it has.
 *
 * ## The corners are clipped here, and that is a fix rather than a style
 *
 * Several of the supplied screenshots carry their own rounded corners *baked in*, flattened
 * onto a flat colour, so whether they show depends on the band underneath — grey nicks in a
 * black field on one study, invisible on another. The frame clips its own corners instead, at
 * a radius chosen to exceed the largest baked one; `MEDIA_RADIUS` carries the measurements.
 * The testimonial's card does not go through here and keeps its square corners.
 *
 * Autoplaying, looped and `muted` — muted is what makes autoplay permitted at all — matching
 * the background footage on the home page (`hero/footage.ts`). `poster` is the clip's own
 * first frame where the CMS gives one, so the box is never a black rectangle while the video
 * opens.
 */
export default function Media({
  media,
  sizes,
  className = "",
  priority = false,
  style,
}: {
  media: StudyMedia;
  /** The `sizes` hint for the picture path. Ignored for a clip. */
  sizes: string;
  className?: string;
  priority?: boolean;
  style?: CSSProperties;
}) {
  const { src, alt, aspect, focus, sources } = media;

  return (
    <div
      // `overflow-hidden` plus a radius is what actually clips the corners — see MEDIA_RADIUS
      // for why the frame rounds itself rather than the assets being fixed.
      className={`relative w-full overflow-hidden [aspect-ratio:var(--media-aspect)] ${className}`}
      style={
        {
          "--media-aspect": aspect,
          borderRadius: MEDIA_RADIUS,
          ...style,
        } as CSSProperties
      }
    >
      {sources && sources.length > 0 ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          aria-label={alt || undefined}
          poster={src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        >
          {sources.map((source) => (
            <source key={source} src={source} type="video/mp4" />
          ))}
        </video>
      ) : src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
          style={{ objectPosition: focus }}
          priority={priority}
        />
      ) : null}
    </div>
  );
}
