import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const work = defineCollection({
  loader: glob({ base: './src/content/work', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      client: z.string(),
      year: z.number().int(),
      role: z.array(z.string()),
      /** One-line hook used on the work index and in social cards. */
      summary: z.string(),
      cover: image(),
      coverAlt: z.string(),
      /** Per-case-study accent, as an OKLCH string. Falls back to --color-accent. */
      accent: z.string().optional(),
      featured: z.boolean().default(false),
      /** Manual sort. Lower sorts first; ties break on year descending. */
      order: z.number().default(99),
      draft: z.boolean().default(false),
    }),
});

export const collections = { work };
