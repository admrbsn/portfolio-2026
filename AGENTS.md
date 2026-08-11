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
  are tuned to `<NoiseGradient>`'s default `teal` variant. Changing that
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

**The section takes the Atari cartridge label's *composition*, and nothing of
its object.** It went through the orange box and then a bordered black panel
before landing here, and both intermediate steps failed the same way: a hard
edge across the page turns the section into an object sitting on the site rather
than part of it, and caps the whole thing at a width the rack and the figure
were both fighting. What survives is the layout — masthead, then a numeral block
and a spec block either side of the illustration — spread across `min(76rem,
100%)` with no frame at all.

**Height is the thing to watch here, not width.** Unboxed and full-width the
section grew to ~1250px, which is a screen and a half of one CTA. It is ~850px
now, and the reduction came from six places at once rather than one: section
padding, container width, wordmark cap, the art panel's ratio (16:10 → 16:9),
the numeral, and every vertical margin in the stack. The art panel is the single
biggest term — its height is `width ÷ ratio`, so narrowing the container shortens
it twice over. Trim there first if it grows again.

The wordmark is Baumans in the cartridge's own yellow (`#fffe00`, sampled) over
a hard offset shadow in a **darker yellow**, never black: black behind yellow
reads as an outline, where a darker tint of the ink reads as the mark sitting
slightly off the label. The shadow offset is in `em` — the wordmark clamps
across a 2.4x range, and a fixed 4px offset that reads as print at 104px reads
as a smear at 44px. This file's whole palette is literals by design;
`check:tokens` allow-lists the component for that reason.

**What is deliberately not borrowed is the branding.** The Atari fuji, the ATARI
wordmark and the CX2622 part number are a real company's marks, and stamping
them on a personal site is impersonation rather than homage. The composition is
the reference, not the identity; the colophon strip names this site instead.

**There is deliberately no background wash on this section**, and that is the
end of a long argument rather than an oversight. Four builds were tried and all
four cut: a four-field glow when the rack still sat loose on the page, a
violet/red pair, a red/yellow pair, and a warm orange/gold pair with the hues
pre-mixed toward white. The last one was the closest and still went.

The reason is worth keeping because it is not obvious. **A colour at the alpha
this section can afford is a dark version of itself, and dark warm is brown.**
`#ffd83d` at 15% over `#0a0a09` composites to `#2f2911` — olive, full stop. No
amount of alpha tuning fixes it because the problem is luminance, not hue;
mixing toward white first helps and does not solve it. Red fails worst, being
furthest down the luminance scale, which is why it only ever appears in the rack
at full strength.

What the section actually wanted was **texture, not colour** — the CRT layer
below. If a wash is ever proposed here again, that is the counter-proposal.

The rack still needs something darker behind it, but that requirement was never
a frame and is not a wash either: it is a soft radial on `.art` with no edge,
which is contrast and nothing more.

**`.crt` sits over everything**, at `z-20` above `.cart__inner` — scanlines plus
one slow refresh roll. Over the content rather than behind it is the entire
point: a screen effect that only touches the background is wallpaper, where over
the rack, the figure and the type it reads as all of them being on the same tube.
`pointer-events: none` keeps the coin slot clickable through it.

**The scanline pitch is 3px and that is not arbitrary.** At 2px the pattern beats
against the display grid and moirés on any fractional zoom; at 4px and up it
stops reading as a raster and starts reading as stripes. Alpha is far below where
it looks right in isolation, because it crosses the wordmark and the pixel
subheads and anything heavier costs their legibility for a texture nobody should
consciously notice. No blend mode: `multiply` over a near-black section does
nothing, `overlay` lifts the blacks to grey.

**Two roll bands and nine tracking lines**, all on unrelated clocks. The bands
are `.crt::before` / `.crt::after` — one wide and slow (9s), one narrow and
faster (13.7s), and the durations sharing no factor is the entire reason there
are two: a single band is an event, where two drifting in and out of phase is
what an unlocked vertical hold actually looks like. Give the second a round
multiple of the first and the pair beats on a fixed cycle, which reads as a loop.
Both live on pseudo-elements so the raster stays still underneath; animating
`.crt` itself would drag the scanlines along. **Each band's `translateY` end is
tied to its own height** — 357% ≈ 100/28 and 833% ≈ 100/12 — so changing one
means changing the other.

The tracking lines (`TICKS`) are seeded from the same LCG as the rack, and
**their draws must stay below the wall's**: appending is safe, inserting re-rolls
every brick gap and churn delay. They vary on four axes rather than one, because
the thing being imitated is a *fault*, and a uniform fault reads as a design.
A minority are dark rather than bright — a real dropout eats signal as often as
it adds it, and a screen of only bright lines reads as sparkle. Delays are
negative so the set is already mid-sweep on the first frame; arriving at a blank
tube that starts misbehaving once you look at it is the tell.

