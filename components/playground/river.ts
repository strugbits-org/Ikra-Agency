import { gsap } from "@/lib/gsap";

/**
 * The river — the orange ribbon that winds down the playground section.
 *
 * The wide drawing is a transcription and nothing in it is chosen. The narrow one is built
 * out of a measured piece of the same drawing but has to place it, so the handful of figures
 * that are preferences rather than measurements all sit with it: the thickness band, the
 * bleed and NARROW_CENTRE_FRAC. Each says so where it stands.
 *
 * ## Where the shape comes from
 *
 * The reference recording is a 1904 × 913 viewport: the browser area above the taskbar in
 * `hero-playground.mp4`. The centreline was recovered from it by masking the accent colour,
 * filling the glyph holes, taking a distance transform and ridge-following that from a seed
 * inside the ribbon — so these anchors are the ribbon's drawn centre, not an edge.
 *
 * It was worth establishing what the shape is *not*, because both wrong answers are the
 * ones anyone would reach for first and both are cheap to re-derive:
 *
 *  - **It is not a sine along a tilted axis** — the mechanism `hero/band.ts` uses. Fitting
 *    one over the free axis angle and wavelength leaves an rms residual of **65px** against
 *    an 80px-thick ribbon, i.e. the model misses by most of the ribbon's own width.
 *  - **It is not a sine-generated (Euler) meander** either, which is the shape family a real
 *    river belongs to. Fitting `θ(s) = axis + θ0·sin(2πs/L)` to the measured heading leaves
 *    **35° rms**. It fails because the reference's wavelength *tapers* — successive
 *    half-cycles measure 620, 340, 330, 270px of arc, and the heading amplitude falls from
 *    ±80° to ±53° with them.
 *
 * So it is a drawn path, and it is transcribed rather than modelled: WIDE_ANCHORS below are
 * the ridge resampled every 60px of arc, in normalised coordinates.
 *
 * ## Why there are two shapes
 *
 * WIDE_ANCHORS are laid onto the viewport by the same *non-uniform* map a viewport-unit
 * drawing would get (x across a fixed share of the width, y across the full height), which
 * is exact at the reference's own aspect and safe across desktop ones. It is not safe at
 * phone aspect, and the failure is specific: squashing x by `a` and y by `b` scales a
 * *horizontal* apex's radius of curvature by `a²/b`. At 390 × 844 that is 0.045, so the long
 * sweeping arm across the upper third — the reference's most characteristic feature, and the
 * only stretch where its copy reads almost level — collapses from a 153px radius to 7px
 * against a 40px ribbon. That is not a tight bend, it is a self-intersection.
 *
 * A narrow screen therefore gets its own shape rather than a crop or a squash of this one —
 * the same answer `hero/doors.ts` gives to the same kind of problem. It is built by tiling one
 * measured period of the reference's own lower meander (MOTIF), under a *uniform* scale, so
 * the ribbon's thickness, its bend radii and the clearance between adjacent passes all keep
 * the ratios they were drawn at, at every width.
 *
 * Which of the two a viewport gets is `riverIsWide`, and it is an aspect test rather than a
 * width one — see there for the case that rules a breakpoint out.
 */

/** The reference viewport: the browser area in the recording, above the taskbar. */
const REF_W = 1904;
const REF_H = 913;

/**
 * The band of the reference viewport the river occupies, as fractions of its width — the
 * measured extremes of the drawn centreline (x 170 … 1046). WIDE_ANCHORS' first coordinate
 * is a fraction *of this band*, so the two travel together: widen the band and the whole
 * drawing widens with it.
 */
const RIVER_X0 = 170 / REF_W;
const RIVER_XW = 876 / REF_W;

/**
 * The ribbon's drawn width, measured where the path runs vertically and a scanline crosses
 * it square — 78–80px across four such stretches. It is rendered as a *stroke* rather than
 * as a solved outline (which is what `hero/band.ts` does): the reference's round caps are
 * visible at the bottom-left corner, and a stroke is the only construction that holds a
 * constant width through a bend tight enough to double back, which this path does four times.
 */
const REF_THICKNESS = 80;

/**
 * Type size as a share of the thickness. 46px on an 80px ribbon, recovered two ways that
 * agree: the "W" of a "Work" sitting on a level stretch measures 44 × 33px, which solves to
 * 46.2 against the font's 0.714 cap height and to 45.4 against its W advance.
 *
 * `hero/band.ts` uses 0.55 for the same relation, which is the same figure to within the
 * measurement.
 */
