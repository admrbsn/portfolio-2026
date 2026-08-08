/**
 * Colour maths for the design system's own checks.
 *
 * Shared by `scripts/check-tokens.ts` (which fails the build on an out-of-gamut
 * or under-contrast token) and `/styleguide` (which shows the same numbers).
 * One implementation so the page can never disagree with the check.
 *
 * Everything here works in sRGB. The palette is authored in OKLCH because that
 * is the space the hue/chroma rules are written in — but the browser paints
 * sRGB, and *that* conversion is where the interesting failure lives: a channel
 * resolving below 0 is silently clamped, so the colour on screen is not the one
 * in the file. See `isInGamut`.
 */

export interface Oklch {
  l: number;
  c: number;
  h: number;
  /** 0–1. Absent means opaque. */
  alpha?: number;
}

export type Rgb = [number, number, number];

/** Parse `oklch(0.8 0.15 138)` / `oklch(1 0 0 / 0.14)`. Returns null otherwise. */
export function parseOklch(value: string): Oklch | null {
  const match = value
    .trim()
    .match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?)\s*)?\)$/i);
  if (!match) return null;

  const num = (raw: string) => (raw.endsWith('%') ? Number(raw.slice(0, -1)) / 100 : Number(raw));

  return {
    l: num(match[1]),
    c: Number(match[2]),
    h: Number(match[3]),
    alpha: match[4] === undefined ? undefined : num(match[4]),
  };
}

/**
 * OKLCH → linear sRGB, **unclamped**.
 *
 * Unclamped is the point: the out-of-gamut check needs to see the negative
 * channel before the browser flattens it to zero.
 */
export function oklchToLinearSrgb({ l, c, h }: Oklch): Rgb {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const lp = l + 0.3963377774 * a + 0.2158037573 * b;
  const mp = l - 0.1055613458 * a - 0.0638541728 * b;
  const sp = l - 0.0894841775 * a - 1.291485548 * b;

  const lc = lp ** 3;
  const mc = mp ** 3;
  const sc = sp ** 3;

  return [
    4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  ];
}

const gamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

/** OKLCH → sRGB 0–255, clamped, the way the browser will actually paint it. */
export function oklchToRgb(color: Oklch): Rgb {
  return oklchToLinearSrgb(color).map((v) => Math.round(Math.min(1, Math.max(0, gamma(v))) * 255)) as Rgb;
}

export function toHex(color: Oklch): string {
  return `#${oklchToRgb(color)
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Is every channel inside sRGB before clamping?
 *
 * `--color-accent` was once `oklch(0.84 0.19 168)`, whose red channel resolves
 * to -0.065. The browser clamps that to zero and paints the most saturated
 * green-cyan the display can make — which is why the palette reads as clipped
 * rather than as the value written down. A tolerance of 0.001 absorbs float
 * noise at the exact edge.
 */
export function isInGamut(color: Oklch, tolerance = 0.001): boolean {
  return oklchToLinearSrgb(color).every((v) => v >= -tolerance && v <= 1 + tolerance);
}

export function relativeLuminance(color: Oklch): number {
  const [r, g, b] = oklchToLinearSrgb(color).map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two opaque colours. */
export function contrast(a: Oklch, b: Oklch): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Composite a translucent colour over an opaque one, so hairlines can be measured. */
export function flatten(over: Oklch, base: Oklch): Oklch {
  const alpha = over.alpha ?? 1;
  if (alpha >= 1) return over;
  // Mixing in OKLCH's own L/C/H is close enough for a check on near-neutrals,
  // and keeps the result expressible as an Oklch for the callers above.
  return {
    l: base.l + (over.l - base.l) * alpha,
    c: base.c + (over.c - base.c) * alpha,
    h: over.c === 0 ? base.h : over.h,
  };
}