They are **small absolutely-positioned strips, not full-height layers.** The
obvious build is one section-sized layer per line with the hairline drawn inside,
which is what the roll bands do — but nine of those is nine composited surfaces
at roughly 1300×730, and an animated transform promotes each. Travel is `120vh`,
deliberately longer than the section, so every line spends part of its cycle off
the bottom before wrapping: they come and go instead of orbiting.

**Everything that moves here sits at about a quarter of where it started**, over
three passes down, and the ceiling on a moving line really is that much lower
than on a static one. Motion is what the eye picks out, so a sweeping hairline at
an alpha that would be invisible standing still is perfectly legible travelling —
and anything bright enough to read as a line at rest reads as a *scratch* in
motion. Judge these in the browser, never from the number: the ticks are solid
strips where `RASTER` is a duty-cycled pattern, so their alpha ranges are not
comparable even though both are "the lines".

Reduced motion drops both bands and all nine lines and keeps the scanlines — the
raster is composition, the rest is only motion, and a *frozen* hairline across
the wordmark reads as a rendering fault, which is the one way this effect can
genuinely mislead someone.

**`RASTER` fixes an asymmetry in the scanlines themselves.** `.crt`'s lines are
*dark*, so they only register over something lit — the figure, the rack, the
type. The empty two-thirds of the section stayed perfectly flat, which made the
tube look like it was only switched on where the content was. `RASTER` is the
inverse: nine static patches of faint *light* lines, seeded and sparse, so the
black carries some raster too.

Their positions are whole multiples of 3px to match `.crt`'s pitch — a patch off
that grid reads as a second raster laid over the first — and they are offset one
pixel inside it so the light lines fall in the gaps between the dark ones rather
than cancelling them. The horizontal mask is what makes them spots rather than
rectangles; no vertical fade is needed, because a patch's top and bottom land
exactly on a line boundary and the raster feathers itself.

**Alpha here has to be read against the duty cycle.** The pattern lights one
pixel in three, so a patch's average brightness is roughly alpha/3 — a first pass
at 0.022–0.05 worked out to 0.007–0.017 and was invisible on any display not in a
dark room. The current 0.05–0.105 lands around 0.02 average. They are static on
purpose: nine sweeping lines already carry the motion, and nine more animated
layers would be cost for nothing.

**The masthead and the button overlap the figure, and that overlap is scoped to
`md` and up.** From `md` the band's first row is the illustration, so a negative
`margin-top` slides his head up behind the subheads (~13px — at 48 his hair
crossed the middle of "GAME PROGRAM" and took `ME PRO` with it; an illustration
may graze a descender, not eat a word), and a negative margin on `.play` lifts
the coin slot to where he actually stops, since the panel's masked bottom leaves
~95px of dead space under him. **Below `md` the band is one column and both
margins land between different things entirely** — the same values drove `66`
through "GAME PROGRAM" and buried "Clear all 66 to win" behind the faceplate. Any
spacing tuned against the figure has to be scoped to the layout that puts the
figure there.

Paint order settles who is in front for free: the figure is `position: absolute`
inside a stacking context and `.play` is `position: relative`, so both land in
step 8 above the in-flow subhead text — the figure passes in *front* of the
masthead, and the button in front of the figure. That is the right way round
both times: the masthead is a label on the scene rather than a caption above it,
and a launch button occluded by an illustration is a usability problem.

`ROW_COLOURS` is still published onto the section as `--row-0..5` in the
frontmatter — `--box-ramp` and `--box-shade` are built from it, so the wordmark
and the count are lit by the same ink the rack is painted with.

**The wordmark and the count share one ramp**, `--box-ramp`: `--row-2` into
`--row-1`, the rack's yellow row into its orange one, so both marks are lit by
two of the bricks below them rather than by a colour invented beside them. Held
at 34% rather than an even 50/50 — a linear ramp lands mid-orange across the cap
height and the mark stops reading as yellow at all. It is one custom property
precisely because two copies drifting apart is the kind of thing nobody notices
until the two blocks are side by side.

**Anything using it must set the background on the children too**, not just the
block: a clipped background paints against the element's own box, so a
block-level child with a transparent fill has nothing to fill it with and comes
out hollow. `.count, .count > *` and `.wordmark .tm` both exist for that, and it
is the same trap `.accent-gradient > *` handles in `global.css`. The consequence
is that each part gets its own full ramp rather than one spanning the group,
which is the right way round for the count — a single ramp over the whole block
would land the caption entirely in orange, and it is small enough to need the
yellow end.

The count deliberately takes **no `drop-shadow`**. At 3.5rem the offset reads as
print register; at the caption's 15px it is mud.

