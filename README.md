# portfolio-2026

Personal portfolio for Adam Robertson — product designer & developer, Brooklyn.

Astro 7 (static) · Svelte 5 islands · Tailwind v4 · GSAP + Lenis · MDX content collections · Netlify.

## Getting started

Requires **Node 22+** (Astro 7) and **Bun 1.3+**.

```sh
nvm use          # reads .node-version
bun install
bun run dev      # http://localhost:4321
```

The dev server daemonizes — manage it with `astro dev stop | status | logs`.

| Command           | Action                          |
| ----------------- | ------------------------------- |
| `bun run dev`     | Dev server                      |
| `bun run build`   | Static build to `dist/`         |
| `bun run preview` | Serve the production build      |
| `bun run check`   | Type-check `.astro` / `.ts`     |

## Structure

```
src/
├── assets/work/        cover images (Astro-optimised)
├── components/         Nav, Footer, WorkCard, Cursor.svelte, mdx/
├── content/work/       case studies (.mdx)
├── layouts/            BaseLayout
├── lib/motion/         GSAP + Lenis motion system
├── pages/              /, /work, /work/[...slug]
└── styles/global.css   Tailwind v4 @theme tokens
```

## Current state

This is a **scaffold**. Structure, motion system, and templates are production
quality; **all copy, metrics, and cover images are placeholders** and need
replacing. Case study covers are generated gradients, not real work.

Verified: 100 Lighthouse accessibility / best-practices / SEO on home and case
study, LCP 89ms, CLS 0.03, no horizontal overflow at 390px, and full content
visibility under `prefers-reduced-motion`.

## Deploying

`netlify.toml` pins the build command, `NODE_VERSION`, and `BUN_VERSION`
(Netlify's Bun autodetection looks for `bun.lockb` and won't fire on Bun 1.2+'s
text `bun.lock`).

```sh
netlify deploy --build          # preview URL
netlify deploy --build --prod   # production
```

See [`AGENTS.md`](./AGENTS.md) for architecture notes and toolchain constraints.
