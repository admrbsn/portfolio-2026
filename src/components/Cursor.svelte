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
  let enabled = $state(false);
  let hovering = $state(false);

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

      const target = (e.target as Element | null)?.closest('a, button, [data-cursor="grow"]');
      hovering = Boolean(target);
    }

    function loop() {
      // Dot tracks exactly; ring lags for the trailing-spring feel.
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;

      if (dot) dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      if (ring) ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;

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
</style>
