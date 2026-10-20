export type Oklch = readonly [lightness: number, chroma: number, hue: number];
export type Theme = 'light' | 'dark';

const SELECTOR: Record<Theme, string> = { light: ':root', dark: '.dark' };

/** Only opaque `oklch(L C H)` values are read: a token with alpha has no single colour to compare, so asking for one
 *  fails loudly. */
function tokensUnder(css: string, selector: string): Map<string, Oklch> {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`).exec(source);
  if (!rule) throw new Error(`the stylesheet has no ${selector} rule`);
  const tokens = new Map<string, Oklch>();
  for (const m of rule[1].matchAll(/--quoin-([\w-]+)\s*:\s*oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)\s*;/g)) {
    tokens.set(m[1], [Number(m[2]), Number(m[3]), Number(m[4])]);
  }
  return tokens;
}

/** Looks a `--quoin-` token up by its name without the prefix, in the `:root` (light) or `.dark` rule. */
export function tokenReader(css: string): (theme: Theme, name: string) => Oklch {
  const themes = { light: tokensUnder(css, SELECTOR.light), dark: tokensUnder(css, SELECTOR.dark) };
  return (theme, name) => {
    const value = themes[theme].get(name);
    if (!value) throw new Error(`--quoin-${name} is not an opaque oklch() token in the ${theme} theme`);
    return value;
  };
}

function oklchToLinearSrgb([L, C, h]: Oklch): [number, number, number] {
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

type Rgb = readonly [number, number, number];

const clip = (x: number) => Math.min(1, Math.max(0, x));

/** Gamut clipped, as a browser paints an out of range OKLCH value. */
function linearRgb(color: Oklch): Rgb {
  const [r, g, b] = oklchToLinearSrgb(color);
  return [clip(r), clip(g), clip(b)];
}

const luminance = ([r, g, b]: Rgb): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const encode = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
const decode = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);

function ratio(a: number, b: number): number {
  const [hi, lo] = [a, b].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The WCAG 2 contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(a: Oklch, b: Oklch): number {
  return ratio(luminance(linearRgb(a)), luminance(linearRgb(b)));
}

/** The contrast of text on a wash of `alpha` opacity over the page, blended in encoded sRGB as a browser paints it. */
export function contrastOnWash(text: Oklch, wash: Oklch, alpha: number, page: Oklch): number {
  const [top, bottom] = [wash, page].map((color) => linearRgb(color).map(encode));
  const blend = (index: number) => decode(top[index] * alpha + bottom[index] * (1 - alpha));
  return ratio(luminance(linearRgb(text)), luminance([blend(0), blend(1), blend(2)]));
}
