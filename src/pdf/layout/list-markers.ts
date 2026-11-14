import type { PageCanvas } from '../paint/page-canvas';
import { paintLine } from '../paint/paint-line';
import { glyphItems } from '../text/glyph-items';
import { layoutLines } from '../text/line-layout';
import { BODY, INK, LINK, MUTED, rgbOf, type TextStyle } from '../text/text-style';
import type { LayoutContext } from './layout-context';

export type ListMarker =
  | { readonly kind: 'bullet'; readonly level: number }
  | { readonly kind: 'number'; readonly value: number; readonly level: number }
  | { readonly kind: 'task'; readonly checked: boolean };

/** The room a list keeps before its items for their markers. */
export const MARKER_GUTTER = 18;

const WHITE = rgbOf('FFFFFF');

const ROMAN: readonly [number, string][] = [
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

function letters(value: number): string {
  let out = '';
  for (let rest = value; rest > 0; rest = Math.floor((rest - 1) / 26)) out = String.fromCharCode(97 + ((rest - 1) % 26)) + out;
  return out;
}

function roman(value: number): string {
  let rest = value;
  return ROMAN.map(([amount, numeral]) => {
    const times = Math.floor(rest / amount);
    rest -= times * amount;
    return numeral.repeat(times);
  }).join('');
}

/** The number of an ordered item at a nesting level: decimal, then letters, then roman numerals, as Word numbers them. */
export function itemNumber(value: number, level: number): string {
  const kind = level % 3;
  if (value < 1 || (kind === 2 && value >= 4000) || kind === 0) return `${value}.`;
  return `${kind === 1 ? letters(value) : roman(value)}.`;
}

function paintNumber(canvas: PageCanvas, text: string, right: number, baseline: number, style: TextStyle, ctx: LayoutContext): void {
  const [line] = layoutLines(glyphItems([{ text, style }], ctx.fonts), Infinity);
  paintLine(canvas, line, right - line.width, baseline);
}

/** Paints a list marker in the gutter that starts at `x`, beside a first line of text `size` points high. */
export function markerPainter(marker: ListMarker, x: number, size: number, ctx: LayoutContext) {
  return (canvas: PageCanvas, baseline: number): void => {
    const middle = baseline - size * 0.32;
    if (marker.kind === 'number') {
      paintNumber(canvas, itemNumber(marker.value, marker.level), x + MARKER_GUTTER - 4, baseline, { ...BODY, size }, ctx);
    } else if (marker.kind === 'bullet') {
      const radius = size * 0.16;
      const center = x + MARKER_GUTTER / 2 - 2;
      if (marker.level % 3 === 2) canvas.fillRect(center - radius, middle - radius, radius * 2, radius * 2, INK);
      else canvas.disc(center, middle, radius, INK, marker.level % 3 === 0);
    } else {
      const side = size * 0.8;
      const [left, top] = [x + 1, baseline - size * 0.72];
      if (!marker.checked) {
        canvas.strokeRect(left, top, side, side, MUTED, 0.8);
        return;
      }
      canvas.fillRect(left, top, side, side, LINK);
      const check = [
        [left + side * 0.22, top + side * 0.52],
        [left + side * 0.42, top + side * 0.72],
        [left + side * 0.78, top + side * 0.3],
      ] as const;
      canvas.line(check, WHITE, size * 0.11);
    }
  };
}
