# Tokens

Tailwind v4 is CSS-first. **There is no `tailwind.config.js`** — the `@theme`
block in `src/styles/global.css` *is* the config. Every key there becomes a
utility (`--color-ink` → `text-ink`, `--text-display` → `text-display`,
`--spacing-gutter` → `px-gutter`) and is also readable as a plain custom
property inside a component's scoped `<style>`.

Prefer the utility in markup and `var(--token)` in scoped CSS. Never a literal.

## Colour

Dark is the only mode. Colour comes from the accents and the hero wash, not from
the page.

| Token | Value | Notes |
| --- | --- | --- |
| `--color-ink` | `oklch(0.97 0.005 150)` | Headings, display narrative, `<dd>` values |
| `--color-ink-lead` | `oklch(1 0 0 / 0.82)` | Lead paragraphs — 12.2:1 |
| `--color-ink-dim` | `oklch(0.72 0.012 160)` | 7.9:1 on surface |
| `--color-ink-faint` | `oklch(0.6 0.014 160)` | **5.0:1 — do not darken below L=0.58** |
| `--color-surface` | `oklch(0.16 0.004 240)` | The page |
| `--color-surface-lift` | `oklch(0.21 0.006 240)` | Raised fills |
| `--color-line` | `oklch(1 0 0 / 0.14)` | Every hairline |
| `--color-accent` | `oklch(0.76 0.14 22)` | Brand coral, 8.5:1 |
| `--color-accent-warm` | `oklch(0.83 0.1 50)` | Gradient tails only, never body text |
| `--color-status` | `oklch(0.8 0.11 26)` | Availability, 10:1 |

Five rules, each of which cost something to learn:

**Every accent stop must be inside sRGB.** An earlier `--color-accent` was
`oklch(0.84 0.19 168)`, whose red channel resolves to **-0.065** — the browser
clamps it to zero and paints `#00f0b2`, the most saturated green-cyan the display
can make, not the colour written down. Before changing any stop, check it
converts without a negative channel. Chroma past the gamut edge is not more
vibrant — it is clipped, and it clips inconsistently across hues, which is
exactly how a palette drifts out of family.

**On warm hues, lower the lightness to gain chroma.** This is the whole tuning
story of the current accent and the single most useful thing on this page.
sRGB's warm quadrant is its *smallest*, because the red channel saturates at 255
long before the other two run out — so the ceiling falls steeply as lightness
rises. Measured at H 22: **C 0.155 at L 0.74, C 0.125 at L 0.78, C 0.10 at
L 0.82.** The green accent this replaced held C 0.15 at L 0.80 without trying.
Coral cannot, so the lightness came *down* to 0.76 to buy the chroma back.
Raising L and holding C ships a pale salmon, or clips.

That is also why the gradient stops do **not** share one chroma the way the old
green ramp's did — each sits at its own ceiling. Flattening them either clips the
dark end or beiges the light end.

**The accent follows the hero wash, not the other way round.** It is tuned to
`<NoiseGradient>`'s `sunset` coral band, and `--color-accent-warm` to its peach
highlight, so a gradient tail resolves into a colour already present behind it.
**Changing the default variant means moving these three tokens with it** — the
last brand palette left a lone green dot and a green chip on a coral wash, which
reads as an oversight rather than as an accent.

**`--color-accent-warm` is only 28° away.** That is tight, but it is the entire
range the gradients have. Don't push the accent warmer without moving the warm
token too, or both ramps flatten into one colour.

**`--color-status` gives up green-means-go**, knowingly. The label beside it
reads "Available for work", so the words carry the meaning and the dot only has
to look lit. If the signal ever has to be unmistakable *without* its label, that
is the argument for taking green back — not aesthetics.

**Paragraph copy has exactly two roles, and they are set by size.**

| Where | Token |
| --- | --- |
| Paragraphs set **larger** than `--text-body` (>18px) | `--color-ink-lead` |
| Paragraphs at `--text-body` **or smaller** | `--color-ink-dim` |
| Micro labels (`--text-micro`, uppercase) | `--color-ink-faint` |
| Display narrative — the story beats, the impact beats — and `<dd>` values | `--color-ink` |

`--color-ink-lead` is **neutral white with alpha, not a tinted grey**:
`--color-ink-dim` sits at hue 160 with a little chroma, which is invisible at
body size and reads as a faint green cast once the type is big. That is why lead
copy cannot simply reuse it.

