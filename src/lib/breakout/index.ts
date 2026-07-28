/**
 * Breakout overlay — the shell around the engine.
 *
 * Reached only through a dynamic `import()` from `BreakoutCTA.astro`, so this
 * module, its stylesheet and the engine are one lazy chunk that never touches
 * a cold page load.
 *
 * The premise: a 98.5%-black veil drops over the real page, and every brick
 * you clear lifts it a little. Win and the portfolio is fully restored — the
 * game's "score" is really just how much of the site you can see.
 */

/**
 * `?inline` rather than a plain CSS import, deliberately. Astro collects
 * stylesheets by walking a page's module graph — dynamic imports included —
 * so `import './breakout.css'` gets hoisted into a render-blocking <link> on
 * every page, which is exactly the cost this module exists to avoid. `?inline`
 * still runs the file through the CSS pipeline (so it's minified) but hands
 * back a string, keeping it inside the lazy chunk. Verify after touching this:
 * `breakout*.css` must not appear in dist/*.html.
 */
import css from './breakout.css?inline';
import { Breakout, BRICK_TOTAL, type Phase } from './game';
import { getLenis } from '../motion/lenis';

/** Opacity of the veil at zero bricks cleared. Never quite 1 — a hair of the
 *  page shows through, which is what makes it obvious there's something back
 *  there worth digging out. */
const VEIL_MAX = 0.985;

let instance: Session | null = null;

interface Session {
  close(): void;
}

export function openBreakout(returnFocusTo?: HTMLElement | null) {
  if (instance) return;
  instance = mount(returnFocusTo ?? null);
}

export function closeBreakout() {
  instance?.close();
}