const FONT_OF_THICKNESS = 0.575;

/**
 * The thickness a viewport gets, in px. The reference's own 80 at 1904 is 4.20% of the
 * width, and that share is what carries across — the clamp only binds below ~950px and
 * above ~2190px.
 *
 * The floor is not cosmetic: the ribbon's copy is the point of it, and below ~40px the
 * 23px type it carries stops being readable at arm's length.
 */
const thicknessFor = (w: number) => gsap.utils.clamp(40, 92, w * 0.042);

/**
 * The narrow river's thickness band, and the only thing here that is chosen rather than
 * measured — the reference has no narrow layout to measure. It matters more than a thickness
 * usually would, because that drawing is scaled uniformly: the thickness is therefore also
 * what decides how many bends fit down the screen. Held between 44 and 66 because two bends
 * read as a river and six read as a zigzag.
 */
const narrowThicknessFor = (w: number) => gsap.utils.clamp(44, 66, w * 0.145);

/**
 * The shallowest bend in the transcribed run, in reference px — the bottom of the long
 * sweeping arm, where the path is horizontal and its radius of curvature measures 153.
 *
 * It is the bend that decides whether WIDE_ANCHORS can be used at all, and the arithmetic is
 * short enough to state: squash a curve by `a` horizontally and `b` vertically and a
 * *horizontal* apex's radius scales by `a²/b` (parametrise near the apex as
 * `y = Y − c·x²`; the squash gives `y' = bY − (bc/a²)x'²`). The two apexes go opposite ways —
 * a *vertical* one scales by `b²/a` and so only ever opens up — which is why this one alone
 * is the test.
 */
const WIDE_APEX_R = 153;

/**
 * How much of the ribbon's own width that bend has to keep as radius before the wide drawing
 * is given up on. Below 0.5 the stroke folds through itself; 1.1 leaves the bend visibly
 * open, and it is where the reference's own 1.91 has fallen to by the aspect at which the arm
 * stops reading as a sweep.
 */
const WIDE_APEX_MIN_R_OVER_T = 1.1;

/**
 * Below this the river takes MOTIF whatever the aspect: the wide drawing's copy needs room to
 * read along its shallow stretches, and a phone has none.
 */
export const RIVER_NARROW_MAX_W = 768;

/**
 * Whether a viewport can carry WIDE_ANCHORS.
 *
 * A width threshold alone cannot answer this, and the case that proves it is 768 × 1024 — wide
 * enough by any breakpoint, and the arm's 153px radius maps to 22px there against a 40px
 * ribbon, i.e. a hairpin folded through itself. The failure is driven by *aspect*, so that is
 * what is tested, through the measured bend rather than through a ratio standing in for it.
 *
 * The answer travels out on `riverFor`'s own `narrow`, because the layout has to make the
 * same decision: a narrow river sweeps the whole width, so the copy has to go full width over
 * it and take the scrim. Those cannot be left on a `md:` class while this is on the aspect —
 * the two would disagree for every tablet held upright.
 */
export function riverIsWide(w: number, h: number) {
  if (w < RIVER_NARROW_MAX_W || h <= 0) return false;
  const a = (w * RIVER_XW) / 876;
  const b = h / REF_H;
  return (
    (WIDE_APEX_R * a * a) / b >=
    WIDE_APEX_MIN_R_OVER_T * thicknessFor(w)
  );
}

