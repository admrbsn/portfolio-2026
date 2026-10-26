/**
 * Compose Tribute Greetings' cover from its own screens. `bun scripts/make-greetings-cover.ts`.
 *
 * The previous cover was a wall of thirty greeting-card illustrations. It was
 * busy at tile size, and the card art carries the corniest copy in the
 * project ("You are the cat's pijamas", "Super grate-ful"). This shows the
 * product instead: five phones, left to right, as one send-and-receive flow —
 * choose a card, record a video, add a gift, the envelope arrives, the card
 * is revealed. The only card art left is "you made my day", inside the UI.
 *
 * The ground takes its colour from the screens, not from the site: a light
 * blush-to-butter field (the default) or the app's full splash coral
 * (`GROUND=coral`). Two grounds that do not work, both tried: a coral *glow* over
 * near-black composited to brown — the warm-at-low-alpha trap AGENTS.md
 * describes for the Breakout section — and the site's blue/purple wash, which
 * read as borrowed from another product. Warm only works here at full strength
 * or on a light ground. 2400x1350 matches the work tile's 16:9.
 */
import sharp, { type OverlayOptions } from 'sharp';
const D = new URL('../src/assets/work/greetings/', import.meta.url).pathname;
const OUT = process.argv[2] ?? D + 'hero.webp';
const W = 2400, H = 1350;
const screens = [4, 9, 15, 19, 21].map((n) => `tribute-greetings-gallery-${n}.webp`);
const PW = 380, GAP = 64, BEZEL = 12, R = 54;
const SW = PW - BEZEL * 2, SH = Math.round((SW * 1624) / 750), PH = SH + BEZEL * 2;
const offsets = [40, -20, 30, -30, 20]; // gentle stagger so the row isn't a fence

// Ground comes from the screens themselves: the splash coral (#ff6e6d) and the
// card-picker butter (#ffe78f), with the bezels and shadows doing the depth.
const GROUND = process.env.GROUND ?? 'light';
const grounds: Record<string, string> = {
  light: `<defs>
      <linearGradient id="l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe3df"/><stop offset="1" stop-color="#fff2d2"/></linearGradient>
      <radialGradient id="p" cx="78%" cy="20%" r="55%"><stop offset="0" stop-color="#ff9a92" stop-opacity="0.35"/><stop offset="1" stop-color="#ff9a92" stop-opacity="0"/></radialGradient>
      <radialGradient id="y" cx="15%" cy="95%" r="55%"><stop offset="0" stop-color="#ffe07a" stop-opacity="0.45"/><stop offset="1" stop-color="#ffe07a" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#l)"/><rect width="100%" height="100%" fill="url(#p)"/><rect width="100%" height="100%" fill="url(#y)"/>`,
  coral: `<defs>
      <linearGradient id="c" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#ff7a73"/><stop offset="1" stop-color="#f45f5e"/></linearGradient>
      <radialGradient id="y" cx="12%" cy="100%" r="55%"><stop offset="0" stop-color="#ffd37a" stop-opacity="0.55"/><stop offset="1" stop-color="#ffd37a" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#c)"/><rect width="100%" height="100%" fill="url(#y)"/>`,
};
const SHADOW = GROUND === 'light' ? 'rgba(120,40,30,0.35)' : 'rgba(90,20,20,0.45)';
const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${grounds[GROUND]}</svg>`);

const screenMask = Buffer.from(`<svg width="${SW}" height="${SH}"><rect width="${SW}" height="${SH}" rx="${R - BEZEL}" fill="#fff"/></svg>`);
const body = Buffer.from(`<svg width="${PW}" height="${PH}"><rect width="${PW}" height="${PH}" rx="${R}" fill="#1c1c1f"/><rect x="1" y="1" width="${PW - 2}" height="${PH - 2}" rx="${R - 1}" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="2"/></svg>`);
const PAD = 120;
const shadow = await sharp(Buffer.from(`<svg width="${PW + PAD * 2}" height="${PH + PAD * 2}"><rect x="${PAD}" y="${PAD + 30}" width="${PW}" height="${PH}" rx="${R}" fill="${SHADOW}"/></svg>`)).blur(45).png().toBuffer();

const total = screens.length * PW + (screens.length - 1) * GAP;
const x0 = Math.round((W - total) / 2), y0 = Math.round((H - PH) / 2);
const layers: OverlayOptions[] = [];
for (const [i, f] of screens.entries()) {
  const x = x0 + i * (PW + GAP), y = y0 + offsets[i];
  const scr = await sharp(D + f).resize(SW, SH, { fit: 'cover', position: 'top' }).composite([{ input: screenMask, blend: 'dest-in' }]).png().toBuffer();
  layers.push({ input: shadow, left: x - PAD, top: y - PAD }, { input: body, left: x, top: y }, { input: scr, left: x + BEZEL, top: y + BEZEL });
}
await sharp(bg).composite(layers).webp({ quality: 90 }).toFile(OUT);
console.log('wrote', OUT);
