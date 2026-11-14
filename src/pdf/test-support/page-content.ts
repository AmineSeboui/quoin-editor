import { PdfLexer, type PdfName, PdfString, type PdfDict, type PdfValue } from './parse-pdf';
import type { PdfFile } from './read-pdf';

export type TextShow = {
  readonly text: string;
  readonly font: string;
  readonly size: number;
  readonly x: number;
  readonly y: number;
  readonly rise: number;
  readonly color: readonly number[];
  readonly mode: number;
  readonly skew: number;
};

export type Fill = { readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly color: readonly number[] };

export type Stroke = { readonly points: readonly [number, number][]; readonly width: number; readonly color: readonly number[] };

export type ImageDraw = { readonly name: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number };

export type PageContent = {
  readonly shows: TextShow[];
  readonly fills: Fill[];
  readonly strokes: Stroke[];
  readonly images: ImageDraw[];
  readonly operators: string[];
};

type Decoder = (bytes: Uint8Array) => string;

const winAnsi = new TextDecoder('windows-1252');

function cmapDecoder(cmap: string): Decoder {
  const map = new Map<number, string>();
  const utf16 = (hex: string) => String.fromCharCode(...(hex.match(/.{4}/g) ?? []).map((unit) => parseInt(unit, 16)));
  for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const [, cid, text] of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) map.set(parseInt(cid, 16), utf16(text));
  }
  return (bytes) => {
    let out = '';
    for (let at = 0; at + 1 < bytes.length; at += 2) out += map.get((bytes[at] << 8) | bytes[at + 1]) ?? '\uFFFD';
    return out;
  };
}

function decoders(file: PdfFile, page: PdfDict): Map<string, { decode: Decoder; base: string }> {
  const fonts = file.dict(file.dict(page.Resources).Font ?? {});
  const out = new Map<string, { decode: Decoder; base: string }>();
  for (const [key, ref] of Object.entries(fonts)) {
    const font = file.dict(ref);
    const base = (font.BaseFont as PdfName).name;
    const decode: Decoder =
      (font.Subtype as PdfName).name === 'Type0'
        ? cmapDecoder(new TextDecoder().decode(file.stream(font.ToUnicode)))
        : (bytes) => winAnsi.decode(bytes);
    out.set(key, { decode, base });
  }
  return out;
}

const numbers = (operands: PdfValue[]) => operands.map(Number);

/** What a page's content stream draws: its text, filled rectangles, stroked paths and pictures, in page space. */
export function pageContent(file: PdfFile, index: number): PageContent {
  const page = file.pages[index];
  const contents = file.stream(page.Contents);
  const fonts = decoders(file, page);
  const content: PageContent = { shows: [], fills: [], strokes: [], images: [], operators: [] };
  const lexer = new PdfLexer(contents);
  let operands: PdfValue[] = [];
  let state = { ctm: [1, 0, 0, 1, 0, 0], fill: [0], stroke: [0], width: 1 };
  const saved: (typeof state)[] = [];
  let text = { font: '', size: 0, x: 0, y: 0, lineX: 0, lineY: 0, rise: 0, mode: 0, skew: 0 };
  let path: [number, number][] = [];
  let rects: [number, number, number, number][] = [];
  const show = (strings: PdfString[]) => {
    const font = fonts.get(text.font);
    if (!font) throw new Error(`no font ${text.font}`);
    const decoded = strings.map((string) => font.decode(string.bytes)).join('');
    content.shows.push({ text: decoded, font: font.base, size: text.size, x: text.x, y: text.y, rise: text.rise, color: state.fill, mode: text.mode, skew: text.skew });
  };
  for (;;) {
    lexer.skipSpace();
    if (lexer.at >= contents.length) break;
    const char = String.fromCharCode(contents[lexer.at]);
    if (/[-+.\d([</]/.test(char)) {
      operands.push(lexer.value());
      continue;
    }
    const operator = lexer.word();
    if (operator === '') throw new Error(`stuck at ${lexer.at} in page ${index}`);
    content.operators.push(operator);
    const args = operands;
    operands = [];
    switch (operator) {
      case 'q':
        saved.push({ ...state });
        break;
      case 'Q':
        state = saved.pop()!;
        break;
      case 'cm':
        state = { ...state, ctm: numbers(args) };
        break;
      case 'rg':
      case 'g':
        state = { ...state, fill: numbers(args) };
        break;
      case 'RG':
      case 'G':
        state = { ...state, stroke: numbers(args) };
        break;
      case 'w':
        state = { ...state, width: Number(args[0]) };
        break;
      case 're': {
        const [x, y, width, height] = numbers(args);
        rects.push([x, y, width, height]);
        path.push([x, y], [x + width, y + height]);
        break;
      }
      case 'm':
      case 'l':
        path.push([Number(args[0]), Number(args[1])]);
        break;
      case 'c':
        path.push([Number(args[4]), Number(args[5])]);
        break;
      case 'f':
      case 'f*':
      case 'B':
        for (const [x, y, width, height] of rects) content.fills.push({ x, y, width, height, color: state.fill });
        if (rects.length === 0) {
          const xs = path.map(([x]) => x);
          const ys = path.map(([, y]) => y);
          const [x, y] = [Math.min(...xs), Math.min(...ys)];
          content.fills.push({ x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y, color: state.fill });
        }
        if (operator === 'B') content.strokes.push({ points: path, width: state.width, color: state.stroke });
        path = [];
        rects = [];
        break;
      case 'S':
      case 's':
        content.strokes.push({ points: path, width: state.width, color: state.stroke });
        path = [];
        rects = [];
        break;
      case 'n':
        path = [];
        rects = [];
        break;
      case 'BT':
        text = { ...text, x: 0, y: 0, lineX: 0, lineY: 0, skew: 0 };
        break;
      case 'Tf':
        text = { ...text, font: (args[0] as PdfName).name, size: Number(args[1]) };
        break;
      case 'Td': {
        const [dx, dy] = numbers(args);
        text = { ...text, x: text.lineX + dx, y: text.lineY + dy, lineX: text.lineX + dx, lineY: text.lineY + dy };
        break;
      }
      case 'Tm': {
        const [, , skew, , x, y] = numbers(args);
        text = { ...text, x, y, lineX: x, lineY: y, skew };
        break;
      }
      case 'Ts':
        text = { ...text, rise: Number(args[0]) };
        break;
      case 'Tr':
        text = { ...text, mode: Number(args[0]) };
        break;
      case 'Tj':
        show([args[0] as PdfString]);
        break;
      case 'TJ':
        show((args[0] as PdfValue[]).filter((item): item is PdfString => item instanceof PdfString));
        break;
      case 'Do': {
        const [width, , , height, x, y] = state.ctm;
        content.images.push({ name: (args[0] as PdfName).name, x, y, width, height });
        break;
      }
    }
  }
  return content;
}

/** The text of a page, line by line from the top, each line's shows from the left; a raised or lowered show joins its line. */
export function pageText(file: PdfFile, index: number): string {
  const lines: TextShow[][] = [];
  for (const show of [...pageContent(file, index).shows].sort((a, b) => b.y - a.y)) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line[0].y - show.y) < Math.max(line[0].size, show.size) * 0.5) line.push(show);
    else lines.push([show]);
  }
  return lines.map((line) => line.sort((a, b) => a.x - b.x).map(({ text }) => text).join('')).join('\n');
}
