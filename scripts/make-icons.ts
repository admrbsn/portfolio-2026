/**
 * Rasterise the favicon into the formats that cannot be SVG. `bun run make:icons`.
 *
 * `public/favicon.svg` is the source of truth — edit that, re-run this. Three
 * outputs, and each exists for a specific consumer:
 *
 * - `apple-touch-icon.png` (180) — iOS home screen, which ignores SVG icons.
 * - `icon-192.png` / `icon-512.png` — Android and the web app manifest.
 * - `favicon.ico` — legacy requests to the well-known path. Written by hand
 *   because sharp cannot encode ICO: the format allows a PNG payload, so this
 *   is a 22-byte header wrapped around a 32x32 PNG.
 */

import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const ROOT = new URL('../public/', import.meta.url);
const svg = await readFile(new URL('favicon.svg', ROOT));

/*
  `flatten` composites onto the page surface. The tab-strip icons stay
  transparent — a bare dot is the point — but a home screen icon cannot: iOS
  fills transparency with black and Android may pad it with its own colour, so
  those get the surface baked in and read as a deliberate tile.
*/
const SURFACE = '#0c0e0f';

const png = (size: number, flatten = false) => {
  const base = sharp(svg, { density: 384 }).resize(size, size);
  return (flatten ? base.flatten({ background: SURFACE }) : base)
    .png({ compressionLevel: 9 })
    .toBuffer();
};

for (const [name, size] of [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
] as const) {
  await writeFile(new URL(name, ROOT), await png(size, true));
  console.log(`  ${name} (${size}x${size}, on ${SURFACE})`);
}

/* ICO: one 32x32 entry, PNG-compressed. */
const ico32 = await png(32);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // image count
header.writeUInt8(32, 6); // width
header.writeUInt8(32, 7); // height
header.writeUInt8(0, 8); // palette size (0 = truecolour)
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(1, 10); // colour planes
header.writeUInt16LE(32, 12); // bits per pixel
header.writeUInt32LE(ico32.length, 14); // payload size
header.writeUInt32LE(22, 18); // payload offset
await writeFile(new URL('favicon.ico', ROOT), Buffer.concat([header, ico32]));
console.log('  favicon.ico (32x32, PNG payload)');
