import type { APIRoute } from 'astro';
import { surfaceHex } from '../lib/brand';

/*
  Generated rather than a static file in `public/`, so its colours come from the
  same tokens the site paints with instead of a copy that quietly goes stale.
*/
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        name: 'Adam Robertson',
        short_name: 'Adam R.',
        description: 'Product designer and developer in Colorado.',
        start_url: '/',
        display: 'standalone',
        background_color: surfaceHex,
        theme_color: surfaceHex,
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      null,
      2,
    ),
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
