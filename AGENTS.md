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

**Type pairing**: **Google Sans** for all UI, body copy and the wordmark;
**Vidaloka** for display (`--text-display`, `--text-title`, `--text-stat`,
headings). Two families, no third.

**One heading is deliberately sans**: the work tile title in `WorkTile.astro`.
A tile title is a claim read at a glance beside a screenshot, and the serif was
doing section-heading work in a caption's slot. The switch carried three
adjustments with it, which is the pattern to follow anywhere else this comes up
— Google Sans runs wider, so the size ceiling drops (2rem → 1.75rem) to keep
long titles off an extra line; `font-medium` replaces the weight Vidaloka got
from its contrast; and the leading opens (1.1 → 1.15), since the serif's long
descenders were what let it be set that tight. The case study `h1` is still
`--text-display` in Vidaloka: the tile and the page it links to are the same
words in different roles, and only the tile is a caption.

Vidaloka ships a **single weight** — set it at `font-normal`, never
`font-bold`. Where a heading needs more heft, thicken it with the text-stroke
helper rather than reaching for a bolder cut that does not exist. Its
descenders are long, so `--text-display` needs a line-height near 1; tightening
further crowds the line below.

Google Sans runs a little wider than a neutral grotesque at the same size. After
any type-size change, check the tight cells first — the at-a-glance grid, the
persona traits, the funnel step captions — since those wrap before anything
else does.

`--font-wordmark` resolves to `var(--font-sans)` and is kept as its own token
deliberately: the brand mark should be changeable without dragging every
paragraph on the site along with it.

Tiny5 (`--font-arcade`) is Breakout's alone and appears nowhere in the portfolio
proper — see the Breakout section for why it is nonetheless eagerly loaded. It
replaced Jersey 20, which ran tall and condensed and needed roughly 1.7x the
size a blocky pixel face would; Tiny5 is squatter and wider, so anything ported
from the old face needs its size taken **down** and its tracking loosened.

`--color-ink-faint` is contrast-tuned: it is used almost entirely at 12px, where
WCAG AA requires 4.5:1. It sits at 4.9:1 on `--color-surface`. Do not darken it
below `L=0.58`. `--color-status` (availability green, 12.6:1) is kept as its own
token so the signal can be retuned independently, but it is deliberately in
`--color-accent`'s family — the dot and the brand mark share a nav, and two
different greens there read as a mistake.

**Every accent stop must be inside sRGB.** `--color-accent` was
`oklch(0.84 0.19 168)`, whose red channel resolves to **-0.065** — the browser
clamps it to zero and paints `#00f0b2`, the most saturated green-cyan the
display can make, not the colour written down. That is what made the green read
electric-mint against a hero wash whose own teal tops out at C 0.12. At these
lightnesses the green-cyan hues fall out of gamut somewhere around C 0.15, so
the whole accent family is held at **C 0.14-0.15**.

Hue took two passes. Fixing the clipping (H 168 → 174) removed the electric
edge but still read minty, because **mint is a light blue-green — the fix for it
is hue, not chroma.** `--color-accent` is now **H 138**, a yellow-green that
leans toward `<NoiseGradient>`'s khaki highlight (H 100) rather than its teal
blob (H 178). That direction was chosen by rendering candidates at H 138/150/162
against the live hero rather than reasoning about it.

`--color-accent-warm` (H 108) is only 30° off the accent as a result. That is
tight but it is the entire range the gradients have — **don't push the accent
warmer without moving the warm token too**, or both ramps flatten into one
colour.

Before changing any of them, check the value converts without a negative
channel. Chroma that "looks more vibrant" past the gamut edge is not more
vibrant — it is clipped, and it clips inconsistently across hues, which is
exactly how a palette drifts out of family.

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

**To animate one in, stack it — don't transition it.** `background-image` is not
an animatable property, so a gradient cannot fade in over solid ink. The footer
email hover (`Footer.astro`) is the pattern: a second copy of the text sits
absolutely over the first carrying `.accent-gradient`, and only its opacity
moves. It is a real `<span aria-hidden="true">` rather than a `::after` with
`content: attr(data-copy)`, because generated content duplicating visible text
gets announced by some screen readers — the button would hand over the address
twice. The two copies stay registered because the overlay inherits every metric
that matters and the host has no padding for `inset: 0` to disagree with.

