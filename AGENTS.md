# portfolio-2026

Personal portfolio for Adam Robertson. Astro 7 (static) + Svelte 5 islands + Tailwind v4 + GSAP/Lenis, deployed static to Netlify.

## Commands

```sh
bun install
bun run dev       # astro dev — daemonizes; manage with `astro dev stop|status|logs`
bun run build     # static output to dist/
bun run preview
bun run check     # astro check (types)
bun run check:tokens   # design system guard rails — gamut, contrast, stray literals
```

`/styleguide` renders the whole system from `global.css` at build time. It is
`noindex` and kept out of the sitemap.

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

## Design system

**The visual language lives in [`docs/design-system/`](docs/design-system/).**
Four files, one topic each:

- [`tokens.md`](docs/design-system/tokens.md) — colour, type, spacing, radius,
  motion tokens, and the rules for changing them
- [`patterns.md`](docs/design-system/patterns.md) — the blueprint frame, ruled
  grids, full-bleed rules, gradient text, the prose seam
- [`components.md`](docs/design-system/components.md) — what exists, what it
  takes, what breaks it
- [`motion.md`](docs/design-system/motion.md) — the `data-anim` registry, the
  teardown contract, reduced motion, the page loader

Read those before touching anything visual. The short version, for orientation:

- Tailwind v4 is CSS-first. **There is no `tailwind.config.js`** — the `@theme`
  block in `src/styles/global.css` is the config, and every key in it becomes a
  utility.
- **Two type families** (Google Sans for UI and body, Vidaloka for display),
  **one accent palette** site-wide, **one radius** (`--radius-ui`, 3px). Every
  exception is listed in `tokens.md`; if it is not on that list, it is a mistake.
- **The accent follows the hero wash.** `--color-accent` / `-warm` / `--color-status`
  are tuned to `<NoiseGradient>`'s default `sunset` variant. Changing that
  default means moving those three tokens and both gradient ramps with it, or
  the page ends up with an orphaned hue.
- **The three display steps are one ladder** — `--text-display` /
  `--text-title` / `--text-stat`, 80/60/48 at 1440. Move one and you have to
  move the others, or the step above stops reading as the step above.
- **A grid marks every crossing of its own rules, or none of them.**
- **Dashed is the outer frame, solid is everything inside it**, and the dot
  field under `.page-rails` is the paper both are drawn on. The 45° hatch means
  something different — *deliberately empty* — and only appears where a block
  stops short of a boundary.
- **Every motion effect returns a teardown.** `destroyMotion()` runs them on
  `astro:before-swap`; without one, ScrollTriggers accumulate against detached
  DOM on every client-side navigation.
- **Components rendered inside `.case-body` must class every element they
  emit.** That class is the seam keeping prose styles out of them — see the
  prose seam section in `patterns.md`.

## Breakout

`src/lib/breakout/` is a playable Breakout that overlays the live page, reached
from `BreakoutCTA.astro` above the footer. The mechanic: a 98.5%-black veil
covers the real site and every brick cleared lifts it, so winning restores the
portfolio to full visibility. `game.ts` is the engine (canvas only, no DOM
knowledge), `index.ts` is the overlay shell (HUD, panels, lifecycle),
`breakout.css` is all of the styling.

**Nothing loads until someone clicks play.** That is the whole reason for the
file layout, and it is easy to break:

- `BreakoutCTA.astro`'s script is a ~20-line delegated loader whose only job is
  a dynamic `import('../lib/breakout')`. Keep it that way — anything imported
  statically there lands in the eager bundle.
- `index.ts` imports its stylesheet as `./breakout.css?inline`, not as a plain
  CSS import. Astro collects stylesheets by walking a page's module graph
  *including dynamic imports*, so a plain import gets hoisted into a
  render-blocking `<link>` on every page. `?inline` still runs the CSS
  pipeline but yields a string that the module injects on mount.
- After touching either, verify: `breakout*.css` must not appear in any
  `dist/**/*.html`, and a cold load must fetch only the ~1.3KB loader chunk.

**The CTA is the one section allowed off-brand.** Its rainbow — now the brick
wall alone — derives from one array, `ROW_COLOURS` in `BreakoutCTA.astro`,
which is also what the canvas paints its rows with. Build anything new there
from that array rather than hardcoding a hex, or the decoration drifts from the
game it advertises. The narrow-hue accent rule in `global.css` does not apply
here and only here.

