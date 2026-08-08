/**
 * Design system guard rails. `bun run check:tokens`.
 *
 * Every rule here exists because it was broken once and the breakage was
 * invisible until someone measured:
 *
 * - an accent stop resolved to a negative channel and shipped clamped, so the
 *   colour on screen was never the colour in the file;
 * - a caption colour drifted under 4.5:1 at 12px;
 * - a component hardcoded a hex, a radius or a breakpoint and stopped following
 *   the tokens the rest of the site follows.
 *
 * Exits non-zero on any failure, so it can gate a build.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { contrast, flatten, isInGamut, oklchToLinearSrgb, parseOklch, toHex } from '../src/lib/color';
import type { Oklch } from '../src/lib/color';

const ROOT = new URL('..', import.meta.url).pathname;
const GLOBAL_CSS = join(ROOT, 'src/styles/global.css');

interface Failure {
  rule: string;
  detail: string;
}

const failures: Failure[] = [];
const notes: string[] = [];

const fail = (rule: string, detail: string) => failures.push({ rule, detail });

/* ---------------------------------------------------------------- tokens -- */

const css = await readFile(GLOBAL_CSS, 'utf8');

/** Every `--name: value;` inside the @theme block, plus the :root shared paint. */
function readCustomProps(source: string): Map<string, string> {
  const props = new Map<string, string>();
  for (const [, name, value] of source.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    props.set(name, value.trim());
  }
  return props;
}

const tokens = readCustomProps(css);

const colours = new Map<string, Oklch>();
for (const [name, value] of tokens) {
  if (!name.startsWith('--color-')) continue;
  const parsed = parseOklch(value);
  if (parsed) colours.set(name, parsed);
}

if (colours.size === 0) fail('tokens', 'no --color-* tokens parsed — has the @theme block moved?');

/* ------------------------------------------------------------- 1. gamut -- */

for (const [name, colour] of colours) {
  if (isInGamut(colour)) continue;
  const channels = oklchToLinearSrgb(colour)
    .map((v) => v.toFixed(3))
    .join(', ');
  fail(
    'sRGB gamut',
    `${name} is out of gamut — linear channels (${channels}). The browser clamps it and paints ${toHex(colour)}, not the value written down. Lower the chroma or move the hue.`,
  );
}

/* ---------------------------------------------------------- 2. contrast -- */

const surface = colours.get('--color-surface');

/** [token, minimum, why]. Minima come from how the colour is actually used. */
const CONTRAST_RULES: [string, number, string][] = [
  ['--color-ink', 7, 'body and headings'],
  ['--color-ink-lead', 7, 'lead paragraphs'],
  ['--color-ink-dim', 4.5, 'secondary body copy'],
  ['--color-ink-faint', 4.5, 'used at 12px, where AA wants 4.5:1'],
  ['--color-accent', 4.5, 'small link text'],
  ['--color-status', 4.5, 'availability label'],
];

if (surface) {
  for (const [name, min, why] of CONTRAST_RULES) {
    const colour = colours.get(name);
    if (!colour) {
      fail('contrast', `${name} is missing`);
      continue;
    }
    // Translucent tokens are measured as they actually paint: over the surface.
    const ratio = contrast(colour.alpha === undefined ? colour : flatten(colour, surface), surface);
    if (ratio < min) {
      fail(
        'contrast',
        `${name} is ${ratio.toFixed(2)}:1 on --color-surface, below the ${min}:1 it needs (${why}).`,
      );
    } else {
      notes.push(`${name} ${ratio.toFixed(1)}:1 (needs ${min})`);
    }
  }

  const line = colours.get('--color-line');
  if (line?.alpha !== undefined) {
    const flat = flatten(line, surface);
    notes.push(`--color-line flattens to ${toHex(flat)} over the surface`);
  }
}

/* ------------------------------------------------------------- 3. usage -- */

const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro', 'assets', 'fonts']);

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(astro|svelte|css|ts)$/.test(entry.name)) yield path;
  }
}

