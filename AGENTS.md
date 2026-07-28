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

**There is one accent palette, site-wide.** Case studies used to carry a
per-entry `accent` hue in frontmatter (Tribute teal, Peterson's green, V3
amber), overriding `--color-accent` on the article and `--card-accent` on the
work tile. That is gone: the brand green/yellow is the only accent anywhere, so
the pages doing the most persuading are the ones actually wearing the brand.
Don't reintroduce a per-page hue without a reason that survives seeing all five
studies side by side.

Two gradient text utilities, both green→yellow, both `background-clip: text`
over real text:

- `.accent-gradient` — long runs (headlines, a highlighted word). Its 120deg
  ramp needs width to reach the warm end.
- `.stat-gradient` — stat figures. Same idea, retuned: a stat is four or five
  glyphs, which lands entirely inside `.accent-gradient`'s green and reads as
  flat colour, so this one starts warmer and finishes inside the box. Used by
  `<Stat>` and the case study metrics band.

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

### Hash navigation

Lenis owns the scroll position, so **the browser performs no anchor jump of its
own** on a client-side navigation. `/#work` is handled explicitly in
`bindMotionLifecycle`, in two passes, and both are needed:

1. `astro:after-swap` — `scrollToHash()`, falling back to `resetScroll()` when
   there is no hash. Resetting unconditionally (what it used to do) landed the
   reader at the top of the homepage with `#work` in the URL, looking broken.
2. `settleHash()` after `initMotion()` resolves — re-resolves the same anchor
   once the webfont has landed and effects have claimed their space. The first
   jump is measured against a document that then *grows underneath it*, so a
   target far down the page lands short by however much the content above
   expanded. It skips the correction if `window.scrollY` has moved since,
   because yanking a reader who has started scrolling is worse than being off.

This runs in reduced motion too, where `initMotion` returns early and
`scrollToHash` falls through to native `scrollIntoView`.

`pin` is currently **registered but unused**. Its only consumer was the case
study hero, which was a full-viewport cover image that scaled and faded under
the title; that hero is now text-first (see Content). The effect is kept as
vocabulary rather than deleted — but it is untested against live markup, so
check it before relying on it.

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

The one deliberate eager cost is Jersey 20 (`--font-arcade`, latin subset,
~19KB), imported in `global.css` because the CTA itself uses it. It is not
render-blocking and nothing above the fold uses it.

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

MDX components available inside case studies — `Figure`, `PullQuote`, `Stat`
and `Device` are passed via `<Content components={…} />` in
`src/pages/work/[...slug].astro`, so they need no import; `Gallery`,
`BeforeAfterSlider` and `VibeCodingDiagram` are imported per file.

Two of them own interactive state and therefore follow the same teardown
contract as the motion registry — they bind on `astro:page-load` and unbind on
`astro:before-swap`. `Gallery`'s document-level `keydown` and
`BeforeAfterSlider`'s window-level pointer listeners would otherwise accumulate
against detached DOM on every client-side navigation.

Anything that scrolls inside the page needs `data-lenis-prevent`, or Lenis
swallows the wheel event and scrolls the page instead — this applies to
`Device`'s screen and `Gallery`'s zoom stage. `Gallery` additionally calls
`lenis.stop()` while its dialog is open, because a modal `<dialog>` blocks
interaction behind it but not programmatic scrolling.

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
the About page (`pt-40` for the fixed nav, `text-display` h1, `reveal-heading`):

> eyebrow (`client · year`) → h1 (`title`) → lead (`summary`) → at-a-glance grid
> → body → metrics → process gallery → next project

**The `cover` never renders on the case study page.** It is still required by
the schema and still does real work — the bento tile on the work index, and the
social card — but it is deliberately absent here. It was tried twice: first as
a full-bleed pinned backdrop behind the title, then as a full-width image below
the meta. Both put a wall of screenshot between the reader and the first
paragraph. Images belong in the body, beside the passage they illustrate.

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

They render in exactly one place: `.hero-texture`, the list set as long lines of
display-size uppercase behind the hero type. It is `aria-hidden` and decorative.

**This means the skills are currently invisible to search and to assistive
tech** — a deliberate call, made after a visible tag row under the at-a-glance
grid was tried and cut for clutter. If they ever need to count for SEO, add
them back as real content rather than un-hiding the texture; at these opacities
it is unreadable, and a screen reader would announce the whole list seven times.

**Size, weight and opacity are uniform.** An earlier version varied them per row
from the PRNG and it read as chaos, not texture. The only per-row variable left
is the horizontal offset — enough to stop the repeated list stacking into
visible vertical columns. That, and which skill each row starts on, come from a
seeded PRNG in the page frontmatter, seeded on `entry.id`: a study renders
identically on every build, but no two studies share an arrangement.

Keep the leading tight (`line-height: 1.05`) and the tracking low (`0.04em`).
The first version used caption-scale type with caption tracking and a 3rem gap,
and it read as a floating list rather than a surface.

The texture is confined to the **top-right corner**. Two mask layers,
intersected (`mask-composite: intersect`, with `-webkit-mask-composite:
source-in` alongside):

- `linear-gradient(to bottom left, …)` — the diagonal. Opaque at the top-right,
  gone by the middle on its way to the bottom-left, which is exactly where the
  headline and lead sit.
- `linear-gradient(to bottom, …)` — trims the top edge so rows do not run up
  behind the fixed nav.

Rows are `justify-content: flex-start`, not centred: the mask only reveals the
upper-right, so rows built downward from the top are the ones that count.
