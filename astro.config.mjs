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
  },
});
