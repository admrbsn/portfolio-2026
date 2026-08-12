# Patterns

Constructions that recur. Each is a recipe plus the reason it is built that way,
because in every case the obvious alternative was tried first and failed.

## The blueprint frame

The rails and the section labels belong to **every page**: `/`, `/about` and the
case studies all carry `.page-rails`. Case studies used to sit outside the frame
on the grounds that a drafting frame around 2,000 words is decoration — but the
rails alone are not the frame, and without them a case study's copy sat on the
gutter line rather than inside it, a full `--spacing-shell-pad` left of the nav's
own wordmark. **`px-shell` (gutter + shell-pad) is what lines content up with
the nav; `px-gutter` puts it on the rail.**

The **dead-space hatch** is still homepage/about only — it trails a ruled block,
and case studies have none.

`.page-rails` paints two **dashed** verticals at `--spacing-gutter` as
backgrounds, over a **dot field** on `::before`, so both sit behind all content.
Contained sections sit flush inside the rails; full-bleed sections paint over
them.

**Layer order is the whole rule.** The rails paint over the dots, the same way
they paint over a `[data-dead]` hatch — the frame stays continuous wherever it
crosses its own paper. That is what `z-index: -1` on the dot layer buys: a
negative-index pseudo-element paints *below* its own element's background. It
needs `.page-rails` to stay out of a stacking context of its own, so don't add
`isolation`, `transform`, `filter` or a positive `z-index` there — the field
drops behind the body and vanishes.

The dots are a pseudo-element rather than a third background layer because they
are **masked** and the rails are not; masks apply per element, not per background
layer.

**The dot field is masked, not flat** (`--dot-fade`): full strength across the
middle of the page, ramping to nothing exactly where the rails are. Flat, it ran
past the rails to the viewport edge, which reads as margin on a wide gutter and
as a *fringe outside the frame* on a phone's 24px one — the paper has to end
where the drawing does. And a flat field is loudest where the page is emptiest,
since texture only competes where nothing else is; ramped, the densest part sits
under the content column, where the type covers most of it.

The 32/68 plateau is not a detail to trim: a two-stop ramp puts full strength on
a single centre line and reads as a soft vertical band rather than as a sheet.
The fade is horizontal only — a field fading down the page would say the sheet
runs out, and it doesn't.

**It is full width, not confined to the outer gutters.** Squeezed into the margin
it reads as a decorative border; running under everything it reads as the sheet
the page is drawn on, and it is what gives the darkest sections (Story, Selected
work) any texture at all. It tiles for free and nothing above it is transparent
enough to interfere — the hero wash and every card cover it completely.

What this replaced: 45° hatch filling the outer gutters *below `lg` only*, and
nothing at all above it. Two textures doing one job, split by a breakpoint, and
neither of them present at desktop where the gutter is widest and emptiest.
Borrowed from cloudflare.com, whose field is the same 12px pitch.

## Dead space

`[data-dead="top"|"bottom"]` hatches a section's vertical padding — the empty
band a ruled layout leaves between the end of a grid and the next boundary. It is
a drafting convention: the band reads as deliberately empty rather than as a gap
nobody filled.

Painted as `::after` (`[data-blueprint]` owns `::before` on the same sections),
inset to `--spacing-gutter` so it runs rail to rail, `--spacing-section` tall so
it fills the padding exactly. The rails belong to `.page-rails`' background, so
they paint over the hatch.

**It trails a ruled block and nothing else** — the principles and
leadership-moment grids on `/about`, the résumé list on the homepage. Hatching a
band *above* a heading (the `top` variant, tried on "How I work") reads as a lid
on the section rather than as slack left under a grid.

## Intersection squares

**Every crossing is marked. Site-wide, not per grid.** Wherever a horizontal
rule meets a vertical one, a square sits on the junction. That covers three
cases, and all three are live:

1. **Section rules crossing the page rails.** Every full-width `border-t` inside
   `.page-rails` on `/`, `/about` and the case studies. Drop
   [`<RuleCross />`](../../src/components/RuleCross.astro) in as the section's
   first child — it renders the pair, offset to the rails rather than to the
   host's own edges.
