import type { FaceUse } from '../font/face';
import { pdfName, pdfNumber } from '../file/pdf-syntax';
import type { Line, PlacedItem } from '../text/line-layout';
import { drawnSize, type LinkTarget, type Rgb, type TextStyle } from '../text/text-style';
import { itemSpans } from './item-spans';
import { fillColor, strokeColor, type PageCanvas } from './page-canvas';

type RunKey = { readonly use: FaceUse; readonly style: TextStyle };

const sameColor = (a: Rgb | undefined, b: Rgb | undefined) => a === b || (!!a && !!b && a.every((value, at) => value === b[at]));

const sameRun = (a: RunKey, b: RunKey) =>
  a.use === b.use && drawnSize(a.style) === drawnSize(b.style) && a.style.script === b.style.script && sameColor(a.style.color, b.style.color);

const sameLink = (a: LinkTarget, b: LinkTarget) =>
  ('uri' in a ? a.uri : `#${a.heading}`) === ('uri' in b ? b.uri : `#${b.heading}`);

// How far a subscript drops below the baseline and a superscript rises above it, in ems of the text around it.
const SHIFT = { sub: 0.18, sup: -0.35 };
const FAKE_ITALIC_SKEW = 0.2;
const FAKE_BOLD_STROKE = 0.03;

const baselineOf = (style: TextStyle, baseline: number) => baseline + (style.script ? SHIFT[style.script] * style.size : 0);

// Glyphs follow on from each other; where the layout spread a space, the run moves on by the difference.
function shown(items: readonly PlacedItem[], size: number): string {
  let out = '';
  let hex = '';
  let x = items[0].x;
  for (const item of items) {
    const gap = item.x - x;
    if (Math.abs(gap) > 0.01) {
      out += `<${hex}> ${pdfNumber((-gap * 1000) / size)} `;
      hex = '';
    }
    hex += item.use!.face.hex(item.glyph);
    x = item.x + item.width;
  }
  return `[${out}<${hex}>] TJ`;
}

function paintRun(canvas: PageCanvas, { use, style }: RunKey, items: readonly PlacedItem[], x: number, baseline: number): void {
  const size = drawnSize(style);
  const font = pdfName(canvas.resources.font(use.face));
  const bold = use.fakeBold ? `2 Tr ${pdfNumber(size * FAKE_BOLD_STROKE)} w ${strokeColor(style.color)}` : '0 Tr';
  const matrix = [1, 0, use.fakeItalic ? FAKE_ITALIC_SKEW : 0, 1, x + items[0].x, canvas.y(baselineOf(style, baseline))];
  canvas.write(`BT ${font} ${pdfNumber(size)} Tf ${fillColor(style.color)} ${bold} ${matrix.map(pdfNumber).join(' ')} Tm ${shown(items, size)} ET`);
}

const rule = (style: TextStyle) => Math.max(0.5, style.size * 0.06);

/** Paints a line of text whose baseline is at `baseline`, from `x`: highlights, glyphs, boxes, rules and links. */
export function paintLine(canvas: PageCanvas, line: Line, x: number, baseline: number): void {
  const { items } = line;
  for (const span of itemSpans(items, (item) => item.style.background, sameColor)) {
    const { size } = span.items[0].style;
    canvas.fillRect(x + span.x, baseline - size * 0.85, span.width, size * 1.15, span.value);
  }
  const runs = itemSpans(items, (item): RunKey | undefined => (item.use ? { use: item.use, style: item.style } : undefined), sameRun);
  for (const run of runs) paintRun(canvas, run.value, run.items, x, baseline);
  for (const item of items.filter(({ use, newline }) => !use && !newline)) {
    const size = drawnSize(item.style);
    const top = baselineOf(item.style, baseline) - size * 0.72;
    canvas.strokeRect(x + item.x + item.width * 0.15, top, item.width * 0.7, size * 0.72, item.style.color, size * 0.06);
  }
  for (const [flag, offset] of [['underline', 0.12], ['strike', -0.3]] as const) {
    const spans = itemSpans(items, (item) => (item.style[flag] ? item.style.color : undefined), sameColor);
    for (const span of spans) {
      const { style } = span.items[0];
      canvas.fillRect(x + span.x, baselineOf(style, baseline) + offset * drawnSize(style), span.width, rule(style), span.value);
    }
  }
  for (const span of itemSpans(items, (item) => item.style.link, sameLink)) {
    const { size } = span.items[0].style;
    canvas.link(x + span.x, baseline - size * 0.9, span.width, size * 1.2, span.value);
  }
}
