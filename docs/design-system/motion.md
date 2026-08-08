# Motion

All animation lives in `src/lib/motion/`. This file is the contract; the effects
themselves are in `effects.ts` and the registry in `index.ts`.

## Declaring an effect

Effects are declared in markup, never wired inline:

```astro
<h1 data-anim="reveal-heading">…</h1>
<div data-anim="reveal-batch">…</div>
<section data-anim="pin">…</section>
```

## Leadership-moment graphics

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

## Hash navigation

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

## The contract

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

## Reduced motion

`initMotion()` checks `prefers-reduced-motion` first and bails before creating
Lenis or any effect. Because `[data-anim]` elements start at `opacity: 0`, that
bail **must** be paired with CSS forcing them visible, or the page renders blank.
Two rules in `global.css` cover this: the `@media` query (fast path, applies
pre-JS) and `html[data-motion='reduced']` (stamped by `initMotion`, keeping JS
the single source of truth). Keep both — they exist because the two can
otherwise disagree and strand content invisible.

## When the module never arrives

Everything carrying `data-anim` is pre-hidden at `opacity: 0`, and **only the
motion module ever reveals it**. So if that module fails to load — a 404'd
chunk, an offline second visit, a stale Vite dep cache serving 504s in dev — the
page comes back from the loader *empty*. The `.no-js` escape hatch does not
cover this: JS is enabled, it just didn't arrive.

The failsafe is one line in `BaseLayout`'s inline script, on the same 4s timeout
that drops the loader:

```js
if (!window.__motionReady) root.setAttribute('data-motion', 'failed');
```

`revealPage()` sets `window.__motionReady` when the module does arrive, so the
branch only fires on real failure. `html[data-motion='failed']` shares every
rule with `html[data-motion='reduced']` — both want the same outcome: everything
visible, nothing animating.

**Any new `data-anim` value that starts hidden must be added to all three lists**
— the `html:not(.no-js)` pre-hide, the reduced-motion block, and the `failed`
block — or it inherits a way to become permanently invisible.

## The pre-hide list, and the page loader

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
