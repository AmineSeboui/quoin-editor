import { PALETTE } from '../markdown/palette';
import { PALETTE_RGB, type PaletteKind, type PaletteName, type Rgb } from '../markdown/palette-rgb';

export type StyleMap = ReadonlyMap<string, string>;

const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTION = /^rgba?\(([^)]*)\)$/i;
const SEPARATORS = /[\s,/]+/;

export function parseStyle(style: string | null): StyleMap {
  const declarations = new Map<string, string>();
  for (const declaration of (style ?? '').split(';')) {
    const colon = declaration.indexOf(':');
    if (colon < 0) continue;
    const value = declaration.slice(colon + 1).replace(/!important\s*$/i, '').trim().toLowerCase();
    declarations.set(declaration.slice(0, colon).trim().toLowerCase(), value);
  }
  return declarations;
}

export function fontWeight(styles: StyleMap): number | null {
  const value = styles.get('font-weight');
  if (value === undefined) return null;
  if (value === 'bold' || value === 'bolder') return 700;
  if (value === 'normal') return 400;
  if (value === 'lighter') return 300;
  const weight = Number(value);
  return Number.isFinite(weight) ? weight : null;
}

export function isItalicStyle(styles: StyleMap): boolean | null {
  const value = styles.get('font-style');
  if (value === undefined) return null;
  if (value === 'normal') return false;
  return value === 'italic' || value.startsWith('oblique') ? true : null;
}

const PRESERVING = new Set(['pre', 'pre-wrap', 'break-spaces']);
const COLLAPSING = new Set(['normal', 'nowrap', 'pre-line']);
const MONOSPACE = /\b(?:monospace|menlo|monaco|consolas|courier)\b/;

export function keepsWhitespace(styles: StyleMap): boolean | null {
  const value = styles.get('white-space');
  if (value === undefined) return null;
  if (PRESERVING.has(value)) return true;
  return COLLAPSING.has(value) ? false : null;
}

export const isMonospace = (styles: StyleMap): boolean => MONOSPACE.test(styles.get('font-family') ?? '');

export function hasDecoration(styles: StyleMap, line: 'underline' | 'line-through'): boolean {
  return (styles.get('text-decoration') ?? '').includes(line) || (styles.get('text-decoration-line') ?? '').includes(line);
}

export function verticalAlign(styles: StyleMap): 'sub' | 'super' | null {
  const value = styles.get('vertical-align');
  return value === 'sub' || value === 'super' ? value : null;
}

function channel(value: string): number {
  return value.endsWith('%') ? parseFloat(value) * 2.55 : parseFloat(value);
}

function fromHex(digits: string): { rgb: Rgb; alpha: number } {
  const full = digits.length <= 4 ? [...digits].map((digit) => digit + digit).join('') : digits;
  const byte = (at: number) => parseInt(full.slice(at, at + 2), 16);
  return { rgb: [byte(0), byte(2), byte(4)], alpha: full.length === 8 ? byte(6) / 255 : 1 };
}

function fromFunction(args: string): { rgb: Rgb; alpha: number } | null {
  const parts = args.trim().split(SEPARATORS).filter(Boolean);
  if (parts.length < 3) return null;
  const [r, g, b] = parts.slice(0, 3).map(channel);
  const alpha = parts[3] === undefined ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
  if ([r, g, b, alpha].some(Number.isNaN)) return null;
  return { rgb: [r, g, b], alpha };
}

function parseColor(css: string): Rgb | null {
  const value = css.trim();
  const hex = HEX.exec(value);
  const functional = FUNCTION.exec(value);
  const parsed = hex ? fromHex(hex[1]) : functional ? fromFunction(functional[1]) : null;
  return parsed === null || parsed.alpha === 0 ? null : parsed.rgb;
}

function distance(a: Rgb, b: Rgb): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

// A fully saturated #0000ff highlight lies 323 from the blue background and a dark red 339 from the brown one, so
// 330 keeps every tinted version of a palette colour and rejects colours that only happen to be nearest.
const MAX_PALETTE_DISTANCE = 330;
const NEUTRAL_CHROMA = 24;
const LIGHT_TEXT = 200;
const WHITE_SURFACE = 244;
const DARK_SURFACE = 128;

// Page surfaces: light text on a dark page, and white or dark grey backgrounds. Every palette value sits outside
// them, so palette colours still map to themselves.
function isSurface([r, g, b]: Rgb, kind: PaletteKind): boolean {
  const high = Math.max(r, g, b);
  const low = Math.min(r, g, b);
  const neutral = high - low <= NEUTRAL_CHROMA;
  if (kind === 'text') return neutral && (high + low) / 2 > LIGHT_TEXT;
  return low >= WHITE_SURFACE || (neutral && (high + low) / 2 < DARK_SURFACE);
}

export function nearestPaletteColor(css: string, kind: PaletteKind): string | null {
  const rgb = parseColor(css);
  if (rgb === null || isSurface(rgb, kind)) return null;
  const table = PALETTE_RGB[kind];
  let best: PaletteName = 'default';
  let least = Infinity;
  for (const name of PALETTE) {
    for (const reference of table[name]) {
      const gap = distance(rgb, reference);
      if (gap < least) {
        least = gap;
        best = name;
      }
    }
  }
  return best === 'default' || least > MAX_PALETTE_DISTANCE ** 2 ? null : best;
}