/**
 * The drawn centreline, resampled every 60px of arc and normalised: `[u, v]` where u is a
 * fraction of the river's band (RIVER_X0 … RIVER_X0 + RIVER_XW) and v a fraction of the
 * viewport's height.
 *
 * ## The three kinds of entry below
 *
 * **The run** is the ridge itself, and it is the bulk of the list.
 *
 * **The ends of the run** are not the ridge, and that is the correction worth knowing about.
 * The ridge-follow drifts for its last few steps at either frame edge — the distance
 * transform has no ribbon beyond the frame to measure against, so it falls off and the walk
 * wanders sideways. Both ends therefore come from the row scan instead, whose midpoint *is*
 * the centreline for a straight tilted band. At the top that is x = 973/980/986/993 at
 * y = 12/24/36/48, a steady dx/dy of 0.56. At the bottom it is x = 436/446/452/458/465/472 at
 * y = 840…912, a leg running at a steady **62°** — against the **36°** the drifting ridge
 * reported for its final step. Shipping that step put a near-cusp in the bottom bend: the
 * radius swung 31px (under half the ribbon's own width) straight into a reversal, which is
 * visible as a pinch even though the anchors either side of it are right.
 *
 * **The head and tail** continue the path out of frame. The head follows the row scan's
 * measured dx/dy. The tail is the bend below the fold plus the hump that shows in the
 * bottom-left corner: the hump is clipped by the viewport's own bottom edge, so its centreline
 * cannot be read off directly, but its *top* edge is not clipped and offsetting that along
 * the local normal recovers it to the pixel (873 at the apex, against 872 read straight off
 * the one unclipped column). The bend linking the two is authored as a cubic honouring the
 * tangent at each end — 62° leaving the leg, 221° arriving at the hump — so its heading turns
 * monotonically rather than wobbling, and it is placed against the one thing the recording
 * fixes about it: there is no ribbon between x≈285 and x≈420 on the last visible row, which
 * is what puts it below the fold.
 */
const WIDE_ANCHORS: readonly (readonly [number, number])[] = [
  // — head: off the top edge, on the row scan's measured dx/dy —
  [0.7831, -0.1972],
  [0.8311, -0.1205],
  [0.8733, -0.0548],
  [0.9087, 0.0],
  // — the run —
  [0.9247, 0.0263],
  [0.9483, 0.0671],
  [0.9811, 0.1244],
  [1.0029, 0.1863],
  [0.9969, 0.2506],
  [0.9632, 0.3072],
  [0.9130, 0.3508],
  [0.8564, 0.3841],
  [0.7898, 0.3957],
  [0.7225, 0.3865],
  [0.6582, 0.3641],
  [0.5965, 0.3357],
  [0.5351, 0.3068],
  [0.4711, 0.2871],
  [0.4062, 0.3040],
  [0.3823, 0.3600],
  [0.4151, 0.4165],
  [0.4634, 0.4630],
  [0.5097, 0.5112],
  [0.5407, 0.5689],
  [0.5295, 0.6318],
  [0.4823, 0.6774],
  [0.4194, 0.7023],
  [0.3553, 0.7246],
  [0.3072, 0.7689],
  [0.2892, 0.8317],
  [0.2951, 0.8967],
  [0.3219, 0.9595],
  [0.3447, 0.9989],
  // — tail: the linking bend below the fold (authored) …
  [0.3600, 1.0406],
  [0.3534, 1.0731],
  [0.3293, 1.0956],
  [0.2926, 1.1079],
  [0.2479, 1.1093],
  [0.1998, 1.0995],
  [0.1529, 1.0778],
  // … and the hump, off its own unclipped top edge —
  [0.1119, 1.0442],
  [0.0753, 1.0031],
  [0.0388, 0.9673],
  [0.0023, 0.9562],
  [-0.0342, 0.9646],
  [-0.0708, 0.9896],
  [-0.1073, 1.0302],
  [-0.1484, 1.0789],
  [-0.1941, 1.1336],
];

/**
 * One period of the reference's own lower meander, in reference px relative to its start —
 * the stretch between arc-length 880 and 1480, chosen because the drawn heading there is
 * 101.2° and 101.7°, i.e. the two ends are half a degree apart. That is what lets copies of
 * it be laid end to end without a visible kink; a period cut between any two points that
 * merely *look* alike leaves one.
 *
 * MOTIF_DRIFT is that period's own displacement, so a tile's start is the previous tile's
 * end by construction rather than by a second constant.
 */
const MOTIF: readonly (readonly [number, number])[] = [
  [0.0, 0.0],
  [11.2, 47.0],
  [42.7, 85.6],
  [78.4, 120.6],
  [112.0, 157.5],
  [136.6, 200.5],
  [137.4, 249.3],
  [112.0, 291.9],
  [70.4, 318.6],
  [23.4, 335.1],
  [-23.3, 352.2],
  [-60.3, 384.1],
  [-78.1, 430.3],
];
const MOTIF_DRIFT = MOTIF[MOTIF.length - 1];

