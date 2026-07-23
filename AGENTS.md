# portfolio-2026

Personal portfolio for Adam Robertson. Astro 7 (static) + Svelte 5 islands + Tailwind v4 + GSAP/Lenis, deployed static to Netlify.

## Commands

```sh
bun install
bun run dev       # astro dev — daemonizes; manage with `astro dev stop|status|logs`
bun run build     # static output to dist/
bun run preview
bun run check     # astro check (types)
```

## Toolchain constraints

These are load-bearing. Changing them breaks the build in non-obvious ways.

- **Node >= 22.12.0 is required** (Astro 7). Bun is the package manager and task
  runner, but `bun run` respects the `astro` bin's `#!/usr/bin/env node` shebang
  and executes under system Node — so Node itself must be 22+, not just Bun.
  `.node-version` pins it; run `nvm use` before working.
- **TypeScript is pinned to 6.x.** TS 7's native compiler does not yet expose the
  programmatic API `astro check` depends on. Don't bump to 7 until
  [withastro/roadmap#1321](https://github.com/withastro/roadmap/discussions/1321)
  lands.
- **Netlify does not autodetect Bun here.** It looks for `bun.lockb`, but Bun 1.2+
  writes a text `bun.lock`. `netlify.toml` sets the build command and
  `BUN_VERSION` explicitly — don't rely on detection.
- **Markdown/MDX runs on Sätteri**, not remark/rehype (Astro 7's default). GFM and
  smartypants are built in. To use a remark/rehype plugin, install
  `@astrojs/markdown-remark` and set `markdown.processor` back to unified.
- **`compressHTML` is off** in `astro.config.mjs`. Astro 7 defaults it to `'jsx'`,
  which strips whitespace between inline elements and silently breaks display
  type like `<span>a</span> <em>b</em>`.

## Styling

Tailwind v4 is CSS-first. **There is no `tailwind.config.js`** — the `@theme`
block in `src/styles/global.css` is the config. Every token there becomes a
utility (`--color-ink` → `text-ink`, `--text-display` → `text-display`).

**Type pairing**: Instrument Sans for all UI and body copy, Instrument Serif for
display (`--text-display`, `--text-stat`, the wordmark). Instrument Serif ships a
single weight — set it at `font-normal`, never `font-bold`. Its descenders are
long, so `--text-display` needs `line-height: 1`; tightening it crowds the line
below.

`--color-ink-faint` is contrast-tuned: it is used almost entirely at 12px, where
WCAG AA requires 4.5:1. It sits at 4.9:1 on `--color-surface`. Do not darken it
below `L=0.58`. `--color-status` (availability green, 11.2:1) is kept separate
from `--color-accent` so the brand colour can change independently.

The nav deliberately has **no `mix-blend-mode`**. Difference blending kept a
monochrome bar legible over any backdrop, but it inverts the green availability
dot to magenta and the accent dot in the wordmark to blue; the scroll-triggered
scrim in `Nav.astro` replaces it.

## Motion system

All animation lives in `src/lib/motion/`. Effects are declared in markup, never
wired inline:

```astro
<h1 data-anim="reveal-heading">…</h1>
<div data-anim="reveal-batch">…</div>
<section data-anim="pin">…</section>
```

The registry in `src/lib/motion/index.ts` maps each `data-anim` value to an
effect in `effects.ts`. **Every effect must return a teardown function.** That
contract is what keeps navigation clean — `destroyMotion()` runs all teardowns on
`astro:before-swap`; without it, ScrollTriggers accumulate against detached DOM
on every client-side navigation.

To check for a leak after changing an effect, in dev:

```js
__motion.triggers(); // navigate away and back; must not climb
```

Two things initialise **once** and deliberately survive navigation, because they
bind to elements the ClientRouter never swaps:

- Lenis (`lenis.ts`) — bound to `window`, driven by `gsap.ticker` rather than its
  own RAF loop so it shares a clock with ScrollTrigger. Two loops desync and read
  as jitter on pinned sections.
- Nav behaviour (`nav.ts`) — the nav carries `transition:persist`.

### Reduced motion

`initMotion()` checks `prefers-reduced-motion` first and bails before creating
Lenis or any effect. Because `[data-anim]` elements start at `opacity: 0`, that
bail **must** be paired with CSS forcing them visible, or the page renders blank.
Two rules in `global.css` cover this: the `@media` query (fast path, applies
pre-JS) and `html[data-motion='reduced']` (stamped by `initMotion`, keeping JS
the single source of truth). Keep both — they exist because the two can
otherwise disagree and strand content invisible.

## Content

Case studies are MDX in `src/content/work/`, typed by the zod schema in
`src/content.config.ts`. Covers are `image()`-typed and live in
`src/assets/work/` so Astro's pipeline optimises them; don't put them in
`public/`.

The current three entries are **placeholder copy with illustrative metrics** —
replace before shipping.

MDX components available inside case studies: `Figure`, `PullQuote`, `Stat`
(passed via `<Content components={…} />` in `src/pages/work/[...slug].astro`).
