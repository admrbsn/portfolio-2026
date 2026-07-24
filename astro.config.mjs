// @ts-check
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://adamrobertson.co',
  output: 'static',

  integrations: [svelte(), mdx(), sitemap()],

  // Astro 7 defaults compressHTML to 'jsx', which strips whitespace between
  // inline elements. That breaks display type like `<span>x</span> <em>y</em>`,
  // so it stays off — the delta is negligible next to Brotli on Netlify.
  compressHTML: false,

  vite: {
    plugins: [tailwindcss()],
    // Sharp is a native module. Left to Vite, the dev server's SSR pipeline
    // tries to process it and breaks its binding — Astro's image endpoint then
    // reports "MissingSharp" and every optimised <Image> shows broken in dev
    // (the production build is unaffected). Externalising it makes dev require
    // the real native module, so images work locally too.
    ssr: { external: ['sharp'] },
    optimizeDeps: { exclude: ['sharp'] },
  },
});
