#!/usr/bin/env bun
/**
 * Refresh the Dribbble grid from the public profile page.
 *
 *   bun run sync:dribbble
 *
 * Rewrites `src/data/dribbble.ts` and syncs thumbnails into
 * `src/assets/dribbble/`. Run it whenever you post something new — nothing here
 * happens at build time, so the site stays static, deterministic and offline.
 *
 * WHY NOT THE API
 * Dribbble's v2 API needs an OAuth token, and a token in a static build is
 * either committed (the old portfolio did exactly this, into a public repo) or
 * it turns the build into something that can fail on someone else's outage.
 * The public profile page carries everything the grid needs, so this reads that
 * instead. Their RSS feed used to be the polite option; it 404s now.
 *
 * WHAT THIS COSTS
 * It is a scrape, so it is keyed to Dribbble's markup and they can change it
 * whenever they like. That is survivable *because* it runs on demand: it fails
 * loudly at your desk rather than silently on a deploy. Two guards below keep a
 * markup change from quietly emptying the grid — see MIN_SHOTS and the
 * per-page completeness check.
 */

import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HANDLE = 'adamrobertson';
const PROFILE = `https://dribbble.com/${HANDLE}`;

// `import.meta.url`, not Bun's `import.meta.dir` — the latter runs fine but is
// not in the TS lib Astro typechecks against, so it fails `bun run check`.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(HERE, '../src/data/dribbble.ts');
const IMAGE_DIR = path.join(HERE, '../src/assets/dribbble');

/** Dribbble serves nothing to a default fetch UA. */
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

/**
 * Refuse to write if the parse comes back under this. A markup change shows up
 * as "0 shots found", and without a floor that would cheerfully truncate the
 * grid to nothing and delete every local thumbnail.
 */
const MIN_SHOTS = 15;

/** A full page. A short one means we have reached the end. */
const PAGE_SIZE = 24;

/** Runaway guard, not an expected limit. */
const MAX_PAGES = 10;

/**
 * The grid renders at 4:3 and asks for widths up to 480, so 640x480 covers the
 * largest request with real pixels. `format=webp` is the difference between a
 * 13KB thumbnail and a 202KB one — the CDN does the conversion, and Astro's
 * pipeline re-optimises from there.
 */
const THUMB_QUERY = '?format=webp&resize=640x480&vertical=center';

interface Shot {
  id: string;
  href: string;
  title: string;
  thumb: string;
  file: string;
}

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

/** `null` means "past the end" — Dribbble 404s rather than serving an empty page. */
async function fetchPage(page: number): Promise<string | null> {
  const url = page === 1 ? PROFILE : `${PROFILE}?page=${page}`;
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (res.status === 404 && page > 1) return null;
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return res.text();
}

/**
 * One record per shot card.
 *
 * The title comes from the card's "View <title>" label rather than a heading —
 * it is the one place the full, untruncated title appears. Thumbnails are
 * matched on `/userupload/`, which is what separates a real shot image from the
 * avatars, mastheads and site chrome also served off the same CDN.
 */
function parseShots(html: string): { shots: Shot[]; linkCount: number } {
  const linkCount = new Set(html.match(/href="\/shots\/\d+[^"?]*"/g) ?? []).size;
  const cards = html.split(/(?=<li[^>]*class="[^"]*shot-thumbnail)/i).slice(1);

  const shots: Shot[] = [];
  const seen = new Set<string>();

  for (const card of cards) {
    const slug = card.match(/href="\/shots\/(\d+)([^"?]*)"/);
    const title = card.match(/>\s*View ([^<]{2,160})/);
    const thumb = card.match(/https:\/\/cdn\.dribbble\.com\/userupload\/[^\s"'\\]+/);
    if (!slug || !title || !thumb) continue;

    const id = slug[1]!;
    if (seen.has(id)) continue;
    seen.add(id);

    shots.push({
      id,
      href: `https://dribbble.com/shots/${id}${slug[2]}`,
      title: decode(title[1]!),
      // Strip Dribbble's own transform before applying ours.
      thumb: decode(thumb[0]).split('?')[0]! + THUMB_QUERY,
      file: `${id}.webp`,
    });
  }

  return { shots, linkCount };
}

async function download(url: string, dest: string) {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

function renderDataFile(shots: Shot[]): string {
  const entries = shots
    .map(
      (s) => `  {
    href: ${JSON.stringify(s.href)},
    title: ${JSON.stringify(s.title)},
    file: ${JSON.stringify(s.file)},
  },`,
    )
    .join('\n');

  return `// Dribbble shots, synced from the public profile (${HANDLE}).
//
// GENERATED — run \`bun run sync:dribbble\` to refresh; do not hand-edit.
// Thumbnails are self-hosted in ./assets/dribbble so the build makes no network
// calls and nothing depends on a token. Ordered newest-first, as on Dribbble.
export interface Shot {
  href: string;
  title: string;
  /** Filename in src/assets/dribbble/. */
  file: string;
}

export const dribbbleUrl = ${JSON.stringify(PROFILE)};

export const shots: Shot[] = [
${entries}
];
`;
}

async function main() {
  console.log(`Reading ${PROFILE}\n`);

  const all: Shot[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await fetchPage(page);
    if (html === null) break;

    const { shots, linkCount } = parseShots(html);
    if (linkCount === 0) break;

    /*
      Shot links present but few of them parsed into complete records means the
      card markup moved. Bail rather than write a half-empty grid.
    */
    if (shots.length < linkCount * 0.6) {
      throw new Error(
        `page ${page}: found ${linkCount} shot links but only parsed ${shots.length}.\n` +
          `Dribbble's card markup has probably changed — check parseShots().`,
      );
    }

    let added = 0;
    for (const s of shots) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      all.push(s);
      added++;
    }
    console.log(`  page ${page}: ${added} shots`);

    // A short page is the last page — stop before requesting one that 404s.
    if (added === 0 || shots.length < PAGE_SIZE) break;
  }

  if (all.length < MIN_SHOTS) {
    throw new Error(
      `Only ${all.length} shots parsed (floor is ${MIN_SHOTS}). Refusing to write —\n` +
        `this is what a markup change looks like, and overwriting now would empty the grid.`,
    );
  }

  await mkdir(IMAGE_DIR, { recursive: true });

  let fetched = 0;
  for (const s of all) {
    const dest = path.join(IMAGE_DIR, s.file);
    if (existsSync(dest)) continue;
    await download(s.thumb, dest);
    fetched++;
    console.log(`  + ${s.file}  ${s.title}`);
  }

  // Anything no longer in the feed — including the old NN.png naming.
  const keep = new Set(all.map((s) => s.file));
  const onDisk = await readdir(IMAGE_DIR);
  let pruned = 0;
  for (const f of onDisk) {
    if (keep.has(f)) continue;
    await unlink(path.join(IMAGE_DIR, f));
    pruned++;
    console.log(`  - ${f}`);
  }

  await writeFile(DATA_FILE, renderDataFile(all));

  console.log(
    `\n${all.length} shots · ${fetched} downloaded · ${pruned} pruned\n` +
      `Wrote src/data/dribbble.ts`,
  );
}

main().catch((err) => {
  console.error(`\nsync:dribbble failed — nothing was written.\n${err.message}\n`);
  process.exit(1);
});
