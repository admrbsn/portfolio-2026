/**
 * Tool marks for /how-i-work, as bare SVG paths.
 *
 * Five come from Simple Icons (`simple-icons`, CC0) and are read at build
 * time — this module is only ever imported from component frontmatter, so the
 * package never reaches a client bundle. Three are not in Simple Icons and
 * come from each company's own site, wordmark and fills dropped, so they render
 * in the same single-colour form as the rest:
 *
 * - Relume — the hexagon from the logo relume.io serves in its navbar.
 * - Fern — the leaf from the inline logo in buildwithfern.com's header.
 * - Slack — the octothorpe from slack.com's nav logo. Slack's mark was removed
 *   from Simple Icons at Slack's request; its guidelines allow a one-colour
 *   mark but not recolouring it, so it stays monochrome like everything here.
 *
 * All of them render in `currentColor`, never brand colours: these are
 * references to tools on a site with one palette, and seven brand hues side by
 * side would be a logo wall rather than a diagram. Trademarks belong to their
 * owners; they are used here only to name the tools.
 */
import { siClaude, siFigma, siGithub, siLinear, siNotion, siPosthog } from 'simple-icons';

export type Brand = 'claude' | 'clawd' | 'fern' | 'figma' | 'github' | 'linear' | 'notion' | 'posthog' | 'relume' | 'slack';