**The section is the 1978 Atari box, rebuilt.** Orange ground (`#ff8924`), the
wordmark in Baumans over a hard offset shadow in a *darker orange* (the
original's shadow is not black, which is why the lettering reads as printed
rather than embossed), two lines of red subhead, a numeral block and a spec
block either side of a bordered art window. Every value is sampled off the
artwork rather than eyeballed. This file's whole palette is literals by design —
`check:tokens` allow-lists the component for exactly that reason.

**What is deliberately not borrowed is the branding.** The Atari fuji, the ATARI
wordmark and the CX2622 part number are a real company's marks, and stamping
them on a personal site is impersonation rather than homage. The composition is
the reference, not the identity; the colophon strip names this site instead.

**Colour behind the section only works because it is contained.** A four-field
background glow, a rainbow title gradient and a rainbow launch button were all
tried and cut when this section was black — against a rack that is already six
saturated hues, more colour behind, above and below left nothing quiet enough to
read it by. That objection is answered by the box, not overturned by it: the
orange lives inside a bordered panel and the rack lives inside a *second*
bordered window on a dark ground, so the six hues never sit loose on the orange.
Take either border away and the earlier failure comes straight back.

The button stays a brushed-silver coin slot — square corners, hard pixel bevel,
zero blur anywhere in it. One blurred shadow and it stops reading as 8-bit and
starts reading as a skeuomorphic button.

The player illustration is painted **over** the bricks and cropped by the
window's bottom edge; that crop is what sells him as coming *through* the wall
rather than standing behind it. He is sized off the panel's **height**, not its
width — matched to the width he shrank whenever the column narrowed and ended up
a figurine under the rack. The art window's top padding (22%) exists for the
same reason: pinned to the top edge, the rack leaves him nothing to come through.

The ™ marks are set in `--font-sans`, and that is not an oversight. Neither
Baumans nor Tiny5 carries U+2122, and Tiny5's fallback is a 5px blob that reads
as a rendering fault.

The wall carries a **notch that widens downward** — a ball has tunnelled up
through the middle, so the bottom rows are chewed through and the top ones are
untouched. That is the shape the arcade cabinet art has, and a picture of the
mechanic the copy describes. A centred radial hole was tried first and is wrong:
damage that does not reach an edge reads as a target, not as a ball's path.

Generated in the frontmatter from a half-width that grows with depth. `t ** 1.6`
is what curves it — linear growth gives a drawn triangle, and the exponent holds
the top two rows fully intact before opening up quickly through the lower half.
The constants keep the outermost column alive on every row; a rack eaten to its
edges stops reading as a rack. Knocked-out bricks stay in the grid as empty
sockets rather than being removed — drop the element and the survivors close
ranks and the damage disappears.

Both the gaps and the churn delays come from one seeded LCG, in that order.
SSG output has to be byte-stable across builds, so nothing here may call
`Math.random()`, and re-ordering those two draws changes the wall.

**Never change `animation-duration` on a running animation here.** Changing it
preserves the animation's current *time*, not its progress — so progress
(time / duration) jumps the instant the value changes, and the element teleports.
A `:hover` speed-up on the ball measured a ~396px jump against a ~30px normal
frame, which read as the ball vanishing and restarting elsewhere. The wall keeps
its speed-up because one brick jumping mid-churn among identical neighbours is
invisible; a single tracked object jumping is not.

Everything decorative is gated on `.arcade[data-visible]`, set by an
IntersectionObserver: the section sits above the footer, so on most visits it is
never reached, and a wall plus a ball animating against nothing is pure
background cost. Anything animated added here must join that gate. Reduced
motion parks the ball mid-stage rather than hiding it, so the composition still
reads as a game in progress.

The rally lives **inside the art window**, not loose in the section. It crossed
the whole thing while the section was black; on the orange ground the same
squares read as specks of dirt on printed card — and the box itself has no ball
flying across its artwork. It is ordered before the player so it passes behind
him; over his face it reads as a blemish rather than as depth.

Two deliberate eager font costs, both for this one below-the-fold section: Tiny5
(`--font-arcade`, latin, ~9KB) for every small line, and Baumans
(`--font-cartridge`, latin, ~19KB) for the wordmark alone. Neither is
render-blocking and nothing above the fold uses either. **Don't add a third
display face here without first moving both into the game's own lazily-loaded
stylesheet** — the justification for keeping them eager is that the CTA renders
them, and that budget is now spent.

