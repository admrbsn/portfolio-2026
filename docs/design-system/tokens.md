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
| `--color-ink` | `oklch(0.97 0.005 280)` | Headings, display narrative, `<dd>` values |
| `--color-ink-lead` | `oklch(1 0 0 / 0.82)` | Lead paragraphs — 12.2:1 |
| `--color-ink-dim` | `oklch(0.72 0.012 280)` | 7.8:1 on surface |
| `--color-ink-faint` | `oklch(0.61 0.014 280)` | **5.1:1 — do not darken below L=0.58** |
| `--color-surface` | `oklch(0.16 0.004 240)` | The page |
| `--color-surface-lift` | `oklch(0.21 0.006 240)` | Raised fills |
| `--color-line` | `oklch(1 0 0 / 0.14)` | Every hairline |
| `--color-accent` | `oklch(0.7 0.15 258)` | Brand blue, 7.2:1 |
| `--color-accent-warm` | `oklch(0.76 0.15 305)` | Purple — gradient tails only, never body text |
| `--color-status` | `oklch(0.84 0.14 140)` | Availability, 12.4:1 — **green on purpose** |

Rules, each of which cost something to learn:

**Every accent stop must be inside sRGB.** An earlier `--color-accent` was
`oklch(0.84 0.19 168)`, whose red channel resolves to **-0.065** — the browser
clamps it to zero and paints `#00f0b2`, the most saturated green-cyan the display
can make, not the colour written down. Before changing any stop, check it
converts without a negative channel. Chroma past the gamut edge is not more
vibrant — it is clipped, and it clips inconsistently across hues, which is
exactly how a palette drifts out of family.

**The accent follows the hero wash, not the other way round.** It is tuned to
`<NoiseGradient>`'s default `iris` variant — bright blue highlight, deep purple
body — so the accent sits on the highlight (H 258 against H 252) and the warm
token on the body (H 305 against H 300), and a gradient tail resolves into a
colour already present behind it. **Changing the default variant means moving
the accent tokens with it**, or the page ends up with an orphaned hue, which
reads as an oversight rather than as an accent.

**Blues have far less headroom than greens.** The family has been green
(`oklch(0.8 0.15 138)`), out to coral and back, and is now blue/purple. The green
held C 0.15 at L 0.80 without trying; at H 250–260, C 0.15 clips above L ≈ 0.72,
which is why the accent is darker than the green was and its contrast dropped
from 10.9:1 to 7.2:1 — still well clear of AA. Purple has more room than blue,
which is why the ramps rise in lightness toward the purple end. Warm hues are
tightest of all — **at H 22: C 0.155 at L 0.74, C 0.125 at L 0.78, C 0.10 at
L 0.82.** Whatever the hue, **lower the lightness to buy chroma back**; raising L
and holding C clips.

**`--color-accent-warm` is 47° from the accent.** The name dates from the yellow
end of the old ramps; the role — the far end of every gradient — is unchanged.
Much closer and the ramps flatten into one colour; much further and a two-word
phrase reads as a rainbow swipe.

**`--color-status` stays green-means-go.** It is the one colour outside the
accent family, deliberately: the dot needs no reading at all when it is green,
and it is small enough that it never competes with the brand. It was briefly
spent on family coherence while the palette was coral, and that was the worse
end of the trade.

**Paragraph copy has exactly two roles, and they are set by size.**

| Where | Token |
| --- | --- |
| Paragraphs set **larger** than `--text-body` (>18px) | `--color-ink-lead` |
| Paragraphs at `--text-body` **or smaller** | `--color-ink-dim` |
| Micro labels (`--text-micro`, uppercase) | `--color-ink-faint` |
| Display narrative — the story beats, the impact beats — and `<dd>` values | `--color-ink` |

`--color-ink-lead` is **neutral white with alpha, not a tinted grey**:
`--color-ink-dim` sits at hue 280 with a little chroma, which is invisible at
body size and reads as a faint violet cast once the type is big. That is why lead
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
blue/purple is the only accent anywhere, so the pages doing the most persuading
are the ones wearing the brand. Don't reintroduce a per-page hue without a reason
that survives seeing all five studies side by side.

## Type

