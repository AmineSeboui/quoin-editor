import css from '../styles.css?raw';

type Rgb = [number, number, number];
type Theme = 'light' | 'dark';

const BLOCK: Record<Theme, string> = { light: ':root', dark: '.dark' };

/** The token blocks of `src/styles.css`, read as written. Only opaque `oklch(L C H)` values are
 *  parsed: a token with alpha has no single colour to compare, so asking for one fails loudly. */
function tokensOf(theme: Theme): Record<string, [number, number, number]> {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const block = new RegExp(`${BLOCK[theme].replace('.', '\\.')}\\s*\\{([^}]*)\\}`).exec(source);
  if (!block) throw new Error(`styles.css has no ${BLOCK[theme]} block`);
  const out: Record<string, [number, number, number]> = {};
  for (const m of block[1].matchAll(/--quoin-([\w-]+)\s*:\s*oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)\s*;/g)) {
    out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return out;
}

function oklchToLinear([L, C, h]: [number, number, number]): Rgb {
  const hr = (h * Math.PI) / 180;
  const a = C * Math.cos(hr);
  const b = C * Math.sin(hr);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** Gamut clipped, as a browser paints an out of range OKLCH value. */
function luminance(color: [number, number, number]): number {
  const [r, g, b] = oklchToLinear(color).map((x) => Math.min(1, Math.max(0, x)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function token(theme: Theme, name: string): [number, number, number] {
  const value = tokensOf(theme)[name];
  if (!value) throw new Error(`--quoin-${name} is not an opaque oklch() token in the ${theme} theme`);
  return value;
}

/** The surface behind a highlighted row in a menu, a select and the palette. */
const HIGHLIGHT = 'accent';

describe('contrast helper', () => {
  it('measures black on white as 21:1', () => {
    expect(contrast([0, 0, 0], [1, 0, 0])).toBeCloseTo(21, 5);
  });

  it('measures mid grey on white as the published 4.74:1', () => {
    expect(contrast([0.556, 0, 0], [1, 0, 0])).toBeCloseTo(4.74, 1);
  });
});

describe.each<Theme>(['light', 'dark'])('%s theme', (theme) => {
  it('draws the focus ring at 3:1 or more against the page', () => {
    expect(contrast(token(theme, 'ring'), token(theme, 'background'))).toBeGreaterThanOrEqual(3);
  });

  it('draws the focus ring at 3:1 or more against a popover', () => {
    expect(contrast(token(theme, 'ring'), token(theme, 'popover'))).toBeGreaterThanOrEqual(3);
  });

  it('keeps destructive text at 4.5:1 or more on a highlighted row', () => {
    expect(contrast(token(theme, 'destructive'), token(theme, HIGHLIGHT))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps muted text at 4.5:1 or more on a highlighted row', () => {
    expect(contrast(token(theme, 'muted-foreground'), token(theme, HIGHLIGHT))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps muted text at 4.5:1 or more on the page and on a popover', () => {
    expect(contrast(token(theme, 'muted-foreground'), token(theme, 'background'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token(theme, 'muted-foreground'), token(theme, 'popover'))).toBeGreaterThanOrEqual(4.5);
  });

  it('draws the highlight bar at 3:1 or more against the row and its popover', () => {
    expect(contrast(token(theme, 'foreground'), token(theme, HIGHLIGHT))).toBeGreaterThanOrEqual(3);
    expect(contrast(token(theme, 'foreground'), token(theme, 'popover'))).toBeGreaterThanOrEqual(3);
  });
});
