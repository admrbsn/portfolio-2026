import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap';
import { initSmoothScroll, resetScroll } from './lenis';
import { initNav } from './nav';
import {
  revealHeading,
  revealBatch,
  reveal,
  parallax,
  pinSection,
  marquee,
  magnetic,
  heroFade,
  storyLine,
  type Teardown,
} from './effects';

/**
 * Effects are declared in markup via `data-anim`, so .astro files stay free of
 * animation wiring and the whole motion vocabulary lives in one registry.
 */
const registry: Record<string, (el: HTMLElement) => Teardown> = {
  'reveal-heading': revealHeading,
  'reveal-batch': revealBatch,
  reveal,
  parallax,
  pin: pinSection,
  marquee,
  magnetic,
  'hero-fade': heroFade,
  'story-line': storyLine,
};

let teardowns: Teardown[] = [];
let started = false;

/**
 * Wire every `data-anim` element on the current page.
 *
 * Runs on `astro:page-load`, which fires on first load *and* after every
 * client-side navigation.
 */
export async function initMotion() {
  // The nav scrim is a legibility fix, not decoration — it runs in every mode.
  // (Its retract transform is disabled in CSS under reduced motion.)
  initNav();

  // Reduced motion: skip Lenis and every effect entirely. Setting the
  // attribute *before* returning is what makes the CSS in global.css force
  // `data-anim` elements visible, so this leaves a fully readable page rather
  // than a blank one.
  if (prefersReducedMotion()) {
    document.documentElement.dataset.motion = 'reduced';
    return;
  }

  document.documentElement.dataset.motion = 'full';

  if (!started) {
    initSmoothScroll();
    started = true;
  }

  // Line-based SplitText must wait for the webfont, otherwise lines are broken
  // against fallback metrics and visibly re-flow when the real font arrives.
  try {
    await document.fonts.ready;
  } catch {
    /* Font Loading API unavailable — proceed with fallback metrics. */
  }

  const nodes = document.querySelectorAll<HTMLElement>('[data-anim]');

  nodes.forEach((el) => {
    const name = el.dataset.anim;
    if (!name) return;

    const effect = registry[name];
    if (!effect) {
      console.warn(`[motion] unknown data-anim="${name}"`, el);
      return;
    }

    teardowns.push(effect(el));
  });

  // Pinning and image loading both change document height. One refresh after
  // wiring keeps every trigger's start/end honest.
  ScrollTrigger.refresh();
}

/**
 * Runs on `astro:before-swap`. Without this, ScrollTriggers from the outgoing
 * page survive against detached DOM nodes and accumulate on every navigation —
 * the leak shows up as `ScrollTrigger.getAll().length` climbing with each
 * round-trip until scrolling stutters.
 */
export function destroyMotion() {
  teardowns.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[motion] teardown failed', err);
    }
  });
  teardowns = [];

  // Belt and braces: anything an effect forgot to kill dies here.
  ScrollTrigger.getAll().forEach((t) => t.kill());
  gsap.globalTimeline.clear();
}

/** Bind the lifecycle. Called once from BaseLayout. */
export function bindMotionLifecycle() {
  // Dev-only handle for spotting leaks: `__motion.triggers()` should return to
  // the same count after navigating away and back, never climb.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__motion = {
      triggers: () => ScrollTrigger.getAll().length,
      teardowns: () => teardowns.length,
    };
  }

  document.addEventListener('astro:page-load', () => {
    void initMotion();
  });

  document.addEventListener('astro:before-swap', () => {
    destroyMotion();
  });

  // Lenis keeps its own scroll position across swaps; without this a
  // navigation lands mid-page instead of at the top.
  document.addEventListener('astro:after-swap', () => {
    resetScroll();
  });
}
