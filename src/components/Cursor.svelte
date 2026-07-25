<script lang="ts">
  import { onMount } from 'svelte';

  /**
   * Magnetic cursor follower. The only Svelte island on the site.
   *
   * Deliberately does NOT use GSAP — it renders before the motion bundle is
   * needed and a spring here is ~15 lines, so pulling GSAP into the island
   * chunk would cost more than it saves.
   */
  let dot = $state<HTMLDivElement | null>(null);
  let ring = $state<HTMLDivElement | null>(null);
  let labelEl = $state<HTMLDivElement | null>(null);
  let enabled = $state(false);
  let hovering = $state(false);
  // Text pulled from the hovered element's `data-cursor-label`, e.g. the case
  // study links set "View case study". Null hides the tooltip.
  let label = $state<string | null>(null);

  onMount(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || calm.matches) return;

    enabled = true;

    // Hand the native cursor over to this one. Flagged on <html> rather than
    // set unconditionally in CSS so touch, reduced-motion and no-JS visitors
    // keep their real cursor — hiding it for them would leave them with none.
    document.documentElement.classList.add('has-custom-cursor');

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;

    function onMove(e: PointerEvent) {
      mx = e.clientX;
      my = e.clientY;

      const el = e.target as Element | null;
      const target = el?.closest('a, button, [data-cursor="grow"]');
      hovering = Boolean(target);

      const labelHost = el?.closest('[data-cursor-label]');
      label = labelHost?.getAttribute('data-cursor-label') || null;
    }

    function loop() {
      // Dot tracks exactly; ring lags for the trailing-spring feel.
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;

      if (dot) dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      if (ring) ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      // Tooltip tracks the dot exactly, offset to the lower-right so it clears
      // the cursor. The inner pill handles its own show/scale transition.
      if (labelEl) labelEl.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(18px, 14px)`;

      raf = requestAnimationFrame(loop);
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
      // Give the real cursor back if this island ever goes away, so the page
      // can never be left with no cursor at all.
      document.documentElement.classList.remove('has-custom-cursor');
    };
  });
</script>

{#if enabled}
  <div class="cursor-layer" aria-hidden="true">
    <div bind:this={ring} class="ring" class:grow={hovering}></div>
    <div bind:this={dot} class="dot"></div>
  </div>
  <!-- Kept out of the difference-blend layer above so the pill keeps its true
       accent colour instead of inverting against the backdrop. -->
  <div bind:this={labelEl} class="cursor-label" aria-hidden="true">
    <span class="cursor-label__pill" class:show={label}>{label}</span>
  </div>
{/if}

<style>
  /* Full takeover: hide the native cursor once this one is live. The universal
     selector is needed because links and buttons set `cursor: pointer`
     themselves, which would otherwise win over a rule on <html> alone. */
  :global(html.has-custom-cursor),
  :global(html.has-custom-cursor *) {
    cursor: none;
  }

  .cursor-layer {
    position: fixed;
    inset: 0;
    z-index: 60;
    pointer-events: none;
    /* Inverts against whatever is underneath, so it stays visible on both the
       dark surface and full-bleed imagery. */
    mix-blend-mode: difference;
  }

  .dot,
  .ring {
    position: absolute;
    top: 0;
    left: 0;
    border-radius: 9999px;
    will-change: transform;
  }

  .dot {
    width: 6px;
    height: 6px;
    background: #fff;
  }

  .ring {
    width: 34px;
    height: 34px;
    border: 1px solid rgba(255, 255, 255, 0.6);
    transition:
      width 350ms cubic-bezier(0.16, 1, 0.3, 1),
      height 350ms cubic-bezier(0.16, 1, 0.3, 1),
      background-color 350ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .ring.grow {
    width: 62px;
    height: 62px;
    background: rgba(255, 255, 255, 0.14);
  }

  /* Follows the cursor (positioned in the RAF loop); the inner pill animates
     its own entrance so the JS transform stays purely positional. */
  .cursor-label {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 61;
    pointer-events: none;
    will-change: transform;
  }

  .cursor-label__pill {
    display: inline-block;
    white-space: nowrap;
    padding: 0.35rem 0.6rem;
    border-radius: 9999px;
    background: var(--color-accent);
    color: var(--color-surface);
    font-size: 0.6875rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    box-shadow: 0 4px 16px rgb(0 0 0 / 0.28);
    opacity: 0;
    transform: scale(0.8);
    transform-origin: left center;
    transition:
      opacity 180ms cubic-bezier(0.16, 1, 0.3, 1),
      transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .cursor-label__pill.show {
    opacity: 1;
    transform: scale(1);
  }
</style>