/** Idempotent, and left in place on close — reopening should be instant. */
function injectStyles() {
  if (document.getElementById('bo-styles')) return;
  const style = document.createElement('style');
  style.id = 'bo-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

function mount(returnFocusTo: HTMLElement | null): Session {
  injectStyles();

  const root = document.createElement('div');
  root.className = 'bo-root';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Breakout');
  root.innerHTML = markup();
  document.body.appendChild(root);

  const canvas = root.querySelector<HTMLCanvasElement>('.bo-canvas')!;
  const crt = root.querySelector<HTMLElement>('.bo-crt')!;
  const scoreEl = root.querySelector<HTMLElement>('[data-bo-score]')!;
  const pctEl = root.querySelector<HTMLElement>('[data-bo-pct]')!;
  const pctFinalEl = root.querySelector<HTMLElement>('[data-bo-pct-final]')!;
  const meterEl = root.querySelector<HTMLElement>('.bo-meter__fill')!;
  const livesEl = root.querySelector<HTMLElement>('[data-bo-lives]')!;
  const pauseBtn = root.querySelector<HTMLButtonElement>('[data-bo-pause]')!;
  const prompt = root.querySelector<HTMLElement>('.bo-prompt')!;
  const hud = root.querySelector<HTMLElement>('.bo-hud')!;
  const live = root.querySelector<HTMLElement>('[data-bo-live]')!;

  const panels = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>('[data-bo-panel]').forEach((el) => {
    panels.set(el.dataset.boPanel!, el);
  });

  // Freeze the page underneath. Lenis owns scrolling here, so stopping it is
  // what actually works — `overflow: hidden` alone leaves smooth scroll
  // running against a locked body. Reduced-motion visitors have no Lenis, and
  // the CSS handles them.
  const lenis = getLenis();
  lenis?.stop();
  const scrollY = window.scrollY;

  /** The intro card outranks the phase panels until the player hits Play.
   *  Declared before the engine so the phase hook can never read it in TDZ. */
  let atIntro = true;

  const game = new Breakout(canvas, {
    onScore: (score) => {
      scoreEl.textContent = String(score).padStart(5, '0');
    },
    onLives: (lives) => {
      livesEl.querySelectorAll<HTMLElement>('.bo-life').forEach((pip, i) => {
        pip.toggleAttribute('data-spent', i >= lives);
      });
    },
    onReveal: (fraction) => {
      root.style.setProperty('--bo-veil', String(VEIL_MAX * (1 - fraction)));
      // The CRT dressing thins out alongside, so a won game leaves the page
      // genuinely clean rather than permanently gauzed.
      crt.style.opacity = String(1 - fraction * 0.85);
      meterEl.style.transform = `scaleX(${fraction})`;
      pctEl.textContent = `${Math.round(fraction * 100)}%`;
    },
    onPhase: (phase) => showPhase(phase),
  },
  // The HUD's own height is the playfield's top inset. Its trailing gradient
  // fades out over the last third, so the bricks can start a little under it.
  () => hud.offsetHeight * 0.82);

  function showPhase(phase: Phase) {
    document.documentElement.dataset.breakout = phase;

    const active = atIntro ? 'intro' : phaseToPanel(phase);
    for (const [name, el] of panels) {
      el.hidden = name !== active;
    }

    // With a panel up the canvas must not take input at all — see
    // `Breakout.locked`. Pointer-events is belt to that braces: it also keeps
    // the paddle from tracking a mouse that's on its way to a button.
    game.setLocked(active !== null);
    canvas.style.pointerEvents = active ? 'none' : 'auto';

    prompt.hidden = phase !== 'ready' || active !== null;
    pauseBtn.hidden = active !== null;

    if (phase === 'over') {
      setFinalStats();
      announce(`Game over. Score ${game.currentScore}. Portfolio restored ${pct()}.`);
    } else if (phase === 'won') {
      finish();
    }

    // Panels are the only meaningful focus target while they're up; move to
    // them so keyboard and screen-reader users aren't stranded on the canvas.
    if (active) panels.get(active)?.querySelector<HTMLButtonElement>('button')?.focus();
  }

  /** Fills the score/restored readouts on *both* end panels. */
  function setFinalStats() {
    root.querySelectorAll<HTMLElement>('[data-bo-final-score]').forEach((el) => {
      el.textContent = String(game.currentScore).padStart(5, '0');
    });
    pctFinalEl.textContent = pct();
  }

  function finish() {
    setFinalStats();
    announce(`You win. Portfolio fully restored. Score ${game.currentScore}.`);

    // Deliberate seam for the celebration easter egg: everything needed to
    // stage it is in `detail`, and nothing in here depends on what listens.
    document.dispatchEvent(
      new CustomEvent('breakout:win', {
        detail: { score: game.currentScore, bricks: BRICK_TOTAL },
      }),
    );
  }

  function pct() {
    return `${Math.round(game.revealed * 100)}%`;
  }

  function announce(message: string) {
    live.textContent = message;
  }

  // --- Chrome wiring ------------------------------------------------------

  function onClick(e: MouseEvent) {
    const btn = (e.target as Element | null)?.closest<HTMLElement>('[data-bo-action]');
    if (!btn) return;
    switch (btn.dataset.boAction) {
      case 'play':
      case 'restart':
        atIntro = false;
        game.reset();
        // `reset()` lands on `ready`, which is often the phase we were already
        // in, so the engine's phase hook won't fire — repaint the chrome here.
        showPhase(game.currentPhase);
        break;
      case 'pause':
        game.pause();
        break;
      case 'resume':
        game.resume();
        break;
      case 'quit':
        close();
        break;
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      // Escape pauses a game in progress and dismisses whatever panel is
      // already up — so a mis-hit mid-rally costs nothing, and Escape still
      // does the conventional dialog thing once there's a dialog to dismiss.
      // `ready` counts as in progress unless it's the intro card, where the
      // player hasn't started and Escape should just leave.
      const live = game.currentPhase === 'playing' || game.currentPhase === 'ready';
      if (live && !atIntro) game.pause();
      else close();
      return;
    }
    if (e.key === 'Tab') trapFocus(e, root);
  }

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeyDown);

  // The engine's own observer watches the canvas, which is `inset: 0` and so
  // misses a HUD that reflows on its own — most likely when the arcade webfont
  // lands after the overlay opens and every label gets taller.
  const hudResize = new ResizeObserver(() => game.relayout());
  hudResize.observe(hud);

  // A view transition mid-game would swap the page out from under the veil.
  document.addEventListener('astro:before-swap', close);

  function close() {
    if (instance !== session) return;
    instance = null;

    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('astro:before-swap', close);
    hudResize.disconnect();
    game.destroy();

    delete document.documentElement.dataset.breakout;
    lenis?.start();
    // `overflow: hidden` on <html> can nudge the scroll position on release.
    window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });

    root.removeAttribute('data-open');
    const drop = () => root.remove();
    root.addEventListener('transitionend', drop, { once: true });
    setTimeout(drop, 400);

    returnFocusTo?.focus();
  }

  const session: Session = { close };

  // Dev handle, mirroring `__motion`. Reaching a win state by playing takes a
  // few minutes, so the end-of-game chrome is otherwise near-impossible to
  // iterate on: `__breakout.game.setLocked(false)` then poke at the engine.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__breakout = { game, close };
  }

  // Paint one frame at opacity 0 before flipping the attribute, so the overlay
  // fades in rather than appearing.
  requestAnimationFrame(() => root.setAttribute('data-open', ''));
  showPhase(game.currentPhase);

  return session;
}

/** Which panel, if any, belongs to a phase. `playing` shows none. */
function phaseToPanel(phase: Phase): string | null {
  switch (phase) {
    case 'paused':
      return 'paused';
    case 'over':
      return 'over';
    case 'won':
      return 'won';
    default:
      return null;
  }
}

