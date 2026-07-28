/**
 * Breakout engine.
 *
 * Canvas-only: it draws the playfield and owns the simulation, but knows
 * nothing about the overlay chrome. Score, lives, phase and — the one that
 * matters — how much of the page has been uncovered are pushed out through
 * `Hooks`, so `index.ts` can render those as real DOM (crisper text, actually
 * accessible) instead of canvas typography.
 */

export type Phase = 'ready' | 'playing' | 'paused' | 'over' | 'won';

export interface Hooks {
  onPhase(phase: Phase): void;
  onScore(score: number): void;
  onLives(lives: number): void;
  /** 0 → nothing cleared, 1 → every brick gone. Drives the veil. */
  onReveal(fraction: number): void;
}

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  row: number;
  alive: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}

/**
 * Six bands, warm at the top. Points follow the arcade convention of paying
 * more for the rows you can only reach by threading the gaps you've already
 * made — the top two also trigger the speed-ups below.
 */
const ROWS = [
  { color: '#ff3b5c', points: 7 },
  { color: '#ff8a3d', points: 5 },
  { color: '#ffd83d', points: 5 },
  { color: '#3dff9e', points: 3 },
  { color: '#3ddcff', points: 1 },
  { color: '#8f7bff', points: 1 },
] as const;

const COLS = 11;
const ROW_COUNT = ROWS.length;
export const BRICK_TOTAL = COLS * ROW_COUNT;

const LIVES = 3;

/** How much of the paddle survives first contact with the ceiling. */
const CEILING_SHRINK = 0.6;

/** Physics runs on a fixed step so behaviour is identical at 60Hz and 120Hz. */
const STEP = 1 / 180;
const MAX_STEPS_PER_FRAME = 6;

/** Steepest departure from vertical off the paddle edge, in radians. */
const MAX_BOUNCE = 1.05;

export class Breakout {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private calm: boolean;

  private phase: Phase = 'ready';
  private score = 0;
  private lives = LIVES;
  private cleared = 0;

  // Layout, all in CSS pixels; recomputed on every resize.
  private w = 0;
  private h = 0;
  private field = { x: 0, y: 0, w: 0, h: 0 };
  private brickW = 0;
  private brickH = 0;
  private brickGap = 0;
  private gridX = 0;
  private gridY = 0;
  private paddleW = 0;
  private paddleH = 0;
  private paddleY = 0;
  private radius = 6;
  private baseSpeed = 400;

  // Rebuilt on layout, never per frame — see `drawBricks`.
  private rowGradients: CanvasGradient[] = [];
  private paddleGradient: CanvasGradient | null = null;

  private bricks: Brick[] = [];
  private paddleX = 0;
  private paddleTargetX = 0;
  private keyDir = 0;
  private ball = { x: 0, y: 0, vx: 0, vy: 0 };
  private trail: { x: number; y: number }[] = [];
  private particles: Particle[] = [];
  private shake = 0;

  // Difficulty state. Classic Atari rules: the ball speeds up on its 4th and
  // 12th paddle hit and again on first contact with each of the top two rows,
  // and the paddle halves the first time the ball reaches the ceiling.
  private paddleHits = 0;
  private speedMult = 1;
  private rowTriggered = new Set<number>();
  private ceilingHit = false;

  /**
   * Set by the shell whenever a panel is up. The canvas fills the viewport and
   * sits *behind* those panels, so without this a click anywhere outside the
   * intro card would launch the ball into a game the player hasn't started.
   */
  private locked = true;

  private ro: ResizeObserver;

  constructor(
    private canvas: HTMLCanvasElement,
    private hooks: Hooks,
    /**
     * CSS pixels to keep clear at the top of the canvas. Supplied by the shell
     * as the live height of the HUD rather than hard-coded: the HUD reflows to
     * two rows under 40rem, and a fixed inset either overlaps the meter on
     * mobile or wastes a band of playfield on desktop.
     */
    private getTopInset: () => number,
  ) {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('[breakout] 2D canvas context unavailable');
    this.ctx = ctx;

    this.calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.ro = new ResizeObserver(() => this.layout());
    this.ro.observe(canvas);

    canvas.addEventListener('pointermove', this.onPointerMove, { passive: true });
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('visibilitychange', this.onVisibility);

    this.layout();
    this.reset();
    this.raf = requestAnimationFrame(this.frame);
  }

  // --- Public API ---------------------------------------------------------

