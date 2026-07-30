import { gsap, ScrollTrigger, prefersReducedMotion } from './gsap';
import { initSmoothScroll, resetScroll, scrollToHash } from './lenis';
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
  jiggle,
  momentReveal,
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
  jiggle,
  'moment-reveal': momentReveal,
};

let teardowns: Teardown[] = [];
let started = false;

/**
 * Dismiss the page loader (see the Page loader block in global.css).
 *
 * Idempotent, and deliberately dumb: the inline script in BaseLayout carries a
 * timeout that does the same thing, so the overlay comes down whether or not
 * this module ever runs. Called from the lifecycle's `finally`, which means a
 * thrown effect reveals the page rather than leaving a spinner up.
 */
function revealPage() {
  document.documentElement.removeAttribute('data-loading');
}

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
 * Re-resolve the URL's anchor once layout has settled.
 *
 * The jump taken at swap time is only ever approximate: it runs before the
 * webfont lands and before any effect claims its space, so a target far down
 * the page (`/#work`) is measured against a document that then grows underneath
 * it — the reader ends up short of the section by however much the content
 * above expanded.
 *
 * Only corrects when the scroll position is still where that first jump left
 * it. If the reader has started scrolling, yanking them to an anchor they are
 * no longer interested in is worse than landing slightly off.
 */
async function settleHash(hash: string, scrollYAtStart: number) {
  if (!hash) return;

  try {
    await document.fonts.ready;
  } catch {
    /* Font Loading API unavailable — the measurement below is still better
       than the one taken at swap time. */
  }

  if (Math.abs(window.scrollY - scrollYAtStart) < 4) scrollToHash(hash);
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
    // Captured before init so the correction can tell "still where we put it"
    // from "the reader has moved". Runs in reduced motion too, where initMotion
    // returns early — the anchor still has to land in the right place.
    const hash = window.location.hash;
    const scrollYAtStart = window.scrollY;

    // `finally` rather than `then`: an effect that throws must still take the
    // loader down, or a single bad selector hides the whole site behind a
    // spinner. The hash correction stays after it — settling an anchor under a
    // visible page is the point.
    void initMotion()
      .catch((err) => console.warn('[motion] init failed', err))
      .finally(revealPage)
      .then(() => settleHash(hash, scrollYAtStart));
  });

  document.addEventListener('astro:before-swap', () => {
    destroyMotion();
  });

  /*
    Lenis keeps its own scroll position across swaps; without this a navigation
    lands mid-page instead of at the top.

    The hash check is what makes `/#work` work at all. Lenis owns the scroll
    position, so the browser performs no anchor jump of its own on a
    client-side navigation — resetting unconditionally would land the reader at
    the top of the homepage with `#work` sitting in the URL, looking like the
    link is broken.
  */
  document.addEventListener('astro:after-swap', () => {
    if (!scrollToHash(window.location.hash)) resetScroll();
  });
}
