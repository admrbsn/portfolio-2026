# Components

Everything in `src/components/`. Astro components unless noted.

## Chrome

| Component | Notes |
| --- | --- |
| `Nav.astro` | Fixed bar. `transition:persist`, so it is wired once by `nav.ts` and never per page. |
| `Footer.astro` | Click-to-copy email, socials, copyright. `transition:persist`. |
| `Cursor.svelte` | Custom cursor. `client:idle`. Reads `data-cursor` / `data-cursor-label` off any element. |
| `NoiseGradient.astro` | The hero wash: fixed-palette blobs plus inline-SVG fractal noise. `intensity="full"` (homepage) / `"soft"` (`/about`, case studies). |
| `ArrowUpRight.astro` | The one shared icon. |
| `RuleCross.astro` | The two squares where a section's top rule crosses the page rails. First child of any full-width `border-t` inside `.page-rails`; **the host must be `relative`**. |

**A `NoiseGradient` palette needs two hues far enough apart to be counted.** The
blobs stack in the same corner under a 50px blur, so anything spanning less than
~60° composites into one colour with a light end and a dark end. `teal` spans 78°
(khaki → emerald) and is the floor, not the target — the default, `iris` (bright
blue → deep purple, 48°), sits under it and holds together on a 0.22 lightness
gap instead, the same way `fuchsia` does; `solstice` spans 165°
(amber → ocean blue) and `acid` 174° (lime → violet). A first pass at an
alternate ran cyan over indigo — 44° — and read as flat blue despite being two
blobs, two gradients and a tint.

Adding one means three things: the palette block, a matching `.soft.<name>` block
(the reduction is in the alpha, and alpha is baked into every colour — skip it
and the palette renders full-strength on `/about` and the case studies), and a
gamut check. **Chroma headroom is wildly uneven by hue.** Blues clip early — H 232
at L 0.55 tops out around C 0.11, which is why `solstice`'s blue sits at H 250 —
while magenta is a display corner and takes C 0.24 without complaint.

**A third hue goes in `--blob-c`, not in the tint.** The tint runs at 0.38–0.42
alpha over a near-black base, so a hot pink placed there resolves to a dusty
mauve; a colour that has to stay saturated needs its own blob at blob alpha.
`--blob-c` defaults to `transparent`, so the third blob costs an empty composited
layer on the palettes that don't use it — `neon` is the only one that does.

Two things that make the third hue work rather than muddy the first two: it sits
**low on the right** rather than in the top-right corner with the other two (a
third blob on the same pile is just a fourth layer of the same colour once the
50px blur has had it), and it carries **more alpha than either** — 0.62 against
their ~0.5. It is the only blob the `.full` bottom fade also cuts into, so it
loses twice.

**Both `NoiseGradient` intensities empty a corner, and for the same reason.** The
blobs live off the top-right, so their falloff is what decides how much colour
lands under the type. `soft` masks a whole diagonal (the headline sits lower
left in a half-height hero); `full` masks a radial anchored at the **bottom-left
corner** — the homepage h1 and stat figures both sit there, and colour
behind the loudest type in the frame costs contrast and buys nothing. The corner
going properly black is also what makes the wash read as *lit from the top
right* rather than as an even tint.

Both compose their corner mask with the bottom fade (`mask-composite: intersect`,
with `-webkit-mask-composite: source-in` alongside for Safari) rather than
replacing it — drop the bottom fade and the grain ends on a hard seam. Neither
mask goes fully clear at the corner for the same reason: the grain is inside it,
and cutting the texture to nothing puts a visible edge where it stops.

**The nav has no room for three links on a phone.** At 390px the content box is
310px and the wordmark plus `Work / About / Connect` measures ~356px. Each link
carries a `mobile` flag and **Connect is hidden below `sm`** — the footer sets
the same address at display size and ends every page. Two links plus the mark
measure 262px; the wordmark's mobile size is a clamp that only gives way under
~390px, keeping the bar inside the rails down to 320px. **Anything added to the
bar must be checked against that 310px budget.**

The nav deliberately has **no `mix-blend-mode`**. Difference blending kept a
monochrome bar legible over any backdrop, but it inverts the green availability
dot to magenta and the wordmark's accent dot to orange; the scroll-triggered scrim
replaces it.

## Page sections