2. **A grid's own corners**, where its rules meet the rails — the Capabilities
   index marks these itself, since its box edges *are* the rails.
3. **Internal dividers**, at both ends — the principles grid, `PersonaCards`.

The corollary still holds: **a rule that ends against nothing gets no square.**
A divider that stops mid-band because the grid wrapped to two rows is not a
crossing, and marking it is what makes the system read as arbitrary.

Full-bleed rules count too. `PersonaCards`' rules run past the rails to the
viewport edge, so they cross them — each carries its own `<RuleCross />`.

`.bp-rules` + `.bp-sq` draw them. **Real elements, not pseudo-elements**: each
needs a surface fill (to punch through the rule it sits on) *and* its own 1px
border, and one pseudo-element cannot carry two bordered boxes. On these
sections `::before` and `::after` are taken anyway, by `[data-blueprint]` and
`[data-dead]`.

Edge modifiers compose. Two families, and picking the wrong one is the usual
mistake:

| Modifier | Anchors to |
| --- | --- |
| `bp-sq--l` / `bp-sq--r` | the **host's own edge** — right when that edge is the rule |
| `bp-sq--rail-l` / `bp-sq--rail-r` | the **page rail**, `--spacing-gutter` in from the viewport — right for a full-width section |

`--sq` defaults to 7px on `.bp-sq` itself, so a host that only needs squares
does not have to declare it; `.bp-rules` sets it for grids that opt into the
whole vocabulary.

Two traps:

- **Every cell that hosts a square needs `position: relative`.** Miss it and the
  square resolves against the nearest positioned ancestor — usually the grid —
  and silently lands on the grid's outer edge instead of the cell's corner.
- **Gate each square on the breakpoint where its rule actually crosses
  something.** A divider that ends mid-band because the grid wrapped to two rows
  is not a crossing. Squares that only make sense once a grid has columns are
  hidden with Tailwind on the element (`hidden lg:block`) rather than a
  breakpoint baked into the CSS, because grids differ per page.

Consumers: the homepage Capabilities index, `/about`'s principles grid,
`PersonaCards`.

## Full-bleed rules inside a centred column

A horizontal rule that must reach the viewport from inside a centred text column.
Two ways, and the choice is not free:

**As a grid item** (`PersonaCards`): a `<li>` spanning every column with
`margin-inline: calc(50% - 50vw)`. `50%` resolves against the content column,
`50vw` against the viewport, so a centred full-width row reaches both edges.

**As a section pull-out**: `-mx-gutter` on the list and
`px-[calc(var(--spacing-gutter)-1.5rem)]` put back on it. Padding sits *inside*
the border box, so a top rule spans the full width while the first column's text
stays on the same rail as the grid above.

**A cell border cannot do this.** `margin-inline: calc(50% - 50vw)` only reaches
the viewport from an element that is itself centred in it — which a full-width
row is and a left-hand cell is not.

For a band *beside* the column (hatch, fill), anchor to the column edge and size
it `calc(50vw - 50%)`: the percentage resolves against the containing block,
which is the column, so the band is exactly the gap to the viewport edge.
**`width: 100vw` also reaches the edge but overshoots it**, and the overshoot is
real horizontal scroll — `body { overflow-x: clip }` does not contain it. Verify
by actually scrolling, not by reading `scrollWidth`.

## Ruled grids over cards

Four bordered panels read as four separate objects; one ruled grid reads as one
dataset cut several ways. `PersonaCards` is built this way: no radius, no panel
fill, rules doing the dividing.

Two things that make it feel finished:

- **One padding value on all four sides of a cell**, and the grid pulled out by
  exactly that much so copy still lands on the body column's rail. Cell padding
  and grid margin read the same token (`--cell-pad`) for that reason: change one
  and the copy drifts off the rail.
- **No internal hairlines inside a cell.** With the grid's own rules dividing,
  a second order of hairline inside every cell reads as clutter.

## Ruling is not always the answer

The case study Impact band went through three versions, and the arc is the
lesson.

