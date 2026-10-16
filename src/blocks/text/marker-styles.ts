const BULLETS = ['\u2022', '\u25E6', '\u25AA'] as const;

const ROMAN: readonly (readonly [number, string])[] = [
  [1000, 'm'],
  [900, 'cm'],
  [500, 'd'],
  [400, 'cd'],
  [100, 'c'],
  [90, 'xc'],
  [50, 'l'],
  [40, 'xl'],
  [10, 'x'],
  [9, 'ix'],
  [5, 'v'],
  [4, 'iv'],
  [1, 'i'],
];

const MAX_ROMAN = 3999;
const LETTERS = 26;
const FIRST_LETTER = 'a'.charCodeAt(0);

const cycleOf = (depth: number): number => Math.max(0, depth) % 3;

const decimal = (n: number): string => String(n);

function lowerAlpha(n: number): string {
  if (n < 1) return decimal(n);
  let letters = '';
  for (let rest = n; rest > 0; rest = Math.floor((rest - 1) / LETTERS)) {
    letters = String.fromCharCode(FIRST_LETTER + ((rest - 1) % LETTERS)) + letters;
  }
  return letters;
}

function lowerRoman(n: number): string {
  if (n < 1 || n > MAX_ROMAN) return decimal(n);
  let numeral = '';
  let rest = n;
  for (const [value, symbols] of ROMAN) {
    for (; rest >= value; rest -= value) numeral += symbols;
  }
  return numeral;
}

const COUNTERS = [decimal, lowerAlpha, lowerRoman] as const;

export function bulletGlyph(depth: number): string {
  return BULLETS[cycleOf(depth)];
}

export function orderedLabel(n: number, depth: number): string {
  return `${COUNTERS[cycleOf(depth)](n)}.`;
}
