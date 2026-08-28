"use client";

import { useState } from "react";

// The footage behind the doors. /img/hero-bg.jpg stays underneath it as the base
// layer rather than being replaced.
const BACKGROUND_VIDEO_SRC: string | null = "/video/waves.mp4";
// How far the doors must be open before the footage is worth decoding. Just
// inside the ~0.28 where the overlapping panels first clear each other.
export const BACKGROUND_VISIBLE_AT_DOOR = 0.25;

/**
 * The background footage's `src`, ready as soon as the stage mounts, and whether it
 * has frames yet so the layer can fade over the still.
 *
 * This used to wait for `requestIdleCallback` (up to 2.5s) before even starting the
 * fetch, on the theory that nothing behind the doors is visible for the first
 * viewport of scrolling anyway. On a slow mobile connection that idle window can
 * still be running well after the reader has the doors open, leaving the still
 * image showing where the footage should be — arriving on request rather than late
 * is worth more than the deferred bandwidth was saving. The play/pause gate in
 * paintStage is still keyed to the doors independently, and the still underneath
 * still covers every case where the frames aren't there yet.
 *
 * `bgSrc` is a plain derived value rather than state fed by an effect: there is no
 * longer any async scheduling decision behind it, only "is this the client, post
 * hydration, and not reduced motion" — both already known by render time.
 *
 * Skipped under reduced motion, where the doors start parked open and autoplaying
 * footage would be unrequested motion on arrival.
 */
export function useBackgroundFootage(mounted: boolean, reducedMotion: boolean) {
  const bgSrc = mounted && !reducedMotion ? BACKGROUND_VIDEO_SRC : null;
  // Set once the video actually starts playing, so the fade-over-still can key off it.
  const [bgPlaying, setBgPlaying] = useState(false);

  return { bgSrc, bgPlaying, setBgPlaying };
}