**Ruled** — top rule edge to edge, dividers, squares. Directly under the
at-a-glance grid it read as a second table stacked on the first, which made the
results feel like an appendix. **Unruled columns** — uneven `1.15fr 1fr 1fr`,
first label a size up, figures in the accent. Better, but still a row of three
things skimmed as one impression rather than three results read.

**Now: a scroll-told sequence**, borrowing the homepage's Story Quest treatment.
Each result is a beat carrying the same registered `story-line` effect: it rises
and lights as it enters, holds through the centre, dims as the next takes over.
Centred, `max-w-2xl`, `22vh` between beats.

Two things carried over from the columns version and should stay:

- **The figure carries the accent, inline.** Labels are split on a numeric
  pattern in the page frontmatter, and the figures get
  `--gradient-accent-compact` — so `$50K → ~$1M` is the coloured thing, not a
  decorative index.
- **A fallback for qualitative impacts.** Not every result has a number
  ("Figma stopped being the source of truth"). Those put the accent on their
  index instead, so every item has exactly one coloured moment and none has to
  fake a metric to look designed.

Measured cost: the band is **1.27 screens** at desktop and the body opens at
**2.43**, against roughly a third of a screen for the grid. That is the trade —
scroll spent to make the most persuasive content on the page the thing people
actually read. If a study ever carries five impacts rather than three, re-measure
before assuming it still holds.

The rule to take from it: **rules are for grids that are genuinely tabular.** A
band of three claims is a composition, not a table, and ruling it into cells is
what made it feel secondary in the first place.

## Gradient text, and animating it

Two utilities, both green→yellow, both `background-clip: text` over real text:

- `.accent-gradient` — long runs (headlines, a highlighted word). Its 120deg ramp
  needs width to reach the warm end.
- `.stat-gradient` — stat figures. Same idea, retuned: a stat is four or five
  glyphs, which lands entirely inside `.accent-gradient`'s green and reads as
  flat colour, so this one starts warmer and finishes inside the box.

**Pick by run length, not by taste.** Across a 24px disc (`VibeCodingDiagram`'s
number discs and icon tiles) `.accent-gradient` never leaves its green — those
use the `.stat-gradient` ramp via `--vcd-fill`.

**To animate one in, stack it — don't transition it.** `background-image` is not
animatable, so a gradient cannot fade in over solid ink. The footer email hover
is the pattern: a second copy of the text sits absolutely over the first carrying
`.accent-gradient`, and only its opacity moves. Use a real
`<span aria-hidden="true">` rather than `::after` with `content: attr(...)` —
generated content duplicating visible text gets announced by some screen readers.
The copies stay registered because the overlay inherits every metric that matters
and the host has no padding for `inset: 0` to disagree with.

For a small filled box (an icon tile), put the gradient on a `::before` at
`opacity: 0` and raise it on the active state — same constraint, same fix.

## The prose seam

`.case-body` styles bare elements as prose. Its rules and a component's own
selectors both end up around `(0,2,1)` once Astro's scoping attribute is counted,
so **prose wins on ties, silently**, and inside a component that looks like a
layout bug rather than a specificity one.

Three live examples, all found by measuring computed style rather than by eye:

- `ul { list-style: disc; padding-left: 1.25rem }` put bullets beside `<Gallery>`
  thumbnails and pushed the row 20px off the content column.
- `li { padding-left: 0.35rem }` ate `<VibeCodingDiagram>`'s card padding — 5.6px
  arrived where 18px was set.
- `h3 { font-size: 1.25rem; margin-block: 2.5rem }` gave `<PersonaCards>` 40px of
  phantom top padding and 20px headings where 16px was set.

**The fix is at the source: every prose element rule carries `:not([class])`.**
An element authored in MDX never has a class; everything a component renders has
one and brings its own type scale and spacing. So the class is the seam, and
anything added to `src/components/mdx/` is insulated by default.

Components additionally prefix their own rules with the block class
(`.vcd .vcd__step`, `.personas .persona__name`) as belt and braces. If a
component's padding or type size mysteriously doesn't apply, check computed style
before changing the value — you are probably losing a specificity race, not
setting the wrong number.