**The gradient forces `drop-shadow` over `text-shadow`.** Clipping a gradient to
text means
`-webkit-text-fill-color: transparent`, and a text-shadow paints *behind* the
glyph, so it shows straight through the transparent fill as a smear.
`drop-shadow` works on the composited alpha instead, and at 0 blur it is still
the hard printed offset. Two consequences: the ™ needs its own solid fill (a
clipped background paints against the *parent's* box, so an inline child
inherits the transparent fill and nothing to fill it with — the same trap
`.accent-gradient > *` works around in `global.css`), and the shadow colour is a
dark tint of the ramp's **warm** end, because it sits under the bottom of the
letterforms where the ramp has already reached orange.

The figure's crop is now a **mask**, not an edge. With no window to be cut off
by, a hard line across his shins read as a mistake; fading him out reads as
emerging from the dark, which is the story the veil in the game tells anyway.
Only the bottom 18% is touched and the rack finishes above 60%, so no brick is
ever caught by it.

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

The rally lives **inside the playfield**, not loose in the section — the box art
has no ball flying across it, and confined there it is doing the thing it was
always for, in the only place a ball belongs. It is ordered before the player so
it passes behind him; over his face it reads as a blemish rather than as depth.

The **coin cursor** (`Cursor.svelte`) moved with everything else: a 16×16 pixel
map in seven tones rather than 14×14 in four, and an eight-frame flip rather
than four. Both extra halves are the same trick — the added tones are all
*intermediates* so the gold ramps into the face instead of stepping into it, and
the added frames sit close enough together that the eye reads rotation instead
of stutter. It is still pixel-snapped, still `crispEdges`, still `steps(1, end)`:
**16-bit is a bigger palette, not a blurrier one.** Sixteen frames would stop
being a sprite sheet and may as well be a transition.

Two deliberate eager font costs, both for this one below-the-fold section: Tiny5
(`--font-arcade`, latin, ~9KB) for every small line, and Baumans
(`--font-cartridge`, latin, ~19KB) for the wordmark alone. Neither is
render-blocking and nothing above the fold uses either. **Don't add a third
display face here without first moving both into the game's own lazily-loaded
stylesheet** — the justification for keeping them eager is that the CTA renders
them, and that budget is now spent.

**Every block on both sides is the same object, and the whole section is now
16-bit rather than 8-bit.** The CTA's rack, the canvas bricks and the paddle all
render as a vertical ramp across the face, a bright one-pixel rim along the top,
a dark one along the bottom, and a two-pixel corner radius.

This reverses an earlier decision, and the reversal is the point worth keeping:
these used to be flat faces with hard two-pixel bevel bands, drawn light-first
so the dark bands owned the standard pixel-art mitre — a 2600 sprite, on the
argument that **no blur and no gradient anywhere** is what stops pixel art
becoming skeuomorphism. That argument was right for the era it was making. The
section moved eras, so both sides moved together — softening only the decoration
would have made the preview a lie about the game it opens. **That coupling is
the durable rule**: change one and change the other in the same commit.

Three things carry the new treatment, and dropping any one lands in flat-vector
territory rather than in either era:

- the **ramp** stays inside the hue (mixed toward white and black, never a
  second hue), or the rack stops reading as six rows of one material;
- the **rim lines** are one device pixel and opaque — at two they are a bevel
  band again;
- the **radius** is two pixels. Past three the rack reads as rounded UI chips.

The coin button's press is still stepped: a coin mech has no in-between state
whatever the era.

**The CTA's rally ball is round and lit; the canvas ball is still a square, and
that split is deliberate.** The bricks are bound by the same-object rule above —
the CTA rack previews the real rack, so both had to move together. The ball is
not: the rally is decoration, and the canvas ball is documented separately as a
raw block, "as the 1976 cabinet drew it". If the square ever reads as a leftover
on clicking play, matching it is a two-line change in `drawBall()` — but do it
because they look wrong in sequence, not because the bricks set a precedent.

The CTA ball's highlight is offset (`at 34% 30%`), which is the same light the
bricks' top rim implies. A centred radial reads as a glowing dot rather than as
a lit sphere. The trail dots inherit the whole treatment and only shrink and
fade, so the tail is the same object at distance rather than a simpler one.

Three consequences in `game.ts`:

- `buildGradients()` builds canvas gradients again — **one per row, not one per
  brick.** Canvas gradients live in user space and every brick in a row shares a
  `y` and a height, so one gradient at layout serves all eleven, and 66
  `createLinearGradient` calls a frame become six a resize. The paddle is the
  exception: it moves, so its gradient is rebuilt per frame, which is one call
  and not sixty-six.
- The brick gap is held on the instance (`this.gap`) rather than being a local
  in `layout()`. `buildGradients` needs the same value to place each row's
  gradient, and two copies of that expression drifting apart would offset every
  ramp by a pixel or two per row.
- **Brick coordinates are still rounded at draw time**, and the rim lines are
  inset past the radius so neither runs into a rounded corner and leaves a stray
  pixel outside the fill.

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