export const brands: Record<Brand, { title: string; path: string; viewBox: string }> = {
  claude: { title: siClaude.title, path: siClaude.path, viewBox: '0 0 24 24' },
  // Clawd, the Claude Code mascot, on its own 16×12 pixel grid: one outline
  // (body, arms and four legs as a single union, so evenodd can't punch holes
  // where the parts overlap) plus the two eyes as evenodd holes. Rendered
  // crisp — see `.pixel` on its consumers.
  clawd: {
    title: 'Claude Code',
    path: 'M2 2H14V6H16V8H14V10H13V12H12V10H11V12H10V10H6V12H5V10H4V12H3V10H2V8H0V6H2Z M4 4H5V6H4Z M11 4H12V6H11Z',
    viewBox: '0 0 16 12',
  },
  figma: { title: siFigma.title, path: siFigma.path, viewBox: '0 0 24 24' },
  github: { title: siGithub.title, path: siGithub.path, viewBox: '0 0 24 24' },
  linear: { title: siLinear.title, path: siLinear.path, viewBox: '0 0 24 24' },
  notion: { title: siNotion.title, path: siNotion.path, viewBox: '0 0 24 24' },
  posthog: { title: siPosthog.title, path: siPosthog.path, viewBox: '0 0 24 24' },
  fern: {
    title: 'Fern',
    path: 'M22.7885 11.6883C21.2166 10.3594 18.8485 9.82661 16.7497 11.378C16.6531 11.4483 16.5331 11.3283 16.6063 11.2346C17.1039 10.5935 17.6806 9.90272 18.146 9.20898C18.6202 8.49767 19.3286 7.98833 20.1453 7.73952C24.4922 6.42228 23.1866 0 23.1866 0C23.1866 0 16.4716 0.433226 17.3 6.22616C17.4376 7.19506 17.18 8.18153 16.5741 8.95138C15.8306 9.89101 14.967 10.7897 14.3406 11.4395C14.2089 11.5742 13.9864 11.4454 14.0391 11.2639C14.645 9.22361 15.0871 6.06809 12.9882 4.03368L10.0347 1.58069L9.46681 2.33005C7.7778 4.55765 8.2725 7.69854 10.503 9.38461C11.7822 10.3506 12.3618 11.4014 12.2711 12.5548C12.2155 13.2456 11.9022 13.8925 11.4339 14.4048C10.5528 15.3707 9.73026 16.407 9.09505 17.6071C9.00723 17.774 8.75257 17.7096 8.76135 17.5193C8.85209 15.5376 8.66182 11.0707 5.3248 9.47535L1.58968 8.03224L1.29988 8.89576C0.360249 11.6825 1.89704 14.6594 4.68081 15.6049C7.10162 16.4275 7.96515 17.9877 7.38263 20.3265C7.35629 20.4114 6.93477 22.8205 6.99331 23.8889H9.67757C9.76831 22.2321 11.5071 21.1432 13.0146 21.8194C13.439 22.0096 13.8752 22.2819 14.3231 22.6331C16.7234 24.5241 20.2594 24.0762 22.1475 21.673L22.6861 20.988L19.2905 18.5497C16.9605 16.7172 13.8518 17.5456 11.551 19.1146C11.3578 19.2463 11.1119 19.0356 11.2202 18.8248C14.0011 13.3685 17.6162 13.3802 19.0329 14.5921C20.7512 16.0616 23.3535 15.7981 24.8113 14.074L25.2298 13.5793L22.7856 11.6883H22.7885Z',
    viewBox: '0 0 26 25',
  },
  slack: {
    title: 'Slack',
    path: 'M11.379 33.9993C11.379 37.1358 8.84512 39.6507 5.7276 39.6507C2.61008 39.6507 0.0572205 37.1168 0.0572205 33.9993C0.0572205 30.8817 2.5911 28.3479 5.70862 28.3479H11.36V33.9993H11.379ZM14.1962 33.9997C14.1962 30.8632 16.7301 28.3483 19.8476 28.3483C22.9651 28.3483 25.499 30.8822 25.499 33.9997V48.1353C25.499 51.2718 22.9651 53.7867 19.8476 53.7867C16.7301 53.7867 14.1962 51.2718 14.1962 48.1353V33.9997ZM19.8662 11.2673C16.7296 11.2673 14.2148 8.73347 14.2148 5.61594C14.2148 2.49842 16.7486 -0.0354538 19.8662 -0.0354538C22.9837 -0.0354538 25.5175 2.49842 25.5175 5.61594V11.2673H19.8662ZM19.8682 14.1334C23.0047 14.1334 25.5196 16.6673 25.5196 19.7848C25.5196 22.9023 22.9857 25.4362 19.8682 25.4362H5.67566C2.53916 25.4362 0.0242615 22.9023 0.0242615 19.7848C0.0242615 16.6673 2.55814 14.1334 5.67566 14.1334H19.8682ZM42.5323 19.7853C42.5323 16.6488 45.0662 14.1339 48.1837 14.1339C51.3012 14.1339 53.8351 16.6678 53.8351 19.7853C53.8351 22.9028 51.3012 25.4367 48.1837 25.4367H42.5323V19.7853ZM39.7126 19.7934C39.7126 22.9299 37.1787 25.4448 34.0612 25.4448C30.9436 25.4448 28.4098 22.911 28.4098 19.7934V5.61986C28.4098 2.48336 30.9436 -0.0315399 34.0612 -0.0315399C37.1787 -0.0315399 39.7126 2.48336 39.7126 5.61986V19.7934ZM34.0376 42.482C37.1741 42.482 39.689 45.0158 39.689 48.1334C39.689 51.2509 37.1552 53.7848 34.0376 53.7848C30.9201 53.7848 28.3862 51.2509 28.3862 48.1334V42.482H34.0376ZM34.0381 39.6507C30.9016 39.6507 28.3867 37.1168 28.3867 33.9993C28.3867 30.8818 30.9206 28.3479 34.0381 28.3479H48.2306C51.3671 28.3479 53.882 30.8818 53.882 33.9993C53.882 37.1168 51.3482 39.6507 48.2306 39.6507H34.0381Z',
    viewBox: '0 0 54 54',
  },
  relume: {
    title: 'Relume',
    path: 'M24.4186 6.5V19.5L13.0006 26L1.5814 19.5V6.5L13.0006 0L24.4186 6.5ZM4.52009 8.17247V17.8275L13.0006 22.6551V13L21.481 8.17247L13.0006 3.34494L4.52009 8.17247Z',
    viewBox: '0 0 26 26',
  },
};