Before this token existed, large paragraphs were split four ways —
`text-white/90` on the homepage hero and the Leadership blurb, `text-white/70` on
the About intro and the case study lead, `text-ink` on the About body copy, and
`text-ink-dim` elsewhere — so two adjacent sections could disagree. **`bun run
check:tokens` now fails on any `text-white/N`** outside `Dribbble.astro`, where a
caption sits over a thumbnail and neither surface token applies.

One consequence worth knowing: **size and role have to agree.** Two paragraphs at
the same size in different colours is exactly the drift this prevents, so a lead
must actually be set above `--text-body`. The About intro was a lead coloured at
body size; it moved up to the homepage lead's clamp rather than being recoloured
down.

**`--color-ink-faint` is contrast-tuned.** It is used almost entirely at 12px,
where WCAG AA wants 4.5:1. Every ratio in the table above is what
`bun run check:tokens` computes — if you change a colour, re-run it rather than
editing the number here.

**One accent palette, site-wide.** Case studies used to carry a per-entry hue in
frontmatter (Tribute teal, Peterson's green, V3 amber). That is gone: the brand
coral/peach is the only accent anywhere, so the pages doing the most persuading
are the ones wearing the brand. Don't reintroduce a per-page hue without a reason
that survives seeing all five studies side by side.

## Type

**Google Sans** for all UI, body copy and the wordmark. **Vidaloka** for display
(`--text-display`, `--text-title`, `--text-stat`, headings). Two families, no
third.

| Token | Value | At 1440 |
| --- | --- | --- |
| `--text-display` | `clamp(2.125rem, 5.6vw, 5rem)` / lh 1.04 | 80px |
| `--text-title` | `clamp(1.875rem, 4.2vw, 3.75rem)` / lh 0.98 | 60px |
| `--text-stat` | `clamp(2rem, 3.4vw, 3rem)` / lh 1 | 48px |
| `--text-lead` | `clamp(1.25rem, 2.2vw, 1.875rem)` / lh 1.35 | 30px |
| `--text-body` | `clamp(1rem, 1.1vw, 1.125rem)` / lh 1.6 | 16px |
| `--text-micro` | `0.75rem` / tracking 0.08em | 12px |

**The three display steps are one ladder and they move together.** 80 / 60 / 48
at 1440 is a ~1.33 ratio, and it is what tells the homepage hero, a section
heading and a stat figure apart by *step* rather than by sheer size. Retune one
in isolation and the next one up starts competing with it — dropping the display
alone once left `--text-title` a single pixel behind the h1 it sits under.

The ladder was cut roughly 30% from where it started (`--text-display` capped at
`8.25rem`, `8vw`). At that size the homepage h1 ran two lines of ~115px and took
a third of the viewport before the argument began; the stats, the lead and the
rule at the foot all read as afterthoughts attached to a poster. Benchmarked
against cloudflare.com, whose h1 measures 72px at the same viewport.

`--text-display` is the homepage hero's alone. `/about` and the case studies
each set their own hero size inline, deliberately — see
[patterns.md](patterns.md).

- **Vidaloka ships a single weight.** Set it at `font-normal`, never
  `font-bold`. Where a heading needs more heft, thicken it with the text-stroke
  helper. Its descenders are long, so `--text-display` needs a line-height near
  1; tightening further crowds the line below.
- **Google Sans runs wider** than a neutral grotesque at the same size. After any
  type-size change, check the tight cells first — the at-a-glance grid, the
  persona traits, the funnel step captions — since those wrap before anything
  else.
- `--font-wordmark` resolves to `var(--font-sans)` and is kept separate
  deliberately: the brand mark should be changeable without dragging every
  paragraph with it.
- `--font-arcade` (Tiny5) is Breakout's alone. It is eagerly loaded because the
  CTA uses it; nothing above the fold does.

**The documented exception**: the work tile title in `WorkTile.astro` is sans. A
tile title is a claim read at a glance beside a screenshot, and the serif was
doing section-heading work in a caption's slot. The switch carried three
adjustments — size ceiling `2rem → 1.75rem` (Google Sans is wider), `font-medium`
for the weight the serif got from contrast, leading `1.1 → 1.15` (the serif's
descenders were what allowed the tighter setting). Follow that pattern if it ever
comes up again. The case study `h1` stays Vidaloka: the tile and the page are the
same words in different roles, and only the tile is a caption.

## Shared paint

Not tokens — composed values built *from* tokens, declared in `:root` below the
`@theme` block because none of them should generate a utility. They exist so
that more than one place can paint the same thing without two copies drifting
apart.

| Value | Used by |
| --- | --- |
| `--hatch`, `--hatch-line`, `--hatch-fill` | dead-space bands, the work tile placeholder |
| `--dots`, `--dot-ink`, `--dot-pitch` | the substrate under `.page-rails` |
| `--rule-dash` | the two page rails, and nothing else |
| `--gradient-accent` | `.accent-gradient` — long runs |
| `--gradient-accent-compact` | `.stat-gradient`, `--vcd-fill` — four or five glyphs |

**Dots and hatch are not interchangeable.** The dot field is the paper — it says
*this surface continues past the edge of the page*, and it runs under everything
inside `.page-rails`. The hatch says *deliberately empty*, and it only ever
appears inside the frame, in a band a grid could have filled and didn't. Keep the
two jobs separate or both stop meaning anything.

`--dot-pitch` (12px) is the tuning knob, not the dot radius: below ~10px the
field turns into flat noise at reading distance, above ~16px the individual dots
start reading as content. `--dot-ink` is held *under* `--color-line` — the frame
has to stay louder than the paper it is drawn on.

**Dashed is the outer frame; solid is everything inside it.** `--rule-dash`
belongs to the two page rails. Section rules, grid dividers and card borders all
stay solid `--color-line`. That split is the only thing stopping a page of
hairlines from reading as one flat mesh: a dashed rail says "margin of the
drawing", a solid rule says "this divides two real things".

## Breakpoints

Tailwind's defaults, and **not redeclared** — they are listed here because
scoped component CSS has to write them as literals (a custom property cannot be
used in a media query).

| Name | Width |
| --- | --- |
| `sm` | `40rem` |
| `md` | `48rem` |
| `lg` | `64rem` |
| `xl` | `80rem` |

Use one of those and nothing else; `bun run check:tokens` fails on any other
width. Page-level layouts switch at `sm`/`lg`. **MDX components switch at `md`**,
because they live inside a 48rem prose column and hit their own limits well
before the page does — that is a real difference, not an inconsistency.

## Spacing

| Token | Value | Use |
| --- | --- | --- |
| `--spacing-gutter` | `clamp(1.5rem, 4.6vw, 5rem)` | Where the vertical rails sit |
| `--spacing-shell-pad` | `clamp(1rem, 2.2vw, 2.5rem)` | Breathing room inside the rails |
| `--spacing-shell` | `gutter + shell-pad` | Content inset on framed pages |
| `--spacing-section` | `clamp(4rem, 10vw, 10rem)` | Vertical section padding |
| `--spacing-cell` | `clamp(1.5rem, 3.4vw, 3rem)` | Inset inside a ruled cell |

`px-shell` is the content inset; `px-gutter` puts an element *on* the rail.
Grids that pull back out to the rails use `-mx-shell-pad` while their text stays
padded with `px-shell-pad` — that pair is what keeps rules rail-to-rail and copy
off them.

## Radius

**There is one radius, `--radius-ui`, and it is 3px.** Set it to `0` and the site
goes fully square: the entire Tailwind `rounded-*` scale is remapped onto it, so
`rounded-md`/`lg`/`xl`/`2xl` already in markup resolve there and no component
needs touching.

It exists because the site is a drafting frame, and a 12px corner on a work tile
sits inside that frame arguing with it. 3px is enough to stop a corner reading as
a printing error and not enough to read as soft.

Three things opt out, and should stay out:

- **Circles and pills** — status dot, cursor, nav and gallery buttons, persona
  signal chips, the white CTA. Those are shapes, not softened rectangles.
- **Depictions** — `Device`'s phone bezel, the leadership-moment illustrations.
  A phone has round corners; square them and it stops being a phone.
- **Breakout** — its own aesthetic, deliberately hard-edged.

## Motion

| Token | Value |
| --- | --- |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--ease-in-out-quart` | `cubic-bezier(0.76, 0, 0.24, 1)` |
| `--dur-fast` | `250ms` |
| `--dur-base` | `600ms` |
| `--dur-slow` | `1100ms` |

Shared between CSS and GSAP so the two never disagree. See [motion.md](motion.md).

## Runtime values

Not design tokens — measurements published by scripts, for layouts that have to
subtract them.

- **`--nav-h`** — the nav's measured height, published on the root by `nav.ts`
  via a ResizeObserver. The home hero is
  `min-h-[calc(100svh-var(--nav-h,4.3125rem))]` so the nav band and hero together
  fill exactly one viewport. Keep the CSS fallback: `initNav` runs in reduced
  motion, but not with JS off.