| Component | Used by | Notes |
| --- | --- | --- |
| `WorkTile.astro` | `/` | 16/9 cover, sans title, hover accent wash. Carries **no `transition:name`** — the case study has no counterpart, and an unpaired name animates the tile out on its own. |
| `Leadership.astro` | `/` | Three columns at `lg`. The books image is `hidden lg:block`: stacked, it read as a second full-width photo and pushed the CTA a screen down. |
| `Experience.astro` | `/`, `/about` | Résumé accordion. |
| `Dribbble.astro` | `/` | Grid over generated data — see the Dribbble section in `AGENTS.md`. |
| `MomentTribute.astro`, `MomentPetersons.astro` | `/about` | Built in code, not image exports. See [motion.md](motion.md#leadership-moment-graphics). |
| `BreakoutCTA.astro` | every page | Loader for the game. Its script must stay a ~20-line dynamic `import()`. |

## MDX components

Available inside case studies. `Figure`, `PullQuote`, `Stat` and `Device` are
passed via `<Content components={…} />` so they need no import; the rest are
imported per file.

| Component | Props | Notes |
| --- | --- | --- |
| `Figure` | `src`, `alt`, `caption` | Standard body image. |
| `PullQuote` | slot | |
| `Stat` | `value`, `label` | Uses `.stat-gradient`. |
| `Device` | `src`, `alt` | Phone frame. Screen needs `data-lenis-prevent`. Radius is a depiction — exempt from `--radius-ui`. |
| `Gallery` | `images[]`, `alt[]`, `heading`, `fit`, `variant` | Thumbnail grid + lightbox. `variant="inline"` sheds section padding to sit in prose. |
| `BeforeAfterSlider` | `before`, `after`, `caption` | Window-level pointer listeners — unbinds on swap. |
| `PersonaCards` | none (data is in the component) | Ruled grid; see [patterns](patterns.md#ruled-grids-over-cards). |
| `RecordFunnel` | none | |
| `VibeCodingDiagram` | none | Comparison plus a self-advancing sprint cycle. |

Three own interactive state and follow the same teardown contract as the motion
registry — bind on `astro:page-load`, unbind on `astro:before-swap`. `Gallery`'s
document-level `keydown`, `BeforeAfterSlider`'s window-level pointer listeners
and `VibeCodingDiagram`'s interval + IntersectionObserver would otherwise
accumulate against detached DOM on every client-side navigation.

**Anything that scrolls inside the page needs `data-lenis-prevent`**, or Lenis
swallows the wheel event and scrolls the document instead — `Device`'s screen,
`Gallery`'s zoom stage, `VibeCodingDiagram`'s cycle row. `Gallery` additionally
calls `lenis.stop()` while its dialog is open, because a modal `<dialog>` blocks
interaction behind it but not programmatic scrolling.

### VibeCodingDiagram

The sprint-cycle row advances itself every 2.2s. **The accent is a playhead**:
exactly one card holds `data-active`, the script walks it card to card, and the
row scrolls to follow. It advances **per card, not per scroll position** — the
last few cards clamp to the same maximum scroll, and the row correctly stops
moving there while the playhead keeps going.

The first card carries `data-active` from the server, so the row is right before
the script runs and in reduced motion, where it never moves. It only runs while
on screen, pauses on hover and focus, and a manual scroll moves the playhead to
the card the reader landed on. Hover both paints the active state (CSS, so it is
instant and survives a script failure) and takes the playhead (JS, so the cycle
resumes from where the reader was looking).

Its cards and the "new way" steps share `--vcd-fill` and `--vcd-edge`. The white
glyphs on that fill measure **1.5–1.8:1** — deliberate, at the author's
direction; `--color-surface` on the same fill is 11.9:1 if it ever needs to clear
AA.

### Gallery

Two renditions per image: a cropped thumbnail for the grid and a large one the
lightbox loads only when opened. Full sizes resolve at build time so the markup
carries a plain `href` — which also means the grid degrades to a working set of
image links with JS off. The cap is 3200px rather than a viewport-ish 2000
because several sources are wide contact sheets (one is 7535px) whose individual
screens are illegible below that.

One `<dialog>` for the whole grid rather than one per image: it gives focus
trapping, inertness and Escape-to-close for free, so the script only swaps the
source and moves the index.
