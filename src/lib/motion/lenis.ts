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

export function destroySmoothScroll() {
  if (!lenis) return;
  gsap.ticker.remove(tick);
  lenis.destroy();
  lenis = null;
}
