/**
 * Generates public/adam-robertson-resume.pdf — `bun run make:resume`.
 *
 * The résumé used to come out of a third-party builder set in Roboto Mono,
 * with no source in this repo. It is now an HTML page printed by headless
 * Chrome, set in the site's own families, and its work history is read from
 * src/data/experience.ts so the PDF and the site cannot drift apart.
 *
 * Type roles follow the site: Mattone for the name only, Geist for everything
 * read, Geist Mono for the small uppercase labels and the dates. Instrument
 * Serif is left out — an italic accent has no job on a résumé.
 *
 * Geist comes from the *static* @fontsource packages, not the variable ones
 * the site uses: Chrome's PDF backend embeds a variable font as Type 3
 * glyph drawings, which some ATS parsers read badly. Static TrueType embeds
 * as a real font. Mattone is CFF and lands as Type 3 regardless; it sets the
 * name alone, and the text still extracts.
 *
 * One scale rule worth keeping: every entry is a heading line plus a detail
 * line, and the detail line is body size whatever the section. The builder
 * set the education degree at heading size, which made it the largest text on
 * its page.
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { experience, splitLead } from '../src/data/experience';

// `import.meta.url`, not Bun's `import.meta.dir` — the latter fails `astro check`.
const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const OUT = join(ROOT, 'public/adam-robertson-resume.pdf');
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const font = (p: string) => pathToFileURL(join(ROOT, p)).href;

/** The site's accent pair is tuned for a dark page; this is the print-safe
 *  blue-purple between them, the same one the builder PDF was recoloured to. */
const ACCENT = '#5152c1';

const contact = [
  'He/him/his',
  '8240 W Walker Dr, Littleton, CO',
  '303-913-6618',
  '<a href="mailto:hi@adamrobertson.co">hi@adamrobertson.co</a>',
  '<a href="https://linkedin.com/in/admrbsn">linkedin.com/in/admrbsn</a>',
  '<a href="https://adamrobertson.co">adamrobertson.co</a>',
];

const summary =
  'Hands-on product designer and design leader with 20+ years designing, building, and shipping digital products. I specialize in end-to-end product design, complex systems, and AI-enabled experiences, moving from discovery and prototyping through production TypeScript. At Tribute, I led and designed a platform rebuild that drove 20x growth in two years, while funnel and lifecycle improvements increased conversion by more than 30%.';

/** Résumé-only framing for the one entry whose "company" is a client list. */
const companyLabel: Record<string, string> = {
  'Droplr, ETHDenver, Inspirato': 'Selected clients: Droplr, ETHDenver, Inspirato',
};

const skills: [string, string][] = [
  [
    'AI Product Design',
    'agentic workflows, AI-assisted research and prototyping, AI-enabled and conversational experiences, human-in-the-loop controls, prompt design and evaluation, trust and error recovery',
  ],
  [
    'Product & Design Leadership',
    'Accessibility, Agile/Scrum, Cross-functional leadership, Design mentorship, Design sprints, Design systems & design tokens, Early-stage startup experience, Executive communication, Jobs to be done (JTBD), Lean UX, Product design & strategy, Qualitative research, Roadmap planning, Usability testing, User journey mapping, UX research & experimentation',
  ],
  [
    'Frontend & Systems',
    'Design documentation, Frontend architecture, Git/GitHub, HTML, CSS/SCSS, iOS and responsive design, JavaScript (Vue, React, Typescript), Performance optimization, REST APIs, Tailwind, DaisyUI, Shadcn, TypeScript',
  ],
  [
    'Analytics & Growth',
    'Cohort analysis, Conversion optimization, Funnel analysis, Google Analytics 4 (GA4), Growth design, PostHog (events, product analytics, HogQL), Product analytics & A/B testing, User activation & retention',
  ],
  [
    'Tools & Platforms',
    'Claude Code, Cursor, Figma, Framer, Headless CMS, Lovable.dev, Maze, Maze (user testing, surveys), Rapid prototyping, Relume (sitemaps, flows), Webflow, Wordpress',
  ],
  ['Bonus Skill', 'Explaining what I do at work to my dog, with full eye contact'],
];

const awards: [string, string][] = [
  ['Award of Excellence in the Food & Beverage Category', 'Communicator Award'],
  ['Award of Visual Appeal', 'Communicator Award'],
  ['Outstanding Visual Design', 'Davey Awards'],
];

const education: [string, string][] = [['Ohio Northern University', 'Bachelor of Arts in Foreign Affairs']];

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const entries = (rows: [string, string][]) =>
  rows
    .map(([title, detail]) => `<div class="entry"><h3>${esc(title)}</h3><p class="detail">${esc(detail)}</p></div>`)
    .join('');

const jobs = experience
  .map((job) => {
    const points = job.points
      .map((p) => {
        const { lead, rest } = splitLead(p);
        return `<li>${lead ? `<strong>${esc(lead)}:</strong> ` : ''}${esc(rest)}</li>`;
      })
      .join('');
    return `<div class="job">
      <h3>${esc(job.role)}</h3>
      <div class="meta">
        <span class="company">${esc(companyLabel[job.company] ?? job.company)}</span>
        <span class="where">${esc(job.location)} · ${esc(job.period)}</span>
      </div>
      <ul>${points}</ul>
    </div>`;
  })
  .join('');

