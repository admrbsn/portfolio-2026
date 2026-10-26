/**
 * Render the recording-flow cover and its first gallery image.
 * `bun scripts/recording-flow-art/render.ts` (needs Google Chrome installed).
 *
 * Both used to be AI illustrations with a cake, balloons, party hats and gift
 * boxes crowded around the form. The props now come from `birthday-art.jpg`,
 * generated in OpenArt to Tribute's own illustration spec — matte toy-like clay,
 * three to six counted objects, clusters on the sides bleeding off the bottom,
 * the middle left empty, a flat dark navy ground. The recipe lives in the
 * Tribute Brand Guidelines artifact, §06 Illustration.
 *
 * The UI on top is rebuilt in HTML rather than pasted from a screenshot, so it
 * stays crisp: `tribute-logo.svg` is the official mark from that same guide,
 * and John's avatar is cropped from gallery-2, the clean product screenshot.
 *
 * `GROUND` must match the art's own navy: everything outside the two clusters
 * is a flat fill, and a value even a few levels off shows as a visible box
 * around each one.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const HERE = new URL('.', import.meta.url).pathname;
const ASSETS = new URL('../../src/assets/work/recording-flow/', import.meta.url).pathname;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ART = 'birthday-art.jpg';
const GROUND = '060c1a';
// Each cluster's height as a % of the frame. At full size (the art filling the
// frame) the cake and cupcake dwarfed the form card; the clusters are cut out
// of the flat ground and pinned to their own corners instead, so they can be
// scaled without sliding in behind the card.
const SCALE = process.env.SCALE ?? '62';
// Where to cut: the clusters live in the outer third on each side and the
// middle is flat ground, so a cut anywhere in it is invisible.
const SPLIT = 0.34;

const work = mkdtempSync(join(tmpdir(), 'rf-art-'));
for (const f of ['hero.html', 'g1.html', 'scene.js', 'tribute-logo.svg']) cpSync(HERE + f, join(work, f));

const { width: AW = 0, height: AH = 0 } = await sharp(HERE + ART).metadata();
const cut = Math.round(AW * SPLIT);
await sharp(HERE + ART).extract({ left: 0, top: 0, width: cut, height: AH }).png().toFile(join(work, 'art-left.png'));
await sharp(HERE + ART).extract({ left: AW - cut, top: 0, width: cut, height: AH }).png().toFile(join(work, 'art-right.png'));

const g2 = ASSETS + 'recording-flow-gallery-2.webp';
await sharp(g2).extract({ left: 668, top: 334, width: 82, height: 82 }).png().toFile(join(work, 'avatar.png'));

const shoot = (page: string, w: number, h: number, scale: number, out: string) =>
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    `--force-device-scale-factor=${scale}`, `--window-size=${w},${h}`, '--virtual-time-budget=5000',
    `--screenshot=${out}`, `file://${join(work, page)}?ground=${GROUND}&scale=${SCALE}`,
  ], { stdio: 'ignore' });

// 1200x675 at 2x → 2400x1350, the work tile's 16:9.
shoot('hero.html', 1200, 675, 2, join(work, 'hero.png'));
// 1536x1024 (the original's frame) at 1.5625x → 2400x1600.
shoot('g1.html', 1536, 1024, 1.5625, join(work, 'g1.png'));

await sharp(join(work, 'hero.png')).webp({ quality: 90 }).toFile(ASSETS + 'hero.webp');
await sharp(join(work, 'g1.png')).webp({ quality: 90 }).toFile(ASSETS + 'recording-flow-gallery-1.webp');
console.log('wrote hero.webp and recording-flow-gallery-1.webp');