  /** Full reset back to a fresh rack, ball parked on the paddle. */
  reset() {
    this.score = 0;
    this.lives = LIVES;
    this.cleared = 0;
    this.paddleHits = 0;
    this.speedMult = 1;
    this.rowTriggered.clear();
    this.ceilingHit = false;
    this.particles.length = 0;
    this.trail.length = 0;
    this.buildBricks();
    this.layout();
    this.parkBall();

    this.hooks.onScore(this.score);
    this.hooks.onLives(this.lives);
    this.hooks.onReveal(0);
    this.setPhase('ready');
  }

  /** Recompute the playfield. The shell calls this when the HUD reflows. */
  relayout() {
    this.layout();
  }

  /** Ignore player input entirely — see `locked`. */
  setLocked(locked: boolean) {
    this.locked = locked;
    if (locked) this.keyDir = 0;
  }

  /** Send the ball off the paddle. No-op unless it's sitting there. */
  launch() {
    if (this.locked || this.phase !== 'ready') return;
    const speed = this.baseSpeed * this.speedMult;
    // Always upward, always off-vertical, side chosen at random.
    const angle = -Math.PI / 2 + (Math.random() * 0.5 + 0.25) * (Math.random() < 0.5 ? -1 : 1);
    this.ball.vx = Math.cos(angle) * speed;
    this.ball.vy = Math.sin(angle) * speed;
    this.setPhase('playing');
  }

  /** A parked ball counts: the player may want the menu before launching. */
  pause() {
    if (this.phase !== 'playing' && this.phase !== 'ready') return;
    this.setPhase('paused');
  }

  resume() {
    if (this.phase !== 'paused') return;
    // Ball on the paddle stays on the paddle; the launch prompt comes back.
    this.setPhase(this.ball.vx === 0 && this.ball.vy === 0 ? 'ready' : 'playing');
  }

  togglePause() {
    if (this.phase === 'paused') this.resume();
    else this.pause();
  }

  get currentPhase(): Phase {
    return this.phase;
  }

  get currentScore(): number {
    return this.score;
  }

  get revealed(): number {
    return this.cleared / BRICK_TOTAL;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  // --- Layout -------------------------------------------------------------

  /**
   * Everything is derived from the container size, so the game feels the same
   * on a phone and a 27" display. Ball speed scales with field height rather
   * than being a fixed px/s — otherwise a tall window plays like slow motion.
   */
  private layout() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const prev = { ...this.field };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Reserve the top for the HUD, and a little air at the bottom so the
    // paddle never collides with browser UI on mobile.
    const top = clamp(this.getTopInset(), 56, this.h * 0.3);
    const bottom = 20;
    const gutter = Math.max(12, this.w * 0.03);

    const fw = Math.min(this.w - gutter * 2, 960);
    this.field = {
      x: (this.w - fw) / 2,
      y: top,
      w: fw,
      h: this.h - top - bottom,
    };

    const gap = Math.max(2, Math.round(fw * 0.005));
    this.brickGap = gap;
    this.brickW = (this.field.w - gap * (COLS - 1)) / COLS;
    this.brickH = clamp(this.field.h * 0.042, 13, 26);
    this.gridX = this.field.x;
    this.gridY = this.field.y + this.field.h * 0.12;

    this.paddleW = clamp(this.field.w * 0.155, 54, 124) * (this.ceilingHit ? CEILING_SHRINK : 1);
    this.paddleH = clamp(this.field.h * 0.018, 9, 14);
    this.paddleY = this.field.y + this.field.h - this.paddleH - Math.max(28, this.field.h * 0.06);
    this.radius = clamp(this.field.w * 0.008, 4.5, 8);
    // Proportional to field height, not a fixed px/s: the playfield is as tall
    // as the viewport, so a constant speed plays like slow motion on a big
    // display and like a bullet on a laptop. Tuned so a round trip is ~2.5s
    // before the escalations kick in.
    this.baseSpeed = clamp(this.field.h * 0.7, 320, 880);

    this.bricks.forEach((b, i) => {
      const col = i % COLS;
      b.x = this.gridX + col * (this.brickW + gap);
      b.y = this.gridY + b.row * (this.brickH + gap);
      b.w = this.brickW;
      b.h = this.brickH;
    });

    // Carry live positions across the resize proportionally, so a window drag
    // mid-rally doesn't teleport the ball into a wall.
    if (prev.w && prev.h) {
      const sx = this.field.w / prev.w;
      const sy = this.field.h / prev.h;
      this.ball.x = this.field.x + (this.ball.x - prev.x) * sx;
      this.ball.y = this.field.y + (this.ball.y - prev.y) * sy;
      const speed = Math.hypot(this.ball.vx, this.ball.vy);
      if (speed) {
        const target = this.baseSpeed * this.speedMult;
        this.ball.vx = (this.ball.vx / speed) * target;
        this.ball.vy = (this.ball.vy / speed) * target;
      }
    }

    this.paddleX = clamp(
      this.paddleX || this.field.x + this.field.w / 2,
      this.field.x + this.paddleW / 2,
      this.field.x + this.field.w - this.paddleW / 2,
    );
    this.paddleTargetX = this.paddleX;
    this.buildGradients();
    if (this.phase === 'ready') this.parkBall();
  }

