import Lenis from 'lenis';
import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap';

let lenis: Lenis | null = null;

/**
 * Lenis is created exactly once and deliberately survives client-side
 * navigation. It binds to `window`, which the ClientRouter never swaps — so
 * tearing it down and rebuilding it per page would drop scroll position and
 * restart the RAF loop for no reason.
 *
 * The important detail is the ticker: Lenis is driven by `gsap.ticker` rather
 * than its own requestAnimationFrame loop. Two independent RAF loops produce a
 * one-frame lag between the scroll position Lenis reports and the position
 * ScrollTrigger acts on, which reads as jitter on pinned sections.
 */
export function initSmoothScroll(): Lenis | null {
  if (prefersReducedMotion()) return null;
  if (lenis) return lenis;

  lenis = new Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    // Native momentum on touch is better than anything we'd synthesise.
    syncTouch: false,
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

function tick(time: number) {
  // gsap.ticker reports seconds; Lenis expects milliseconds.
  lenis?.raf(time * 1000);
}

export function getLenis(): Lenis | null {
  return lenis;
}

/** Jump to top without a smooth animation — used on page swap. */
export function resetScroll() {
  lenis?.scrollTo(0, { immediate: true });
}

/**
 * Jump to the element a URL hash points at. Returns false when there is no
 * hash or nothing matches, so the caller can fall back to resetting to the top.
 *
 * This exists because Lenis owns the scroll position: on a client-side
 * navigation to `/#work` the browser does not perform its own anchor jump, and
 * `resetScroll()` would otherwise drag the page straight back to zero. Under
 * reduced motion Lenis is never created, so fall through to the native path.
 */
export function scrollToHash(hash: string, immediate = true): boolean {
  if (!hash || hash.length < 2) return false;

  let target: HTMLElement | null = null;
  try {
    target = document.querySelector<HTMLElement>(hash);
  } catch {
    // A hash that isn't a valid selector (e.g. `#3-things`) — not our problem.
    return false;
  }
  if (!target) return false;

  if (lenis) lenis.scrollTo(target, { immediate });
  else target.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });

  return true;
}

export function destroySmoothScroll() {
  if (!lenis) return;
  gsap.ticker.remove(tick);
  lenis.destroy();
  lenis = null;
}