`[data-dead="top"|"bottom"]` hatches a section's vertical padding — the empty
band a ruled layout leaves between the end of a grid and the next section
boundary. It's a drafting convention: the band reads as deliberately empty
rather than as a gap nobody filled. Painted as `::after` (`[data-blueprint]`
already owns `::before` on the same sections), inset to `--spacing-gutter` so it
runs rail to rail, and `--spacing-section` tall so it always fills the padding
exactly. The rails belong to `.page-rails`' background, so they paint over the
hatch and the frame stays continuous.

It trails a ruled block and nothing else: the principles and leadership-moment
grids on `/about`, and the résumé list on the homepage. Hatching a band *above*
a heading (the `top` variant was tried on "How I work") reads as a lid on the
section rather than as slack left under a grid, so the effect only earns its
place after one.

### The blueprint frame

The rails, the section labels, the intersection squares and the dead-space
hatch are **one system, and it belongs to the two framed pages** — `/` and
`/about`, the only pages carrying `.page-rails`. Case studies are deliberately
outside it: they are reading pages, and a drafting frame around 2,000 words of
prose is decoration fighting the text. That is why the impact grid on a case
study has internal dividers but no squares — it is not a boundary case, it is a
different page type.

Inside the frame, one rule governs the squares: **a grid marks every crossing of
its own rules, or none of them.** A grid that marks its top rule but not its
bottom is what makes the system read as arbitrary — that was the state of the
Capabilities index before it was completed. "Every crossing" means each end of
every internal divider, plus the four corners where the grid's own rules meet
the rails. A rule that ends against nothing gets no square, because nothing
crosses there.

`.bp-rules` + `.bp-sq` draw the squares. Real elements, not pseudo-elements: each needs both a surface fill (to
punch through the rule it sits on) *and* its own 1px border, and one
pseudo-element cannot carry two bordered boxes. The host sets `--sq` and the
positioning context; edge modifiers compose (`bp-sq bp-sq--t bp-sq--l` is a
top-left corner). Squares that only make sense once a grid has columns are
hidden with Tailwind on the element (`hidden lg:block`) rather than a breakpoint
baked into the CSS, because the grids differ per page — the principles grid goes
multi-column at `lg`, Capabilities at `sm`.

The homepage Capabilities index and `/about` share this vocabulary because they
are the same component in two places. **`/about` no longer carries a Toolkit
section** — it duplicated Capabilities almost item for item. The hover treatment
that lived there (item slides right, goes accent, a rule marker slides into the
space it vacated) moved to Capabilities as `.cap-item`.

The nav deliberately has **no `mix-blend-mode`**. Difference blending kept a
monochrome bar legible over any backdrop, but it inverts the green availability
dot to magenta and the accent dot in the wordmark to blue; the scroll-triggered
scrim in `Nav.astro` replaces it.

**The bar has no room for three links on a phone.** At a 390px viewport the
content box is 310px wide (`px-shell` = 40px a side) and the wordmark plus
`Work / About / Connect` measures ~356px, which is what made the links run past
the right rail. Shrinking the type was measured and does not close the gap —
even 13px links still overflow at 360-375px. So each link carries a `mobile`
flag and **Connect is hidden below `sm`**: the footer already sets the same
address at display size and ends every page, so nothing is lost. Two links plus
the mark measure 262px, and the wordmark's mobile size is a clamp
(`clamp(1rem, 4.6vw, 1.125rem)`) that holds 18px on every current phone and only
gives way under ~390px, keeping the bar inside the rails down to 320px. Anything
added to the bar has to be checked against that 310px budget.

`nav.ts` publishes the bar's measured height as **`--nav-h` on the root** (a
ResizeObserver — the wordmark steps up at `sm` and the webfont can land late).
The home hero is `min-h-[calc(100svh-var(--nav-h,4.3125rem))]`, not `min-h-svh`:
the bar is fixed and overlays the hero, so a full-viewport hero puts the rule at
its foot exactly on the fold, where it takes a scroll to reveal. Subtracting the
nav band makes the two together fill one viewport and lands that rule on screen.
Keep the CSS fallback — `initNav` runs in reduced motion, but not with JS off.
(The case study `.case-back` declares its own `--nav-h` locally; that one wins
where it is set and the two agree at 69px.)

## Motion system

All animation lives in `src/lib/motion/`. Effects are declared in markup, never
wired inline:

```astro
<h1 data-anim="reveal-heading">…</h1>
<div data-anim="reveal-batch">…</div>
<section data-anim="pin">…</section>
```

### Leadership-moment graphics