/*
  Allow-listed files. Breakout is a documented off-brand island (its rainbow is
  the point); the Moment illustrations and Device are depictions whose radii and
  palettes describe real objects; global.css is where the tokens themselves are
  declared.
*/
const OFF_BRAND = [
  'lib/breakout/',
  'components/BreakoutCTA.astro',
  'components/MomentTribute.astro',
  'components/MomentPetersons.astro',
  'components/mdx/Device.astro',
  // The pixel-art coin sprite belongs to Breakout's palette, not the brand's.
  'components/Cursor.svelte',
  'components/NoiseGradient.astro',
  'styles/global.css',
  'lib/color.ts',
  'pages/styleguide.astro',
];

const BREAKPOINTS = new Set(['40rem', '48rem', '64rem', '80rem', '63.9375rem', '47.9375rem']);

for await (const path of walk(join(ROOT, 'src'))) {
  const rel = relative(ROOT, path);
  const source = await readFile(path, 'utf8');
  const exempt = OFF_BRAND.some((entry) => rel.includes(entry));

  // Raw colour literals. `#fff` is allowed: it is white, not a brand colour,
  // and the palette has no token for it.
  if (!exempt) {
    for (const [, hex] of source.matchAll(/(#[0-9a-f]{6}\b|#[0-9a-f]{3}\b)/gi)) {
      if (/^#(fff|ffffff|000|000000)$/i.test(hex)) continue;
      fail('raw colour', `${rel} hardcodes ${hex} — use a --color-* token.`);
    }
    /*
      Chromatic `rgb()`/`hsl()` only. Neutral black and white with alpha are
      legitimate — shadows and scrims are not brand colour and the palette has
      no token for them — so a colour whose channels are all equal passes.
    */
    for (const [, fn, args] of source.matchAll(/\b(rgba?|hsla?)\(([^)]*)\)/gi)) {
      const channels = args
        .split(/[\s,\/]+/)
        .filter(Boolean)
        .slice(0, 3)
        .map(Number);
      const neutral =
        fn.toLowerCase().startsWith('rgb') &&
        channels.length === 3 &&
        channels.every((v) => Number.isFinite(v)) &&
        new Set(channels).size === 1;
      if (!neutral) {
        fail('raw colour', `${rel} uses ${fn}(${args.trim()}) — the palette is OKLCH tokens.`);
      }
    }
  }

  /*
    Ad-hoc paragraph colours. Body copy has exactly two roles — `--color-ink-lead`
    above `--text-body`, `--color-ink-dim` at or below it — and `text-white/70`
    against `text-white/90` in two adjacent sections is precisely how that drifts.
    Allowed only over an image, where neither token applies.
  */
  if (!exempt && !rel.includes('components/Dribbble.astro')) {
    for (const [, util] of source.matchAll(/\b(text-white\/\d+)/g)) {
      fail(
        'paragraph colour',
        `${rel} uses ${util} — body copy is --color-ink-lead (above --text-body) or --color-ink-dim (at or below).`,
      );
    }
  }

  // Radius literals that bypass --radius-ui. Pills, circles and zero are the
  // documented exemptions.
  if (!exempt) {
    for (const [, value] of source.matchAll(/border-radius:\s*([^;]+);/g)) {
      const v = value.trim();
      const ok =
        v.includes('var(--radius') ||
        v === 'inherit' ||
        v === '0' ||
        v === '50%' ||
        /^9{3,4}px$/.test(v);
      if (!ok) fail('radius', `${rel} sets border-radius: ${v} — use var(--radius-ui) or a pill.`);
    }
  }

  // Breakpoints. A custom property cannot be used in a media query, so these
  // have to be literals — but only Tailwind's.
  for (const [, width] of source.matchAll(/@media[^{]*?(?:min|max)-width:\s*([^)\s]+)/g)) {
    if (!BREAKPOINTS.has(width)) {
      fail('breakpoint', `${rel} uses ${width} — allowed: ${[...BREAKPOINTS].join(', ')}.`);
    }
  }
}

/* ------------------------------------------------------------- report ---- */

for (const note of notes) console.log(`  ${note}`);

if (failures.length === 0) {
  console.log(`\n✓ tokens ok — ${colours.size} colours in gamut, ${CONTRAST_RULES.length} contrast rules met`);
  process.exit(0);
}

console.error(`\n✗ ${failures.length} design system violation${failures.length === 1 ? '' : 's'}\n`);
for (const { rule, detail } of failures) console.error(`  [${rule}] ${detail}`);
console.error('\nSee docs/design-system/tokens.md\n');
process.exit(1);
