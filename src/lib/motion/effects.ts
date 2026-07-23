import { gsap, ScrollTrigger, SplitText } from './gsap';

/**
 * Every effect returns its own teardown. That contract is what makes the
 * lifecycle in ./index.ts reliable: the registry collects the teardowns and
 * runs them on `astro:before-swap`, so nothing leaks across navigations.
 */
export type Teardown = () => void;

/* -------------------------------------------------------------------------
   Headline reveal — the signature move.

   SplitText splits into lines, each wrapped in an overflow-hidden `.split-line`
   so the characters rise out of a mask rather than just fading. Splitting by
   line requires the webfont to be loaded, otherwise line breaks are computed
   against the fallback metrics and re-flow the moment the real font lands.
   ------------------------------------------------------------------------- */
export function revealHeading(el: HTMLElement): Teardown {
  const split = new SplitText(el, {
    type: 'lines,words',
    linesClass: 'split-line',
    // Keeps screen readers reading the original sentence rather than a pile
    // of disconnected word spans.
    aria: 'auto',
  });

  gsap.set(el, { opacity: 1 });

  const tween = gsap.from(split.words, {
    yPercent: 118,
    duration: 1.2,
    ease: 'expo.out',
    stagger: { amount: 0.4 },
    scrollTrigger: {
      trigger: el,
      start: 'top 88%',
      once: true,
    },
  });

  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    // Restores the original DOM. Without this the next split would nest
    // wrappers inside wrappers and the text would drift.
    split.revert();
  };
}

/* -------------------------------------------------------------------------
   Batched fade-up. ScrollTrigger.batch groups elements entering together into
   a single stagger, which looks intentional where N separate triggers look
   like popcorn.
   ------------------------------------------------------------------------- */
export function revealBatch(container: HTMLElement): Teardown {
  const items = Array.from(container.children) as HTMLElement[];
  if (!items.length) return () => {};

  gsap.set(items, { opacity: 0, y: 34 });

  const triggers = ScrollTrigger.batch(items, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.95,
        ease: 'expo.out',
        stagger: 0.09,
        overwrite: true,
      }),
  });

  return () => {
    triggers.forEach((t) => t.kill());
    gsap.set(items, { clearProps: 'all' });
  };
}

/** Single-element fade-up, for things that have no sibling group. */
export function reveal(el: HTMLElement): Teardown {
  gsap.set(el, { opacity: 0, y: 28 });

  const tween = gsap.to(el, {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'expo.out',
    scrollTrigger: { trigger: el, start: 'top 90%', once: true },
  });

  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    gsap.set(el, { clearProps: 'all' });
  };
}

/* -------------------------------------------------------------------------
   Parallax. `data-speed` is the fraction of the scroll distance the element
   lags behind by; 0.15 is subtle, 0.4 is showy.
   ------------------------------------------------------------------------- */
export function parallax(el: HTMLElement): Teardown {
  const speed = Number(el.dataset.speed ?? 0.18);

  const tween = gsap.fromTo(
    el,
    { yPercent: -speed * 100 },
    {
      yPercent: speed * 100,
      ease: 'none',
      scrollTrigger: {
        trigger: el.parentElement ?? el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    },
  );

  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    gsap.set(el, { clearProps: 'all' });
  };
}

/* -------------------------------------------------------------------------
   Pinned hero — holds the case study title while the cover image scales
   under it.
   ------------------------------------------------------------------------- */
export function pinSection(el: HTMLElement): Teardown {
  const media = el.querySelector<HTMLElement>('[data-pin-media]');
  const fade = el.querySelector<HTMLElement>('[data-pin-fade]');

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: el,
      start: 'top top',
      end: '+=85%',
      pin: true,
      pinSpacing: true,
      scrub: 0.6,
      // Astro's ClientRouter can swap the DOM mid-pin; anticipatePin avoids a
      // flash of unpinned layout on fast scrolls.
      anticipatePin: 1,
    },
  });

  if (media) tl.to(media, { scale: 1.14, ease: 'none' }, 0);
  if (fade) tl.to(fade, { opacity: 0, y: -40, ease: 'none' }, 0);

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
    if (media) gsap.set(media, { clearProps: 'all' });
    if (fade) gsap.set(fade, { clearProps: 'all' });
  };
}