The two illustrations in the "In practice" section of `/about` —
`MomentTribute.astro` and `MomentPetersons.astro` — are **built in code, not
shipped as image exports**. That is what lets them carry `--color-surface` /
`--color-line` / `--color-accent`, keep their numbers as selectable text, and
animate. Don't replace either with a flat asset.

Both drive one effect, `data-anim="moment-reveal"`, which is a kit of four
optional parts, each opted into by an attribute on a descendant:

| attribute | behaviour |
| --- | --- |
| `data-type-pop` | scatter-pops in, random stagger — the background chrome |
| `data-type-rise` | staggered rise — the foreground stack |
| `data-type-target` | typed out character by character |
| `data-count` | counted up to its value, honouring `data-decimals` |
| `data-ring` | `stroke-dashoffset` drawn to a 0-1 fraction |

Tribute uses pop + rise + type; Peterson's uses pop + rise + count + ring. Adding
a third card means picking from the same set, not writing a new effect.

Two things to keep in mind when editing them:

- **`data-ring` requires `pathLength="1"` on the SVG element**, which normalises
  dash maths to a 0-1 fraction. It also rules out a visible dasharray — any
  pattern fine enough to read as dashes turns the draw into marching ants, which
  is why Peterson's flight path is a solid line where the original art was
  dashed.
- **Transform ownership is split by nesting.** GSAP animates `scale`/`y` on the
  popped element, so any CSS idle drift must live on a *parent* — see
  `.moment__node` (CSS drift) wrapping `.moment__node-box` (GSAP). Put both on
  one element and they overwrite each other.

Every size in these components is container-relative but **clamped at both
ends** (`clamp(0.5rem, 1.1cqw, 0.68rem)`). The cells are `container-type:
inline-size`, and unfloored `cqw` drops the small labels to ~3px in a
single-column cell.

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

### The pre-hide list, and the page loader

**Every effect that animates opacity needs its `data-anim` value in the
`html:not(.no-js)` pre-hide rule in `global.css`.** `reveal-heading` was missing
from it, and the symptom is worth recognising: the headline painted at full
opacity with the rest of the hero already hidden, then `revealHeading` split it
and animated the words up from `yPercent: 118`, so the text appeared, vanished
and re-played. Measured at ~1s on a throttled cold load (FCP 528ms, split
1507ms). An effect whose first act is `gsap.set(el, { opacity: 1 })` is telling
you it expects to be in that list.

Behind the fix sits the real wait: nothing can reveal until GSAP has parsed and
`document.fonts.ready` has settled, because SplitText must split against real
metrics. `#page-loader` (the ripple, styled in `global.css`) covers it. Its
contract mirrors the `.no-js` one:

- **Hidden unless `html[data-loading]`.** Only the inline script in
  `BaseLayout.astro` sets that, so a JS-off visit never sees it — and it must
  stay inline in `<head>`, since it has to take effect on the first paint,
  before the motion module is even fetched.
- **Two independent dismissals.** `initMotion` drops the attribute via
  `revealPage` in the lifecycle's `finally` (a thrown effect still reveals the
  page), and the inline script's 4s timeout drops it if the module never arrives
  at all. Both just remove the attribute, so whichever lands first wins.
- **Skipped in reduced motion and on client-side navigation** (`__loaderShown`
  guards the ClientRouter re-running the script). Reduced motion has nothing to
  wait for, and a spinner between two pages of the same site is worse than the
  cross-fade it replaces.

Measured on the built site over Fast 4G / 4x CPU: ripple from first paint at
460ms to 856ms, then a composed hero. Unthrottled it is up for ~30ms, which is
the intent — it only shows when there is genuinely a wait. The trade is that LCP
now lands with the hero rather than with a flash of unanimated type, so **don't
add anything to the dismiss condition that waits on below-the-fold work.**

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

The colour is confined to the wall on purpose. A four-field background glow, a
rainbow title gradient and a rainbow launch button were all tried and cut:
against a rack that is already six saturated hues, more colour behind, above and
below it left nothing quiet enough to read the section by. The heading is plain
white and the button is a brushed-silver coin slot — square corners, hard pixel
bevel, zero blur anywhere in it. One blurred shadow and it stops reading as
8-bit and starts reading as a skeuomorphic button.

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

The one deliberate eager cost is Tiny5 (`--font-arcade`, latin subset, ~9KB),
imported in `global.css` because the CTA itself uses it. It is not
render-blocking and nothing above the fold uses it.

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
