/**
 * Token values resolved to hex, for the places that cannot read CSS.
 *
 * `<meta name="theme-color">` and the web app manifest take literal colours —
 * they are read by the browser chrome and the OS, not by the stylesheet. Rather
 * than hardcode them (and let them drift the moment `--color-surface` moves),
 * they are parsed out of `global.css` at build time with the same converter the
 * styleguide and the token check use.
 */

import css from '../styles/global.css?raw';
import { parseOklch, toHex } from './color';

function hexOf(token: string): string {
  const raw = css.match(new RegExp(`${token}:\\s*([^;]+);`))?.[1];
  const parsed = raw ? parseOklch(raw.trim()) : null;
  if (!parsed) throw new Error(`brand: could not resolve ${token} from global.css`);
  return toHex(parsed);
}

export const surfaceHex = hexOf('--color-surface');
export const accentHex = hexOf('--color-accent');
