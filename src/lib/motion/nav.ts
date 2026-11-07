/**
 * Nav scroll behaviour.
 *
 * The nav is `position: fixed` with `mix-blend-difference` and no background,
 * which reads beautifully over the hero but collides illegibly with body copy
 * once the page scrolls. So: hide it on scroll down, reveal it on scroll up,
 * and give it a scrim whenever it is revealed away from the top.
 *
 * Initialised once and never torn down — the nav carries `transition:persist`,
 * so it survives client-side navigation and must not be rewired per page.
 *
 * **But never hold a reference to the element.** The scroll listener is bound
 * once, yet the `[data-nav]` node on the page after a client-side swap is not
 * reliably the node that was there when this ran. A captured reference kept
 * writing `data-nav-state` / `data-nav-scrim` to a detached header — the live
 * bar stopped hiding and lost its scrim after the first navigation — and kept
 * measuring 0 for `--nav-h`. Everything below resolves the current bar each
 * time, and the ResizeObserver is moved onto the new one on every page load.
 */

let bound = false;

const HIDE_AFTER = 140; // px before hiding is allowed at all
const DELTA = 6; // ignore sub-pixel jitter

const currentNav = () => document.querySelector<HTMLElement>('[data-nav]');

export function initNav() {
  if (bound) return;
  if (!currentNav()) return;

  bound = true;

  /*
   * Publish the bar's measured height as `--nav-h` on the root, for layouts that
   * have to subtract it — the home hero sizes itself to `100svh - var(--nav-h)`
   * so the nav band and the hero together fill exactly one viewport.
   *
   * Measured rather than hardcoded because the wordmark steps up a size at `sm`
   * and the webfont can land late, both of which change the header's height.
   * CSS carries a fallback, so a reduced-motion or JS-less visit still lays out.
   *
   * A 0 is skipped: it only ever means the bar is detached mid-swap, and
   * publishing it collapses every consumer (sticky columns, the case-study back
   * link) to the viewport edge.
   */
  const publishHeight = () => {
    const h = Math.round(currentNav()?.offsetHeight ?? 0);
    if (!h) return;
    document.documentElement.style.setProperty('--nav-h', `${h}px`);
  };

  let observer: ResizeObserver | null = null;
  let observed: HTMLElement | null = null;
  const observe = () => {
    const nav = currentNav();
    if (!nav || nav === observed || !('ResizeObserver' in window)) return;
    observer ??= new ResizeObserver(publishHeight);
    if (observed) observer.unobserve(observed);
    observer.observe(nav);
    observed = nav;
  };

  publishHeight();
  observe();

  // The swap also rewrites <html>'s attributes from the incoming document,
  // inline style included, so the height is re-published once the new page is
  // in, the observer moves to the live bar, and the scroll state is re-applied
  // to it (otherwise a page that loads scrolled — a hash link — shows the bar
  // in the wrong state until the next scroll).
  document.addEventListener('astro:page-load', () => {
    observe();
    publishHeight();
    update();
  });

  let lastY = window.scrollY;
  let ticking = false;

  function update() {
    const nav = currentNav();
    if (!nav) {
      ticking = false;
      return;
    }
    const y = window.scrollY;
    const diff = y - lastY;

    if (Math.abs(diff) > DELTA) {
      // Scrolling down, past the hero — retract.
      if (diff > 0 && y > HIDE_AFTER) {
        nav.dataset.navState = 'hidden';
      } else if (diff < 0) {
        nav.dataset.navState = 'visible';
      }
      lastY = y;
    }

    // The scrim only exists away from the top, where the nav would otherwise
    // sit on top of arbitrary content.
    nav.dataset.navScrim = y > HIDE_AFTER ? 'on' : 'off';

    ticking = false;
  }

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );

  update();
}
