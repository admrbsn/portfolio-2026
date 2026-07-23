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
 */

let bound = false;

const HIDE_AFTER = 140; // px before hiding is allowed at all
const DELTA = 6; // ignore sub-pixel jitter

export function initNav() {
  if (bound) return;

  const nav = document.querySelector<HTMLElement>('[data-nav]');
  if (!nav) return;

  bound = true;

  let lastY = window.scrollY;
  let ticking = false;

  function update() {
    const y = window.scrollY;
    const diff = y - lastY;

    if (Math.abs(diff) > DELTA) {
      // Scrolling down, past the hero — retract.
      if (diff > 0 && y > HIDE_AFTER) {
        nav!.dataset.navState = 'hidden';
      } else if (diff < 0) {
        nav!.dataset.navState = 'visible';
      }
      lastY = y;
    }

    // The scrim only exists away from the top, where the nav would otherwise
    // sit on top of arbitrary content.
    nav!.dataset.navScrim = y > HIDE_AFTER ? 'on' : 'off';

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