function trapFocus(e: KeyboardEvent, root: HTMLElement) {
  const items = [...root.querySelectorAll<HTMLElement>('button:not([hidden])')].filter(
    (el) => el.offsetParent !== null,
  );
  if (!items.length) return;
  const first = items[0]!;
  const last = items[items.length - 1]!;
  const active = document.activeElement;

  if (e.shiftKey && (active === first || !root.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

function markup() {
  return `
    <div class="bo-veil"></div>
    <div class="bo-crt"><span class="bo-sweep"></span></div>
    <canvas class="bo-canvas" aria-label="Breakout playfield" role="img"></canvas>

    <header class="bo-hud">
      <div class="bo-stack">
        <span class="bo-label">Score</span>
        <span class="bo-value" data-bo-score>00000</span>
      </div>

      <div class="bo-meter">
        <div class="bo-meter__row">
          <span class="bo-label">Portfolio restored</span>
          <span class="bo-label" data-bo-pct>0%</span>
        </div>
        <div class="bo-meter__track"><span class="bo-meter__fill"></span></div>
      </div>

      <div class="bo-stack bo-stack--end">
        <span class="bo-lives" data-bo-lives aria-label="Lives remaining">
          <i class="bo-life"></i><i class="bo-life"></i><i class="bo-life"></i>
        </span>
        <span class="bo-hud__controls">
          <button type="button" class="bo-btn bo-btn--sm" data-bo-action="pause" data-bo-pause hidden>Pause</button>
          <button type="button" class="bo-btn bo-btn--sm" data-bo-action="quit">Quit</button>
        </span>
      </div>
    </header>

    <p class="bo-prompt" hidden>Click or press space to launch</p>

    <div class="bo-panels">
      <section class="bo-panel" data-bo-panel="intro" hidden>
        <p class="bo-eyebrow">Insert coin</p>
        <h2 class="bo-title">Breakout</h2>
        <p class="bo-copy">
          The page behind this is blacked out. Every brick you smash lets a
          little more of it through &mdash; clear all ${BRICK_TOTAL} and the
          portfolio is fully restored. You get three balls.
        </p>
        <div class="bo-keys">
          <div><span>Move paddle</span><span>Mouse, or <b class="bo-key">A</b><b class="bo-key">D</b></span></div>
          <div><span>Launch ball</span><span><b class="bo-key">Click</b><b class="bo-key">Space</b></span></div>
          <div><span>Pause</span><span><b class="bo-key">P</b><b class="bo-key">Esc</b></span></div>
        </div>
        <div class="bo-panel__actions">
          <button type="button" class="bo-btn bo-btn--primary" data-bo-action="play">Play</button>
          <button type="button" class="bo-btn" data-bo-action="quit">Not now</button>
        </div>
      </section>

      <section class="bo-panel" data-bo-panel="paused" hidden>
        <p class="bo-eyebrow">Stand by</p>
        <h2 class="bo-title">Paused</h2>
        <div class="bo-panel__actions">
          <button type="button" class="bo-btn bo-btn--primary" data-bo-action="resume">Resume</button>
          <button type="button" class="bo-btn" data-bo-action="restart">Restart</button>
          <button type="button" class="bo-btn" data-bo-action="quit">Quit</button>
        </div>
      </section>

      <section class="bo-panel" data-bo-panel="over" hidden>
        <p class="bo-eyebrow">Out of balls</p>
        <h2 class="bo-title">Game over</h2>
        <div class="bo-final">
          <div>
            <span class="bo-final__value" data-bo-final-score>00000</span>
            <span class="bo-final__label">Score</span>
          </div>
          <div>
            <span class="bo-final__value" data-bo-pct-final>0%</span>
            <span class="bo-final__label">Restored</span>
          </div>
        </div>
        <div class="bo-panel__actions">
          <button type="button" class="bo-btn bo-btn--primary" data-bo-action="restart">Try again</button>
          <button type="button" class="bo-btn" data-bo-action="quit">Quit</button>
        </div>
      </section>

      <section class="bo-panel" data-bo-panel="won" hidden>
        <p class="bo-eyebrow">Screen cleared</p>
        <h2 class="bo-title">Portfolio restored</h2>
        <p class="bo-copy">All ${BRICK_TOTAL} bricks down. The site is yours again.</p>
        <div class="bo-final">
          <div>
            <span class="bo-final__value" data-bo-final-score>00000</span>
            <span class="bo-final__label">Score</span>
          </div>
          <div>
            <span class="bo-final__value">100%</span>
            <span class="bo-final__label">Restored</span>
          </div>
        </div>
        <div class="bo-panel__actions">
          <button type="button" class="bo-btn bo-btn--primary" data-bo-action="quit">Back to the site</button>
          <button type="button" class="bo-btn" data-bo-action="restart">Play again</button>
        </div>
      </section>
    </div>

    <p class="bo-sr" data-bo-live aria-live="polite" role="status"></p>
  `;
}