Four families, and each has exactly one job. The mono and serif come from
alyssa-tucker.com; Syne and Instrument Sans were picked here after Bricolage,
Syne-everywhere and Anybody were all tried and cut:

| Family | Token | Job |
| --- | --- | --- |
| **Syne** (variable, 600) | `--font-display` | Every display heading — hero, section headings, work and case titles, stats |
| **Instrument Sans** (variable, 400–700) | `--font-sans` | All UI, body and the wordmark |
| **JetBrains Mono** (variable) | `--font-mono` | Every small uppercase label: eyebrows, blueprint captions, meta columns, row numbers |
| **Instrument Serif**, italic only | `--font-serif` | Accents — pull quotes, a phrase that should sound spoken. Never a heading, never a paragraph |

The two extra faces further down belong to the Breakout island and appear
nowhere else.

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

- **Syne's width is its weight.** It has no width axis — heavier is wider,
  and by 700–800 it is fully extended. 600 is set once on `.font-display` in
  the base layer (never `font-normal` or a weight in markup); tighten by
  lowering it, since `font-stretch` does nothing. Tracking on the ladder is
  -0.03 to -0.04em because a wide face sets loose.
- **Syne is for headings only.** Set in paragraphs it was tried and cut — its
  regular weight reads rounded and odd at body size. Body is Instrument Sans,
  whose job is to stay quiet beside it.
- **Every uppercase label is mono.** The `uppercase` utility carries
  `--font-mono` with it (base layer, so `font-sans` on the element overrides),
  and any component stylesheet that sets `text-transform: uppercase` sets
  `font-family: var(--font-mono)` beside it. Mono runs wider than the sans
  at the same tracking — check meta columns and narrow cells after edits.
- **Instrument Serif is loaded italic-only** and nothing upright uses it.
  `PullQuote` is its only consumer today.
- `--font-wordmark` resolves to `var(--font-sans)` and is kept separate
  deliberately: the brand mark should be changeable without dragging every
  paragraph with it.
- `--font-arcade` (Tiny5, ~9KB latin) and `--font-cartridge` (Baumans, ~19KB
  latin) are **Breakout's alone** — the small lines and the wordmark of the box
  panel. Both are eagerly loaded because the CTA renders them; nothing above the
  fold uses either, and neither is render-blocking.

  `--font-cartridge` sets **one word at one size**. Baumans is a geometric
  display face standing in for the 1978 Atari box lettering, which is a *drawn*
  logotype rather than a typeface — it is the closest ready-made match, not a
  match. Never set a sentence in it.

  **That budget is now spent.** A third display face here means first moving
  both of these into the game's own lazily-loaded stylesheet, because the only
  thing justifying eager loading is that the CTA itself renders them.

There used to be one documented exception here: the homepage work tile set its
title in sans, because beside a 16/9 screenshot the title was a caption. The
tiles became a text-only index (`WorkRow.astro`), the title is the loudest thing
in the row again, and it is back in the display face at `--text-stat` — one step under
the section's `--text-title` heading. The lesson survives the exception: **a
title's face follows its role in the layout, not the field it comes from.**

## Shared paint

Not tokens — composed values built *from* tokens, declared in `:root` below the
`@theme` block because none of them should generate a utility. They exist so
that more than one place can paint the same thing without two copies drifting
apart.

| Value | Used by |
| --- | --- |
| `--hatch`, `--hatch-line`, `--hatch-fill` | dead-space bands |
| `--dots`, `--dot-ink`, `--dot-pitch`, `--dot-fade` | the substrate under `.page-rails` |
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
start reading as content. `--dot-ink` is held *under* `--color-line`, and
*deliberately* is the operative word — the frame has to stay louder than the
paper it is drawn on, and at the old 0.13 against the rail's 0.14 that margin was
nothing. A field of thousands of marks at the same ink as two lines does not read
as recessive however sparse each mark is. 0.1 puts a clear step between them.

`--dot-fade` takes it the rest of the way: the field is masked to full strength
across the middle of the page and to nothing at the rails, so the paper ends
where the drawing does. See `patterns.md` for why the plateau matters.

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
  signal chips, the white CTA, the work index's row numbers. Those are shapes, not softened rectangles.
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