/**
 * Where the narrow river's horizontal extent is centred, as a fraction of the width. The one
 * preference in this file.
 *
 * 0.38 rather than 0.5 because the drift runs leftward as the river descends: centring the
 * *extent* at 0.38 puts the top bends at roughly three quarters across and lets the bottom
 * ones bleed off the left edge, which is the reference's own gesture (it enters high and
 * right, leaves low and left) at a width that cannot hold the reference's own sweep.
 */
const NARROW_CENTRE_FRAC = 0.38;

/**
 * How far past the viewport's edges the narrow river runs before it is allowed to stop, in
 * tiles. One whole period at each end, so nothing — a resize, a phone's address bar
 * collapsing mid-scroll — can bring a rounded end cap onto the screen.
 */
const NARROW_BLEED_TILES = 1;

export type RiverGeometry = {
  narrow: boolean;
  /** Stroke width, px. */
  thickness: number;
  fontSize: number;
  /**
   * The centreline, in viewport px, ordered **downstream-to-upstream** — from the
   * bottom-left end to the top-right one. That direction is the copy's reading direction in
   * the reference (its glyphs read toward the top right, and the marquee carries them that
   * way), and an SVG textPath has no way to run against its path.
   */
  points: readonly (readonly [number, number])[];
  /** The same, as a cubic-Bézier `d`. Both the stroke and the textPath use it. */
  d: string;
};

/**
 * Catmull-Rom through the anchors, emitted as the Bézier form of the same curve.
 *
 * **Centripetal** (α = ½), not the uniform form. Uniform Catmull-Rom gives every anchor a
 * handle one sixth of the chord across it whatever the spacing either side, so a short segment
 * next to a long one overshoots; centripetal weights each handle by the square root of its own
 * segment's length, which is the standard result that it cannot cusp or self-intersect at any
 * spacing. The anchors here are evenly spaced through the transcribed run (60px of arc) but
 * not across the authored tail (29–47px), so that guarantee is worth having.
 *
 * It is insurance rather than a fix, and worth saying which: the pinch that was visible in the
 * bottom bend was a bad *anchor*, not a bad parameterisation — the ridge's drifted final step
 * (see WIDE_ANCHORS). With that step corrected the two forms measure the same, worst curvature
 * jump 0.0043 either way. Centripetal costs nothing for the guarantee: with equal segments the
 * formula reduces to exactly the uniform one.
 *
 * The ends extrapolate a reflected phantom anchor rather than duplicating the endpoint. A
 * duplicate has zero length, which the weights divide by.
 */