**Every block on both sides is the same object.** The CTA's rack, the canvas
bricks and the paddle all render as a square, flat-filled block with a hard
two-tone bevel — lit along the top and left, shadowed along the bottom and
right, drawn light-first so the dark bands own the bottom-left and top-right
corners (the standard pixel-art mitre). The ball and its trail are raw squares.

What this replaced: rounded corners plus a vertical gradient, which read as a
moulded keycap. A flat face with two hard bands reads as a sprite, and the
hardness is the point — **no blur and no gradient anywhere in the block
treatment**, on either side. One soft edge and it stops being pixel art.

Two consequences in `game.ts`:

- `buildGradients()` no longer builds canvas gradients; it resolves three flat
  colours per row (face / lit / dark) plus a bevel width. Flat fills allocate
  nothing, so the only thing still tied to layout is the bevel width. `brickGap`
  became dead when the positional gradients went and was removed.
- **Brick coordinates are rounded at draw time.** A bevel two or three pixels
  wide is exactly the thing a half-pixel offset turns to mush, and the layout
  maths is fractional.

Two invariants inside the game:

- The canvas is painted **above** the veil — it has to be, or the bricks would
  be hidden by the very thing they're clearing. Consequences: panels must be
  fully opaque (any alpha and the brick wall ghosts through the copy), and the
  HUD needs its gradient bezel (past ~50% revealed the real site nav sits
  directly behind the score and meter).
- `Breakout.locked` is set by the shell whenever a panel is up. The canvas
  fills the viewport *behind* those panels, so without it a click anywhere
  outside the intro card launches a game nobody started.

The playfield's top inset is the measured height of the HUD, not a constant —
the HUD reflows to two rows under 40rem. A `ResizeObserver` on the HUD calls
`game.relayout()` for the case where it changes without the canvas changing
(the arcade webfont landing late).

Winning dispatches `breakout:win` on `document` with `{ score, bricks }`. That
is the seam for the celebration easter egg; nothing in the game depends on what
listens. `window.__breakout` is a dev-only handle (`{ game, close }`) — end
states take minutes to reach by playing.

## Dribbble

`src/data/dribbble.ts` and every thumbnail in `src/assets/dribbble/` are
**generated** — run `bun run sync:dribbble` to refresh, don't hand-edit either.
Nothing here happens at build time: the site stays static, deterministic, and
makes no network call to render.

**Do not reach for the API.** Dribbble v2 needs an OAuth token, and a token in a
static build is either committed or it makes the build fail on someone else's
outage. The previous portfolio hardcoded one into `DribbbleImages.astro` and
pushed it to a public repo. The RSS feed would be the polite alternative but
404s now, so the script reads the public profile page instead.

That makes it a scrape, keyed to Dribbble's markup. Two guards stop a markup
change from silently emptying the grid, and **both must survive any edit**:

- `MIN_SHOTS` — refuses to write at all below a floor.
- A per-page check that most shot links resolved into complete records. Links
  present but nothing parsed is precisely what a markup change looks like.

Either one aborts before touching the data file or the images, so a failed run
leaves the last good state intact. Verified by renaming the card class and
confirming nothing was written.

Two details worth knowing:

- **Dribbble serves nothing to a default fetch UA**, and 404s past the last page
  rather than returning an empty one.
- **Filenames are the shot ID** (`26976778.webp`), not a position. Positional
  names meant every file churned whenever the feed reordered. Thumbnails come
  from the CDN pre-converted (`?format=webp&resize=640x480`) — 13KB against
  202KB for the same image as PNG.

## Content

Case studies are MDX in `src/content/work/`, typed by the zod schema in
`src/content.config.ts`. Images are `image()`-typed and live in
`src/assets/work/<slug>/` so Astro's pipeline optimises them; don't put them in
`public/`.

The five published entries are **the real copy**, not placeholders. Treat the
wording as the author's — tighten it only when asked. `tribute-video-editor` is
still a `draft: true` stub.

There are three upstream sources, and they do not agree:

1. `~/Sites/personal` (the `personal-2023` repo) — what the previous site
   shipped. This is what every entry was originally ported from, and it had
   already been cut down.
2. **Adam's Grammarly account** — the longer originals those were cut from. For
   Tribute the gap was almost exactly 2:1 (1,852 words → 933).