  /**
   * Canvas gradients are positional, so these have to be rebuilt whenever the
   * grid moves — but only then. Each row shares one, which is what keeps the
   * per-frame brick loop down to a fill call.
   */
  private buildGradients() {
    const ctx = this.ctx;

    this.rowGradients = ROWS.map((row, i) => {
      const top = this.gridY + i * (this.brickH + this.brickGap);
      const g = ctx.createLinearGradient(0, top, 0, top + this.brickH);
      // Light at the top falling to a deeper shade — reads as a moulded
      // keycap rather than a flat rectangle, without any extra draw calls.
      g.addColorStop(0, shade(row.color, 0.34));
      g.addColorStop(0.5, row.color);
      g.addColorStop(1, shade(row.color, -0.2));
      return g;
    });

    const pg = ctx.createLinearGradient(0, this.paddleY, 0, this.paddleY + this.paddleH);
    pg.addColorStop(0, '#c4ffe2');
    pg.addColorStop(0.45, '#3dff9e');
    pg.addColorStop(1, '#12c877');
    this.paddleGradient = pg;
  }

  private buildBricks() {
    this.bricks = [];
    for (let row = 0; row < ROW_COUNT; row++) {
      for (let col = 0; col < COLS; col++) {
        this.bricks.push({ x: 0, y: 0, w: 0, h: 0, row, alive: true });
      }
    }
  }

  private parkBall() {
    this.ball.x = this.paddleX;
    this.ball.y = this.paddleY - this.radius - 2;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.trail.length = 0;
  }

  private setPhase(next: Phase) {
    if (this.phase === next) return;
    this.phase = next;
    this.hooks.onPhase(next);
  }

  // --- Input --------------------------------------------------------------

