/**
 * Compose Tribute V3's cover from its own screenshots. `bun scripts/make-tribute-v3-cover.ts`.
 *
 * Flat on purpose. The previous cover was an angled collage, and the skew made
 * every screen a sliver. This is nine screens square to the page in three
 * staggered columns: the middle one centred with the Balloons tribute page at
 * its heart (the most colourful state the product has), the outer two running
 * off the edges so it reads as a slice of a larger system rather than a
 * framed set.
 *
 * Every screen is dark. A light one (the testimonials page) was tried in the
 * bottom-right and pulled the eye into the corner, away from the centre.
 *
 * Ground is the site's own blue/purple wash, so the tile sits in the
 * portfolio's palette. 2400x1350 matches the work tile's 16:9.
 */
import sharp, { type OverlayOptions } from 'sharp';
const D = new URL('../src/assets/work/tribute-v3/', import.meta.url).pathname;
const OUT = process.argv[2] ?? D + 'hero.webp';
const W = 2400, H = 1350;
const CW = 980, GAP = 56, CH = Math.round((CW * 1283) / 2400);
const R = 14;

const columns: { offset: number; files: string[] }[] = [
  { offset: -40, files: ['tribute-v3-gallery-1.webp', 'tribute-v3-onboarding-new.webp', 'tribute-v3-gallery-4.webp'] },
  { offset: -167, files: ['tribute-v3-gallery-5.webp', 'tribute-v3-gallery-10.webp', 'tribute-v3-gallery-8.webp'] },
  { offset: -300, files: ['tribute-v3-gallery-3.webp', 'tribute-v3-gallery-11.webp', 'tribute-v3-pricing.webp'] },
];

const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="a" cx="85%" cy="5%" r="70%"><stop offset="0" stop-color="#4a6fe0" stop-opacity="0.5"/><stop offset="1" stop-color="#4a6fe0" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="10%" cy="100%" r="65%"><stop offset="0" stop-color="#7b3fc4" stop-opacity="0.45"/><stop offset="1" stop-color="#7b3fc4" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="#0c0d14"/>
  <rect width="100%" height="100%" fill="url(#a)"/>
  <rect width="100%" height="100%" fill="url(#b)"/>
</svg>`);

const mask = Buffer.from(`<svg width="${CW}" height="${CH}"><rect width="${CW}" height="${CH}" rx="${R}" fill="#fff"/></svg>`);
const border = Buffer.from(`<svg width="${CW}" height="${CH}"><rect x="1" y="1" width="${CW - 2}" height="${CH - 2}" rx="${R}" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="2"/></svg>`);
const PAD = 100;
const shadow = await sharp(Buffer.from(`<svg width="${CW + PAD * 2}" height="${CH + PAD * 2}"><rect x="${PAD}" y="${PAD + 24}" width="${CW}" height="${CH}" rx="${R}" fill="rgba(0,0,0,0.6)"/></svg>`)).blur(36).png().toBuffer();

const card = (f: string) =>
  sharp(D + f).resize(CW, CH, { fit: 'cover', position: 'top' }).composite([{ input: mask, blend: 'dest-in' }, { input: border }]).png().toBuffer();

// Middle column centred; the outer two run off the edges by the same amount.
const midLeft = Math.round((W - CW) / 2);
const lefts = [midLeft - GAP - CW, midLeft, midLeft + CW + GAP];

// Composite onto an oversized canvas so off-edge cards need no clipping maths,
// then extract the frame.
const M = 600;
const layers: OverlayOptions[] = [];
for (const [c, col] of columns.entries()) {
  for (const [k, f] of col.files.entries()) {
    const left = lefts[c] + M, top = col.offset + k * (CH + GAP) + M;
    layers.push({ input: shadow, left: left - PAD, top: top - PAD });
    layers.push({ input: await card(f), left, top });
  }
}
const big = await sharp(bg).resize(W + M * 2, H + M * 2, { fit: 'fill' }).composite(layers).png().toBuffer();
await sharp(big).extract({ left: M, top: M, width: W, height: H }).webp({ quality: 88 }).toFile(OUT);
console.log('wrote', OUT);
