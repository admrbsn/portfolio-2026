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

  // Durations are proportions of the scrubbed range, not seconds. Only opacity
  // and transform are animated — both composite on the GPU. The halo is a
  // static text-shadow (see global.css) that this opacity carries in and out;
  // animating the shadow itself repainted large blurs every frame.
  tl.fromTo(el, { opacity: 0, y: 46 }, { opacity: 1, y: 0, ease: 'none', duration: 0.34 })
    .to(el, { opacity: 1, duration: 0.32 }) // hold at full through centre
    .to(el, { opacity: 0.16, y: -34, ease: 'none', duration: 0.34 });

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
    gsap.set(el, { clearProps: 'all' });
  };
}

/* -------------------------------------------------------------------------
   Jiggle. A quick damped side-to-side shake fired when the element scrolls
   into view, and again each time it re-enters. Used on the "shampoo bottles"
   phrase to give the origin story a bit of playful, physical character.
   Non-replaced inline elements ignore transforms, so the target is switched
   to inline-block for the duration (which also keeps the phrase unbroken).
   ------------------------------------------------------------------------- */
export function jiggle(el: HTMLElement): Teardown {
  // Origin near the baseline so it rocks on its feet like a bottle tipping
  // side to side, rather than spinning about its middle.
  gsap.set(el, { display: 'inline-block', transformOrigin: '50% 90%' });

  // A quick wind-up, a springy side-to-side wobble with a little hop, then a
  // bouncy elastic settle. The squash-and-stretch (scaleX/scaleY trading off)
  // and the overshoot are what keep it playful instead of a rigid rattle.
  // Paused so the ScrollTrigger drives it; restarted so re-entries replay.
  const shake = gsap
    .timeline({ paused: true })
    .to(el, { rotation: -4, scaleX: 1.035, scaleY: 0.965, duration: 0.16, ease: 'power2.out' })
    .to(el, { rotation: 3.2, y: -3, scaleX: 0.985, scaleY: 1.025, duration: 0.18, ease: 'sine.inOut' })
    .to(el, { rotation: -1.8, y: 0, scaleX: 1.01, scaleY: 0.995, duration: 0.16, ease: 'sine.inOut' })
    .to(el, {
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      duration: 1.1,
      ease: 'elastic.out(1, 0.45)',
    });

  const st = ScrollTrigger.create({
    trigger: el,
    start: 'top 82%',
    onEnter: () => shake.restart(),
    onEnterBack: () => shake.restart(),
  });

  return () => {
    st.kill();
    shake.kill();
    gsap.set(el, { clearProps: 'all' });
  };
}


/* -------------------------------------------------------------------------
   Moment card reveal. Shared by both leadership-moment graphics.

   Composed of four optional parts, each opted into by an attribute, so one
   effect covers a card that types and a card that counts:

     [data-type-pop]     scatter-popped background chrome
     [data-type-rise]    staggered rise for the foreground stack
     [data-type-target]  typed out character by character
     [data-count]        counted up to `data-count`, honouring `data-decimals`
     [data-ring]         stroke-dashoffset drawn to `data-ring` (0-1)

   The text is authored in the markup and cleared here rather than typed into
   an empty node — so with JS off, or under reduced motion where `initMotion`
   bails before any effect runs, the full string is simply there. Animating
   *from* real content is the only version that degrades safely.

   `data-typed` flips to 'done' when the run finishes; the caret's CSS blink
   hangs off that, so it only starts once there is something to sit after.
   ------------------------------------------------------------------------- */
export function momentReveal(el: HTMLElement): Teardown {
  const target = el.querySelector<HTMLElement>('[data-type-target]');
  const rise = [...el.querySelectorAll<HTMLElement>('[data-type-rise]')];
  const pop = [...el.querySelectorAll<HTMLElement>('[data-type-pop]')];
  const counters = [...el.querySelectorAll<HTMLElement>('[data-count]')];
  const rings = [...el.querySelectorAll<SVGGeometryElement>('[data-ring]')];

  const full = target?.textContent ?? '';
  const state = { chars: 0 };

  gsap.set(rise, { opacity: 0, y: 14 });
  gsap.set(pop, { opacity: 0, scale: 0.55, y: 10 });
  if (target) target.textContent = '';
  // Counters start at zero rather than their final value, so the run-up reads
  // as counting even on a card that scrolls into view instantly.
  counters.forEach((n) => {
    n.textContent = (0).toFixed(Number(n.dataset.decimals ?? 0));
  });

  const tl = gsap.timeline({
    scrollTrigger: { trigger: el, start: 'top 80%', once: true },
  });

  // Background nodes pop first and in a scattered order — `from: 'random'` is
  // what keeps it from reading as a wipe across the card. `back.out` gives the
  // slight overshoot that makes it a pop rather than a fade.
  tl.to(pop, {
    opacity: 1,
    scale: 1,
    y: 0,
    duration: 0.65,
    ease: 'back.out(2.6)',
    stagger: { each: 0.07, from: 'random' },
  });

  tl.to(rise, { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out', stagger: 0.12 }, '-=0.35');

  if (target) {
    tl.to(
      state,
      {
        chars: full.length,
        // Roughly 22 characters a second — fast enough not to stall the
        // section, slow enough to read as typing rather than a paint.
        duration: full.length / 22,
        ease: 'none',
        onUpdate: () => {
          target.textContent = full.slice(0, Math.round(state.chars));
        },
        onComplete: () => {
          target.textContent = full;
          el.dataset.typed = 'done';
        },
      },
      '-=0.25',
    );
  }

  // Rings draw from empty. `pathLength="1"` on the circle normalises the maths
  // so `data-ring` is a plain 0-1 fraction rather than a computed circumference.
  rings.forEach((ring) => {
    const to = Number(ring.dataset.ring ?? 1);
    tl.fromTo(
      ring,
      { strokeDashoffset: 1 },
      { strokeDashoffset: 1 - to, duration: 1.1, ease: 'expo.out' },
      '-=0.9',
    );
  });

  counters.forEach((node) => {
    const to = Number(node.dataset.count ?? 0);
    const decimals = Number(node.dataset.decimals ?? 0);
    const value = { n: 0 };
    tl.to(
      value,
      {
        n: to,
        duration: 1.1,
        ease: 'expo.out',
        onUpdate: () => {
          node.textContent = value.n.toFixed(decimals);
        },
        onComplete: () => {
          node.textContent = to.toFixed(decimals);
          el.dataset.typed = 'done';
        },
      },
      '<',
    );
  });

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
    if (target) target.textContent = full;
    counters.forEach((n) => {
      n.textContent = Number(n.dataset.count ?? 0).toFixed(Number(n.dataset.decimals ?? 0));
    });
    delete el.dataset.typed;
    gsap.set([...rise, ...pop, ...rings], { clearProps: 'all' });
  };
}