  private onPointerMove = (e: PointerEvent) => {
    if (this.locked) return;
    const rect = this.canvas.getBoundingClientRect();
    this.paddleTargetX = e.clientX - rect.left;
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.locked) return;
    const rect = this.canvas.getBoundingClientRect();
    this.paddleTargetX = e.clientX - rect.left;
    this.launch();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    // `P` is the one key that has to work in both directions. Resuming must
    // survive `locked` (the pause panel is up, which is exactly when you'd
    // press it), but pausing must not — otherwise `P` on the intro card swaps
    // it for a pause card for a game nobody has started.
    if (e.key === 'p' || e.key === 'P') {
      if (this.phase === 'paused') this.resume();
      else if (!this.locked) this.pause();
      return;
    }
    if (this.locked) return;

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.keyDir = -1;
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.keyDir = 1;
        e.preventDefault();
        break;
      case ' ':
      case 'Enter':
        // Let the panels' own buttons handle the key when one has focus.
        if (document.activeElement instanceof HTMLButtonElement) return;
        this.launch();
        e.preventDefault();
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const left = e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A';
    const right = e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D';
    if ((left && this.keyDir === -1) || (right && this.keyDir === 1)) this.keyDir = 0;
  };

  /** Tabbing away mid-rally would otherwise cost a life on return. */
  private onVisibility = () => {
    if (document.hidden) this.pause();
  };

  // --- Loop ---------------------------------------------------------------

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);

    const dt = this.last ? Math.min((now - this.last) / 1000, 0.25) : 0;
    this.last = now;

    if (this.phase === 'ready' || this.phase === 'playing') {
      this.acc += dt;
      let steps = 0;
      while (this.acc >= STEP && steps < MAX_STEPS_PER_FRAME) {
        this.simulate(STEP);
        this.acc -= STEP;
        steps++;
      }
      // A long stall (tab wake, GC pause) must not be paid off over the next
      // hundred frames — drop the backlog instead.
      if (steps === MAX_STEPS_PER_FRAME) this.acc = 0;
    }

    this.updateParticles(dt);
    this.shake = Math.max(0, this.shake - dt * 42);
    this.draw();
  };

  private simulate(dt: number) {
    const half = this.paddleW / 2;
    const minX = this.field.x + half;
    const maxX = this.field.x + this.field.w - half;

    if (this.keyDir !== 0) {
      this.paddleTargetX += this.keyDir * this.field.w * 1.35 * dt;
    }
    const target = clamp(this.paddleTargetX, minX, maxX);
    // Chase rather than snap: a tiny lag reads as weight and stops the paddle
    // from teleporting on a fast mouse flick.
    this.paddleX += (target - this.paddleX) * Math.min(1, dt * 28);
    this.paddleTargetX = clamp(this.paddleTargetX, minX, maxX);

    if (this.phase === 'ready') {
      this.parkBall();
      return;
    }

    const b = this.ball;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    const r = this.radius;
    const left = this.field.x + r;
    const right = this.field.x + this.field.w - r;
    const top = this.field.y + r;

    if (b.x < left) {
      b.x = left;
      b.vx = Math.abs(b.vx);
    } else if (b.x > right) {
      b.x = right;
      b.vx = -Math.abs(b.vx);
    }

    if (b.y < top) {
      b.y = top;
      b.vy = Math.abs(b.vy);
      this.onCeiling();
    }

    this.collidePaddle();
    this.collideBricks();

    // Below the paddle line and still falling → life lost.
    if (b.y - r > this.field.y + this.field.h) this.loseLife();

    if (this.trail.length > 7) this.trail.shift();
    this.trail.push({ x: b.x, y: b.y });
  }

  private onCeiling() {
    if (this.ceilingHit) return;
    this.ceilingHit = true;
    // The classic tell that the game just got serious. The 1976 cabinet halved
    // the paddle here; at 0.6 the moment still lands but a first-timer can
    // still plausibly finish a 66-brick rack on three balls, which matters
    // when winning is the whole point of the thing.
    this.paddleW = Math.max(this.paddleW * CEILING_SHRINK, 34);
    this.shake = 5;
  }

  private collidePaddle() {
    const b = this.ball;
    if (b.vy <= 0) return;

    const half = this.paddleW / 2;
    const top = this.paddleY;
    if (b.y + this.radius < top || b.y - this.radius > top + this.paddleH) return;
    if (b.x < this.paddleX - half - this.radius || b.x > this.paddleX + half + this.radius) return;

    b.y = top - this.radius;

    // Where you hit the paddle sets the angle — the whole skill ceiling of
    // Breakout lives in this one line.
    const offset = clamp((b.x - this.paddleX) / half, -1, 1);
    const angle = -Math.PI / 2 + offset * MAX_BOUNCE;
    const speed = Math.hypot(b.vx, b.vy) || this.baseSpeed;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;

    this.paddleHits++;
    if (this.paddleHits === 4 || this.paddleHits === 12) this.bumpSpeed(1.12);
    this.shake = this.calm ? 0 : 2;
  }

  private collideBricks() {
    const b = this.ball;
    const r = this.radius;

    for (const brick of this.bricks) {
      if (!brick.alive) continue;
      if (
        b.x + r < brick.x ||
        b.x - r > brick.x + brick.w ||
        b.y + r < brick.y ||
        b.y - r > brick.y + brick.h
      ) {
        continue;
      }

      // Reflect on whichever axis is least overlapped — that's the face the
      // ball actually came through.
      const overlapX = Math.min(b.x + r - brick.x, brick.x + brick.w - (b.x - r));
      const overlapY = Math.min(b.y + r - brick.y, brick.y + brick.h - (b.y - r));

      if (overlapX < overlapY) {
        b.vx = -b.vx;
        b.x += b.vx > 0 ? overlapX : -overlapX;
      } else {
        b.vy = -b.vy;
        b.y += b.vy > 0 ? overlapY : -overlapY;
      }

      this.breakBrick(brick);
      // One brick per step: chaining two in a single frame produces the
      // "ball reverses twice and exits sideways" bug.
      return;
    }
  }

  private breakBrick(brick: Brick) {
    brick.alive = false;
    this.cleared++;
    this.score += ROWS[brick.row]!.points;
    this.shake = this.calm ? 0 : 3.5;

    if (!this.rowTriggered.has(brick.row) && brick.row <= 1) {
      this.rowTriggered.add(brick.row);
      this.bumpSpeed(1.1);
    }

    this.spawnParticles(brick);

    this.hooks.onScore(this.score);
    this.hooks.onReveal(this.revealed);

    if (this.cleared === BRICK_TOTAL) {
      this.ball.vx = 0;
      this.ball.vy = 0;
      this.setPhase('won');
    }
  }

  /**
   * All four escalations (4 hits, 12 hits, first red, first orange) compound,
   * and a tunnelling player reaches every one of them inside a minute — so the
   * cap is what actually sets the top speed, not the individual factors.
   */
  private bumpSpeed(factor: number) {
    this.speedMult = Math.min(this.speedMult * factor, 1.7);
    const speed = Math.hypot(this.ball.vx, this.ball.vy);
    if (!speed) return;
    const target = this.baseSpeed * this.speedMult;
    this.ball.vx = (this.ball.vx / speed) * target;
    this.ball.vy = (this.ball.vy / speed) * target;
  }

  private loseLife() {
    this.lives--;
    this.hooks.onLives(this.lives);
    this.shake = this.calm ? 0 : 7;

    if (this.lives <= 0) {
      this.ball.vx = 0;
      this.ball.vy = 0;
      this.setPhase('over');
      return;
    }

    this.parkBall();
    this.setPhase('ready');
  }

  // --- Particles ----------------------------------------------------------

  private spawnParticles(brick: Brick) {
    if (this.calm) return;
    const color = ROWS[brick.row]!.color;
    for (let i = 0; i < 7; i++) {
      this.particles.push({
        x: brick.x + Math.random() * brick.w,
        y: brick.y + Math.random() * brick.h,
        vx: (Math.random() - 0.5) * 220,
        vy: (Math.random() - 0.5) * 180 - 40,
        life: 0.45 + Math.random() * 0.3,
        size: 2 + Math.random() * 3,
        color,
      });
    }
    // Cheap ceiling; a wild multi-brick frame can't run the count away.
    if (this.particles.length > 220) this.particles.splice(0, this.particles.length - 220);
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += 620 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  // --- Render -------------------------------------------------------------

  private draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.save();

    if (this.shake > 0.1) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    this.drawBricks();
    this.drawParticles();
    this.drawPaddle();
    this.drawBall();

    ctx.restore();
  }

  private drawBricks() {
    const ctx = this.ctx;
    const r = Math.min(4, this.brickH * 0.28);

    for (const brick of this.bricks) {
      if (!brick.alive) continue;
      // Cached per row: the gradient's stops are in absolute canvas space, and
      // every brick in a row shares a y-extent. Building 66 of these per frame
      // was the one obvious way to make this loop expensive.
      ctx.fillStyle = this.rowGradients[brick.row] ?? ROWS[brick.row]!.color;
      ctx.beginPath();
      ctx.roundRect(brick.x, brick.y, brick.w, brick.h, r);
      ctx.fill();
    }
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life * 2.4);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawPaddle() {
    const ctx = this.ctx;
    const half = this.paddleW / 2;
    const x = this.paddleX - half;
    ctx.save();
    ctx.shadowColor = 'rgba(61, 255, 158, 0.7)';
    ctx.shadowBlur = 22;
    ctx.fillStyle = this.paddleGradient ?? '#3dff9e';
    ctx.beginPath();
    ctx.roundRect(x, this.paddleY, this.paddleW, this.paddleH, this.paddleH / 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBall() {
    const ctx = this.ctx;
    const r = this.radius;
    const size = r * 2;
    // Rounded, not a hard square: the 1976 cabinet drew a raw block, but at
    // this size the corners are the only aliased edges left on the field.
    const round = r * 0.55;

    if (!this.calm) {
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i]!;
        ctx.globalAlpha = ((i + 1) / this.trail.length) * 0.28;
        ctx.fillStyle = '#a8fff0';
        ctx.beginPath();
        ctx.roundRect(t.x - r, t.y - r, size, size, round);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.shadowColor = 'rgba(200, 255, 255, 0.9)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(this.ball.x - r, this.ball.y - r, size, size, round);
    ctx.fill();
    ctx.restore();
  }
}

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

/** Mix a `#rrggbb` toward white (positive) or black (negative) by `amount`. */
function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  const mix = (c: number) => Math.round(c + (target - c) * t);
  return `rgb(${mix((n >> 16) & 255)} ${mix((n >> 8) & 255)} ${mix(n & 255)})`;
}
