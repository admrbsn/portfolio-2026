import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

// Flip is deliberately NOT registered. The card -> case-study morph is handled
// by the View Transitions API via `transition:name`, so pulling Flip in would
// add bundle weight for a capability the platform already provides. Add it if
// you need a layout morph that view transitions cannot express.

/**
 * Single registration point for GSAP.
 *
 * Registering a plugin twice is harmless on its own, but importing GSAP from
 * several modules risks pulling in two copies through Vite's chunking — and two
 * copies means two independent tickers, which desyncs ScrollTrigger from Lenis.
 * Everything imports `gsap` from here, never from 'gsap' directly.
 */
gsap.registerPlugin(ScrollTrigger, SplitText);

gsap.defaults({
  ease: 'expo.out',
  duration: 1.1,
});

// ScrollTrigger recalculates on resize by default, but on mobile the URL bar
// collapsing fires resize constantly. Ignoring pure-height changes on touch
// stops pinned sections from juddering as the user scrolls.
ScrollTrigger.config({ ignoreMobileResize: true });

export { gsap, ScrollTrigger, SplitText };

/** True when the visitor has asked for less motion. Checked at every entry point. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