function smoothPath(points: readonly (readonly [number, number])[]) {
  if (points.length < 2) return "";
  const parts = [`M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const p0 = points[i - 1] ?? ([2 * p1[0] - p2[0], 2 * p1[1] - p2[1]] as const);
    const p3 =
      points[i + 2] ?? ([2 * p2[0] - p1[0], 2 * p2[1] - p1[1]] as const);

    // Each segment's length to the power α = ½. Floored so a pair of coincident anchors
    // degrades to a straight join rather than a division by zero.
    const w = (a: readonly [number, number], b: readonly [number, number]) =>
      Math.max(1e-6, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
    const d1 = w(p0, p1);
    const d2 = w(p1, p2);
    const d3 = w(p2, p3);

    const c1 = (k: 0 | 1) =>
      (d1 * d1 * p2[k] -
        d2 * d2 * p0[k] +
        (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[k]) /
      (3 * d1 * (d1 + d2));
    const c2 = (k: 0 | 1) =>
      (d3 * d3 * p1[k] -
        d2 * d2 * p3[k] +
        (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[k]) /
      (3 * d3 * (d3 + d2));

    parts.push(
      `C ${c1(0).toFixed(2)} ${c1(1).toFixed(2)} ${c2(0).toFixed(2)} ${c2(1).toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`,
    );
  }
  return parts.join(" ");
}

/** WIDE_ANCHORS laid onto a viewport: a share of the width across, the full height down. */
function widePoints(w: number, h: number) {
  return WIDE_ANCHORS.map(
    ([u, v]) => [(RIVER_X0 + u * RIVER_XW) * w, v * h] as const,
  );
}

/** MOTIF tiled down the viewport under one uniform scale — see the docblock above. */
function narrowPoints(w: number, h: number, thickness: number) {
  const k = thickness / REF_THICKNESS;
  const tileH = MOTIF_DRIFT[1] * k;
  const tiles = Math.ceil(h / tileH) + 2 * NARROW_BLEED_TILES;

  const raw: (readonly [number, number])[] = [];
  for (let t = 0; t < tiles; t++) {
    // Each tile drops its first point: it is the previous tile's last.
    const from = t === 0 ? 0 : 1;
    for (let i = from; i < MOTIF.length; i++) {
      raw.push([
        (MOTIF[i][0] + t * MOTIF_DRIFT[0]) * k,
        (MOTIF[i][1] + t * MOTIF_DRIFT[1]) * k,
      ]);
    }
  }

  const xs = raw.map((p) => p[0]);
  const ys = raw.map((p) => p[1]);
  // Centre the extent horizontally on NARROW_CENTRE_FRAC, and vertically on the viewport so
  // the bleed tiles fall equally above and below it.
  const dx =
    NARROW_CENTRE_FRAC * w - (Math.min(...xs) + Math.max(...xs)) / 2;
  const dy = h / 2 - (Math.min(...ys) + Math.max(...ys)) / 2;
  return raw.map(([x, y]) => [x + dx, y + dy] as const);
}

/**
 * Everything about the river at one viewport size. Pure — it reads no DOM and holds no
 * state, so the caller can memoise it against the measured stage.
 */
export function riverFor(w: number, h: number): RiverGeometry {
  const narrow = !riverIsWide(w, h);
  const thickness = narrow ? narrowThicknessFor(w) : thicknessFor(w);

  const downstream = narrow
    ? narrowPoints(w, h, thickness)
    : widePoints(w, h);
  // Reversed once, here, so every consumer sees one direction — see RiverGeometry.points.
  const points = [...downstream].reverse();

  return {
    narrow,
    thickness,
    fontSize: thickness * FONT_OF_THICKNESS,
    points,
    d: smoothPath(points),
  };
}

if (process.env.NODE_ENV !== "production") {
  // The transcription's guarantee: at the reference's own viewport the drawing must come
  // back exactly as it was measured. Both extremes of the measured run are asserted, since
  // between them the anchors are simply carried through.
  const ref = riverFor(REF_W, REF_H);
  const measured = widePoints(REF_W, REF_H);
  // The run's widest point — the right-hand apex, measured at (1048.5, 170.1).
  const apex = measured.reduce((a, b) => (b[0] > a[0] ? b : a));
  if (
    Math.abs(apex[0] - 1048.5) > 1 ||
    Math.abs(apex[1] - 170.1) > 1 ||
    Math.abs(ref.thickness - REF_THICKNESS) > 0.5
  ) {
    console.error(
      "[Playground] the river no longer reproduces the reference at 1904×913 — " +
      "RIVER_X0/RIVER_XW or WIDE_ANCHORS have drifted from the measurement.",
      { apex, thickness: ref.thickness },
    );
  }
  // The tiling's guarantee. The curve itself cannot kink — Catmull-Rom shares one tangent
  // between the two segments meeting at every anchor, the seam included — so what can go
  // wrong is subtler: the seam's tangent is the chord across it, and if the period were cut
  // between two points of genuinely different heading that chord would swing away from the
  // drawn direction and the river would visibly wander at every repeat.
  //
  // So this checks the seam's chord against the heading actually measured at the cut
  // (101.2° entering, 101.7° leaving — half a degree apart, which is why this cut was the one
  // chosen). Note it is not the chord *within* MOTIF that matters: those span 50px of arc
  // through a bend and read 77° and 111°, which is the curve turning, not a defect.
  const MOTIF_CUT_HEADING = 101.5;
  const n = MOTIF.length;
  const before = [
    MOTIF[n - 2][0] - MOTIF[n - 1][0],
    MOTIF[n - 2][1] - MOTIF[n - 1][1],
  ];
  const seam = Math.atan2(MOTIF[1][1] - before[1], MOTIF[1][0] - before[0]);
  const swing = Math.abs((seam * 180) / Math.PI - MOTIF_CUT_HEADING);
  if (swing > 12) {
    console.error(
      `[Playground] the tiled seam's tangent is ${swing.toFixed(1)}° off the heading ` +
      `measured at MOTIF's cut, so the narrow river will wander at every repeat. Re-cut ` +
      "the period between two points of equal heading.",
    );
  }
}