3. **Medium** — the oldest drafts, e.g.
   [the Peterson's case study](https://adamrobertson.medium.com/petersons-test-prep-ios-android-mobile-app-case-study-488e8389183d)
   (Jan 2021). Predates launch, so it has framing the later versions dropped
   but no results at all.

**All five entries have now been merged back against their originals** and are
the fullest versions that exist anywhere. Do not shorten them without being
asked; the site's whole editorial history until now was accidental compression.

`tribute-v3` was the one genuine two-way merge — its newer draft added the
Vision principles, the DaisyUI design system, mobile-first, and the expanded
Maze results, while the site version held the audience dashboard, personas, the
payment-timing work, and the false-door failure. Neither source was a superset.

The merge pattern, both times: Grammarly supplies the substance, the site
version supplies the Reflection (Grammarly has none), and only outright errors
get corrected — broken list numbering, `Sass` where `SaaS` was meant,
pre-launch future tense in a retrospective, and meta-sentences like "below, I
have included a case study" that only make sense in an attached document.

Source images are stored as webp, downscaled to 2400px where they were larger.
The exceptions are the wide "contact sheet" captures in `tribute/`, kept at
their native width (up to 7535px) because the lightbox's zoom is the only way
to read the individual screens inside them. Those decode to tens of megapixels
— headless screenshot tools time out on the dev server's on-demand `/_image`
route, which is a dev artifact, not a production one.

**MDX components live in
[`docs/design-system/components.md`](docs/design-system/components.md)** — the
inventory, which need importing, the teardown contract the interactive ones
follow, and the `data-lenis-prevent` requirement. What belongs here is only what
is about the *content*:

The process gallery is discovered **by convention, not frontmatter**:
`src/assets/work/<slug>/…-gallery-<n>.webp`, globbed in `[...slug].astro`.
Sorting is numeric — a lexical sort puts `gallery-10` between `1` and `2`.

### Editorial conventions

Benchmarked against sanvithi.com, jonprinzdesigns.com, mchiu.co.uk and
rachelchen.tech. Four rules came out of that comparison and they are why the
files read the way they do:

- **`title` is a claim, not a product name.** "Doubling submissions on a core
  flow", not "Tribute Recording Flow Redesign". The product name lives in
  `client`, which renders as the eyebrow above the h1 and on the work tile. All
  five titles are kept to roughly 32–42 characters so the index reads evenly.
- **`summary` carries specifics**, ideally numbers — it is the lead paragraph
  under the h1 *and* the meta description, so it should not restate the title.
- **`impact` sits above the body.** Every benchmarked site states outcomes in
  the first screen or two; the metrics band at the foot of the page is behind
  1,500–2,800 words that most readers will not reach.
- **Section headings carry findings, not process labels.** "Where we were
  wrong" beats "User Research (Again)"; "Three things users kept telling us"
  beats "Problem". A generic spine is fine — `Background` and `Reflection` are
  still generic — but the pivotal section in each study should say what
  happened.

The prose is deliberately declarative and short-sentenced. The originals came
back from Grammarly heavily smoothed ("had a significant positive impact not
only on… but also on…"), and that voice was edited out without removing
content. Restore substance freely; do not restore the passive constructions.

### Case study page order

The hero is **text-first on the page surface**, following the same pattern as
the About page (`pt-48 md:pt-56` for the fixed nav, `reveal-heading`), at its own
scale — `clamp(2.125rem, 4.4vw, 3.75rem)`, stepped down from 5rem. A case study
is a reading page and its title is a claim, not a cover: at the old size the
title alone filled most of the first screen before a word of the argument:

> eyebrow (`client · year`) → h1 (`title`) → lead (`summary`) → at-a-glance grid
> → body → metrics → process gallery → next project

The page carries `.page-rails` and every section is on `px-shell`, so its copy
lines up with the nav's wordmark. The hero and the at-a-glance grid carry
blueprint labels ("Cover Story", "The Brief"); the dead-space hatch does not
appear here.

The hero's wash is **`<NoiseGradient intensity="soft" />`, the same component the
homepage and `/about` use** — not a copy of it. A hand-rolled copy drifted: it
was two radials of `--color-accent` and `--color-accent-warm` — the accent
tokens — where the shared wash is a three-blob ramp with its own values. Same
family on paper, visibly different in the frame. `soft` is what keeps the two
from being identical — same palette, smaller blobs held to the corner.

**The `cover` renders only as a watermark.** It was tried twice as an image —
a full-bleed pinned backdrop behind the title, then a full-width band below the
meta — and both put a wall of screenshot between the reader and the first
paragraph. Images belong in the body, beside the passage they illustrate.

What it does now is `.hero-cover`: the same art, `grayscale(1)`, blended at
`mix-blend-mode: luminosity` and 0.16 opacity, masked into the top-right corner
— the slot the skills texture used to fill, with the same mask pair (a diagonal
keeping the bottom-left clean for the title and lead, and a vertical trim
keeping it out from behind the fixed nav).

`luminosity` is the whole trick: hue and saturation come from the hero wash
underneath and only the image's light and shade survive, so a full-colour
product screenshot resolves into the page's own green rather than sitting on it
as a foreign rectangle. Two rules if you retune it: **grayscale first** (or the
source's colour leaks at the blend edges), and **keep it below the threshold
where the UI inside the screenshot becomes legible** — the moment individual
buttons read, it is a picture again rather than a texture. It is `aria-hidden`
(the same art carries a real `alt` on the work index) and hidden below `md`,
where the hero is one narrow column and the diagonal has nowhere to go.

Two consequences worth knowing before adding it back:

- `WorkTile` carries **no `transition:name`**. The tile used to morph into the
  full-bleed hero image; with no counterpart on the case study page, an
  unpaired name animates the tile out on its own. It is a plain cross-fade now.
- The hero's colour comes from `.hero-wash`, a low-alpha radial pair of the
  brand green and warm yellow, plus `.hero-grain` — the same inline-SVG fractal
  noise `<NoiseGradient />` uses, copied rather than imported because that
  component brings its own fixed-palette blobs sized for a full-viewport hero.
  With no cover on the page, the wash is the only thing carrying colour above
  the fold, so keep it.

`.case-back` ("← All work", to `/#work`) is fixed just under the nav and fades
in once the hero scrolls past, via an IntersectionObserver on `[data-case-hero]`
rather than a scroll listener — Lenis-smoothed scrolling fires a lot of frames.
It is `pointer-events: none` until shown so it never sits invisibly over the
hero eating clicks, and `:focus-visible` forces it visible so tabbing into it is
not a dead end. It deliberately lives on this page rather than in `Nav.astro`,
which is `transition:persist` and shared by every route.

It sits on the `[data-blueprint]` rail (`--spacing-gutter` + their `0.6rem`
nudge), so its edge lines up with the "NAVBAR" caption — not on `--spacing-shell`
like body content.

It also **follows the nav's retract**. `nav.ts` publishes `data-nav-state`, and
because `<Nav>` renders immediately before `<main>` in BaseLayout, plain CSS can
reach it:

```css
:global([data-nav][data-nav-state='hidden']) ~ :global(main) .case-back {
  --back-shift: -3.4rem;
}
```

The offset is a custom property folded into `translateY`, never a `top`
override — it has to compose with the enter transform, and every state that
sets `transform` (`.is-visible`, `:focus-visible`, the reduced-motion block)
must keep `var(--back-shift)` in it. Writing `transform: none` in any of them
drops the link back under the hidden header.

Both positions derive from one measured number. The script publishes the nav's
height as `--nav-h` (via a ResizeObserver — the wordmark steps up a size at
`sm`, changing the header height), and the CSS is `top: calc(var(--nav-h) +
var(--back-gap))` with `--back-shift: calc(-1 * var(--nav-h))`. That makes the
gap above the link identical in both states: below the nav while it shows,
below the viewport edge once it retracts. Don't hardcode either value back to a
literal — they will drift apart.

The metrics band and `<Gallery>` must keep the same wrapper shape
(`mx-auto max-w-6xl px-gutter` on an inner div, padding *inside* the max-width).
With the padding outside, the two bands sit on different rails and the stats
read as shifted against the thumbnails. Metric cells are also centre-aligned,
unlike the left-aligned meta grid: four equal columns of left-aligned text leave
slack at the end of the last column, so the block's ink sits left of its own box
however well the box itself is centred.

### Skills

`skills` in frontmatter is drawn from the résumé's own taxonomy (Product &
Design Leadership / Frontend & Systems / Analytics & Growth / Tools &
Platforms), extended with whatever the case study itself evidences. Matching the
résumé wording is the point — these are the terms a recruiter searches for.

**Nothing renders them.** They used to set the hero's background texture — the
list repeated as long lines of display-size uppercase, masked into the top-right
corner behind the title. That is gone: a case study is already a text-heavy page
and a second field of text behind the first was noise, however low the opacity.

The field stays in the schema and in the five entries because the taxonomy is
real and the words are the ones a recruiter searches for. If they should ever
count for SEO, add them back as **real content** — a visible list, in the
document — rather than reviving a decorative layer. The texture was
`aria-hidden` and invisible to search anyway, so it never bought that.
