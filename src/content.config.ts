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
      /*
        There is deliberately no per-case `accent`. Case studies used to carry
        their own OKLCH hue (Tribute teal, Peterson's green, V3 amber), which
        meant the brand green/yellow was absent from exactly the pages doing the
        most persuading. Everything now reads the global --color-accent and
        --color-accent-warm.
      */
      featured: z.boolean().default(false),
      /** Manual sort. Lower sorts first; ties break on year descending. */
      order: z.number().default(99),
      draft: z.boolean().default(false),

      /*
        "At a glance" — `role` above drives the work index, so these three stay
        separate rather than collapsing into it. All optional: the draft entries
        carry none of them and the layout skips the block entirely.
      */
      scope: z.string().optional(),
      team: z.string().optional(),
      timeline: z.string().optional(),

      /**
       * Skills exercised on this project. Drawn from the résumé's own taxonomy
       * so the wording matches what a recruiter searches for, extended with
       * anything the case study itself evidences. Rendered twice: as tags under
       * the at-a-glance grid, and as the hero's background texture.
       */
      skills: z.array(z.string()).default([]),

      /**
       * The three-or-so things that actually changed, rendered directly under
       * the at-a-glance block — before the body, not after it.
       *
       * Separate from `metrics` on purpose. `metrics` is the numbers band at
       * the foot of the page; this is the answer to "did it work?" for someone
       * who will never scroll that far. `label` carries the claim, `detail` the
       * one line of context that makes it mean something. A claim does not have
       * to be numeric — a strategic finding counts.
       */
      impact: z
        .array(
          z.object({
            label: z.string(),
            detail: z.string(),
          }),
        )
        .default([]),

      /**
       * Headline numbers rendered in the band below the body. `description` is
       * the qualifier that sits above the label ("Record Flow" / "Completion
       * Rate"); without it the label stands alone.
       */
      metrics: z
        .array(
          z.object({
            value: z.string(),
            label: z.string(),
            description: z.string().optional(),
          }),
        )
        .optional(),

      liveSiteUrl: z.url().optional(),
      liveSiteText: z.string().optional(),

      /*
        Process-gallery images are discovered by convention, not listed here —
        `src/assets/work/<slug>/<slug>-gallery-N.webp`. Twenty-one entries of
        frontmatter for Greetings alone is not worth the type safety.
      */
    }),
});

export const collections = { work };