const html = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Adam Robertson – Résumé</title>
<style>
  @font-face { font-family: 'Mattone'; src: url('${font('src/assets/fonts/mattone/mattone-bold.woff2')}') format('woff2'); font-weight: 700; }
  @font-face { font-family: 'Geist'; src: url('${font('node_modules/@fontsource/geist/files/geist-latin-400-normal.woff2')}') format('woff2'); font-weight: 400; }
  @font-face { font-family: 'Geist'; src: url('${font('node_modules/@fontsource/geist/files/geist-latin-500-normal.woff2')}') format('woff2'); font-weight: 500; }
  @font-face { font-family: 'Geist'; src: url('${font('node_modules/@fontsource/geist/files/geist-latin-600-normal.woff2')}') format('woff2'); font-weight: 600; }
  @font-face { font-family: 'Geist Mono'; src: url('${font('node_modules/@fontsource/geist-mono/files/geist-mono-latin-500-normal.woff2')}') format('woff2'); font-weight: 500; }

  @page { size: letter; margin: 0.6in 0.75in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: 'Geist', sans-serif;
    font-size: 9.75pt;
    line-height: 1.4;
    color: #16161a;
    /* Ligatures stay off so ATS text extraction never sees a fused "fi". */
    font-variant-ligatures: none;
  }
  a { color: inherit; text-decoration: none; }
  strong { font-weight: 600; }

  .name {
    font-family: 'Mattone', sans-serif;
    font-weight: 700;
    font-size: 20pt;
    line-height: 1.1;
    letter-spacing: -0.01em;
    color: ${ACCENT};
  }
  .contact { margin-top: 8pt; font-size: 9pt; color: #45454d; }
  .contact span { white-space: nowrap; }
  .contact span + span::before { content: '·'; margin: 0 0.55em; color: #a0a0aa; }
  .headline { margin-top: 14pt; font-size: 12pt; font-weight: 600; letter-spacing: -0.005em; }
  .summary { margin-top: 5pt; }

  section { margin-top: 18pt; }
  h2 {
    font-family: 'Geist Mono', monospace;
    font-weight: 500;
    font-size: 8pt;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${ACCENT};
    padding-bottom: 4pt;
    border-bottom: 0.75pt solid #d8d8e4;
    margin-bottom: 10pt;
    break-after: avoid;
  }
  h3 { font-size: 10.5pt; font-weight: 600; line-height: 1.3; letter-spacing: -0.005em; }

  .job { break-inside: avoid; }
  .job + .job { margin-top: 12pt; }
  .meta { display: flex; justify-content: space-between; align-items: baseline; gap: 1.5em; margin-top: 1pt; }
  .company { font-weight: 500; color: #33333a; }
  .where {
    font-family: 'Geist Mono', monospace;
    font-size: 7.75pt;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #6a6a74;
    white-space: nowrap;
  }
  ul { list-style: none; margin-top: 4pt; }
  li { position: relative; padding-left: 12pt; }
  li + li { margin-top: 2.5pt; }
  li::before { content: ''; position: absolute; left: 2pt; top: 0.56em; width: 3.5pt; height: 3.5pt; background: ${ACCENT}; border-radius: 1pt; }

  .skills p + p { margin-top: 5pt; }

  .entry { break-inside: avoid; }
  .entry + .entry { margin-top: 8pt; }
  .detail { color: #33333a; }
</style>
</head>
<body>
  <header>
    <h1 class="name">Adam Robertson</h1>
    <p class="contact">${contact.map((c) => `<span>${c}</span>`).join('')}</p>
    <p class="headline">Design Leader &amp; Full-Stack Product Designer</p>
    <p class="summary">${esc(summary)}</p>
  </header>

  <section><h2>Work Experience</h2>${jobs}</section>

  <section class="skills"><h2>Skills</h2>
    ${skills.map(([k, v]) => `<p><strong>${esc(k)}:</strong> ${esc(v)}</p>`).join('')}
  </section>

  <section><h2>Awards &amp; Scholarships</h2>${entries(awards)}</section>

  <section><h2>Education</h2>${entries(education)}</section>
</body>
</html>`;

const dir = mkdtempSync(join(tmpdir(), 'resume-'));
const page = join(dir, 'resume.html');
writeFileSync(page, html);

execFileSync(
  CHROME,
  [
    '--headless',
    '--disable-gpu',
    '--no-pdf-header-footer',
    '--allow-file-access-from-files',
    // Fonts are file:// URLs; give them time to land before the print.
    '--virtual-time-budget=5000',
    `--print-to-pdf=${OUT}`,
    pathToFileURL(page).href,
  ],
  { stdio: ['ignore', 'ignore', 'inherit'] },
);
console.log(`wrote ${OUT}`);