/* -------------------------------------------------------------------------
   Seamless marquee. The track's contents are duplicated in markup, so
   translating by exactly -50% lands on an identical frame and the modulus
   wrap is invisible.
   ------------------------------------------------------------------------- */
export function marquee(el: HTMLElement): Teardown {
  const track = el.querySelector<HTMLElement>('.marquee-track');
  if (!track) return () => {};

  const speed = Number(el.dataset.speed ?? 28);

  const tween = gsap.to(track, {
    xPercent: -50,
    duration: speed,
    ease: 'none',
    repeat: -1,
  });

  // Scrolling nudges the marquee's playback rate, so it reacts to the page
  // instead of looping obliviously.
  const st = ScrollTrigger.create({
    trigger: el,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (self) => {
      gsap.to(tween, {
        timeScale: 1 + Math.abs(self.getVelocity()) / 2200,
        duration: 0.3,
        overwrite: true,
      });
    },
  });

  return () => {
    st.kill();
    tween.kill();
    gsap.set(track, { clearProps: 'all' });
  };
}

/* -------------------------------------------------------------------------
   Magnetic hover — pulls an element toward the cursor. Used on the primary
   CTA. Pointer-type gated so it never runs on touch.
   ------------------------------------------------------------------------- */
export function magnetic(el: HTMLElement): Teardown {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    return () => {};
  }

  const strength = Number(el.dataset.strength ?? 0.34);
  const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });

  function onMove(e: PointerEvent) {
    const r = el.getBoundingClientRect();
    xTo((e.clientX - (r.left + r.width / 2)) * strength);
    yTo((e.clientY - (r.top + r.height / 2)) * strength);
  }

  function onLeave() {
    xTo(0);
    yTo(0);
  }

  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);

  return () => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    gsap.set(el, { clearProps: 'all' });
  };
}

/* -------------------------------------------------------------------------
   Hero fade-out. Scrub-linked to the hero's own scroll: the content fades and
   drifts up as you leave, handing the viewport to the story below. Sits on the
   hero's inner wrapper, so it composes with the on-load reveals of its children
   (those finish before any scroll happens).
   ------------------------------------------------------------------------- */
export function heroFade(el: HTMLElement): Teardown {
  const tween = gsap.to(el, {
    opacity: 0,
    y: -80,
    ease: 'none',
    scrollTrigger: {
      trigger: el.closest('section') ?? el,
      start: 'top top',
      // Finish before the hero fully clears, so it's gone by the time the first
      // story line is in reading position rather than lingering behind it.
      end: 'bottom 35%',
      scrub: true,
    },
  });

  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    gsap.set(el, { clearProps: 'all' });
  };
}

/* -------------------------------------------------------------------------
   Story line. Scrub-linked to each sentence's journey across the viewport:
   fades and rises in as it enters the lower half, holds full through the
   middle, then dims and lifts away near the top. The dim (rather than a full
   fade) spotlights whichever line is centred while keeping neighbours faintly
   present — so the eye follows the story as you scroll.
   ------------------------------------------------------------------------- */
export function storyLine(el: HTMLElement): Teardown {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });

  // Durations are proportions of the scrubbed range, not seconds.
  tl.fromTo(el, { opacity: 0, y: 46 }, { opacity: 1, y: 0, ease: 'none', duration: 0.34 })
    .to(el, { opacity: 1, duration: 0.32 }) // hold at full through centre
    .to(el, { opacity: 0.16, y: -34, ease: 'none', duration: 0.34 });

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
    gsap.set(el, { clearProps: 'all' });
  };
}
