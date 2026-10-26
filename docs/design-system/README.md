# Design system

The portfolio's visual language, written down. Four files:

| File | What lives there |
| --- | --- |
| [`tokens.md`](tokens.md) | Every value in the `@theme` block — colour, type, spacing, radius, motion — and the rules governing changes to them |
| [`patterns.md`](patterns.md) | Recurring constructions: the blueprint frame, ruled grids, full-bleed rules, gradient text, the prose seam |
| [`components.md`](components.md) | What exists, what it takes, where it is used, and what breaks it |
| [`motion.md`](motion.md) | The `data-anim` registry, the teardown contract, reduced motion, the page loader |

`AGENTS.md` (symlinked as `CLAUDE.md`) stays the entry point for working in the
repo — toolchain, content conventions, Breakout, Dribbble. It points here for
anything visual.

## The idea

**A drafting frame, not a set of cards.** The site is built out of hairlines,
intersection squares, hatched dead space and full-bleed rules. Where a
conventional portfolio would reach for a rounded panel with a background fill,
this one rules a grid and lets the page surface show through. That is why the
radius token is 3px and why `--color-line` is white-with-alpha rather than an
opaque grey.

Four rules fall out of that, and most review comments trace back to one of them:

1. **One accent family, site-wide.** No per-page hues. See
   [tokens](tokens.md#colour).
2. **Every crossing of two rules is marked.** Section rules against the page
   rails, grid corners, both ends of every divider. Half-marked grids are what
   make the system read as arbitrary. See
   [patterns](patterns.md#intersection-squares).
3. **Two type families, and one radius.** Deviations are listed explicitly in
   [tokens](tokens.md#type) and [tokens](tokens.md#radius) — if it is not on
   those lists, it is a mistake.
4. **Every effect returns a teardown.** See [motion](motion.md#the-contract).

## Adding a component

Work through this before opening a PR against `src/components/`:

- [ ] Uses tokens, not literals. No hex, no `rgb()`, no ad-hoc `px` radius.
- [ ] If it renders inside `.case-body`, every element it emits carries a class
      — that is the seam that keeps prose styles out of it. See
      [patterns](patterns.md#the-prose-seam).
- [ ] Every crossing is marked. A full-width section rule takes
      `<RuleCross />`; a grid marks both ends of its own dividers.
- [ ] If it animates, the effect is declared with `data-anim` and returns a
      teardown; anything binding its own listeners unbinds on
      `astro:before-swap`.
- [ ] If it scrolls, it carries `data-lenis-prevent`.
- [ ] Reduced motion leaves it readable and still.
- [ ] Checked at 390px, 768px and 1440px. The first is where the nav, the
      at-a-glance grid and the persona traits break first.

## Checking your work

```sh
bun run check          # types
bun run check:tokens   # the design system's own guard rails
bun run build          # static output
```

**[`/styleguide`](../../src/pages/styleguide.astro)** renders the system from
`global.css` at build time — swatches with live contrast ratios and gamut flags,
the type scale, both gradient ramps side by side, the blueprint vocabulary, and
component states. It reads the stylesheet rather than restating it, so it cannot
drift: add a token and it appears; break one and the number beside it says so.
`noindex`, and filtered out of the sitemap.

**`bun run check:tokens`** (`scripts/check-tokens.ts`) fails the build on:

| Rule | Why it exists |
| --- | --- |
| sRGB gamut | An accent stop once resolved to a **-0.065** red channel, shipped clamped, and painted `#00f0b2` instead of the value in the file |
| Contrast | `--color-ink-faint` is used at 12px and has to clear 4.5:1; the check asserts five token/threshold pairs |
| Raw colour | A hex or chromatic `rgb()` outside the allow-list means a component stopped following the palette |
| Radius | Anything not `var(--radius-ui)`, a pill, a circle or `0` |
| Breakpoint | A media query at a width that is not one of Tailwind's |

Both the page and the check share `src/lib/color.ts`, so the numbers on screen
and the numbers in CI are computed by the same code.

## Brand assets

**Favicon** — `public/favicon.svg` is the source of truth. The mark is the
wordmark's accent dot at icon scale, filled with the compact blue→purple ramp
the display type uses for its full stop. **No tile behind it**: in a row of
square favicons a bare circle is the thing that reads as different, and
transparency lets it sit on whatever the browser's tab strip is doing. An
earlier version drew the blueprint crossing instead — legible, but at 16px it
resolved to "a dot with some noise", so the dot won on its own.

Two constraints if you edit it:

- **Hex, not `oklch()`.** The file is rasterised by librsvg via sharp, which
  does not resolve CSS Color 4. Re-derive the stops with `src/lib/color.ts` if
  the palette moves.
- **No `--` inside XML comments.** Writing a token name with its leading dashes
  makes the file unparseable, and the failure surfaces as a sharp error about a
  corrupt header rather than anything about comments.

Then `bun run make:icons` regenerates the formats that cannot be SVG: the 180px
touch icon, the 192/512 manifest icons, and a `favicon.ico` whose payload is a
32px PNG (the ICO container is written by hand; sharp cannot encode it). The
tab-strip icons keep their transparency; the home screen ones are flattened onto
`--color-surface`, because iOS fills transparency with black.

**Social cards** — two kinds:

- **Default** (`public/og/default.jpg`) is a screenshot of
  [`/og-card`](../../src/pages/og-card.astro), a real 1200x630 page built from
  the actual tokens, fonts and blueprint vocabulary. To regenerate: `bun run
  build`, `bunx astro preview`, capture `/og-card/` at 1200x630 with a 2x device
  pixel ratio, then downscale to 1200x630 and write it as JPEG. **Capture from
  the preview build, not the dev server** — the Astro dev toolbar sits in frame
  otherwise.
- **Case studies** derive theirs from the entry's own `cover`, cropped to
  1200x630 through `getImage()` at build time, so a shared link shows the work
  and can never go stale against the entry. A rendered card per study (cover plus
  title) would look better and would need regenerating by hand on every title
  edit; automatic and current won.

`/og-card` and `/styleguide` both carry `noindex` and are filtered out of the
sitemap.

There is still no visual regression suite. The measurements in these docs
(contrast ratios, column widths, crossing counts) came from devtools against the
running dev server, and re-measuring beats eyeballing — several of them exist
because something looked right and was not.
