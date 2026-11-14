import type { Align } from '../../engine/blocks/data-fields';
import { breaksBetween } from './break-rules';
import type { GlyphItem } from './glyph-items';

export type PlacedItem = GlyphItem & { readonly x: number };

/** A line of placed glyphs; `width` leaves out the spaces it ends with, and `last` ends a paragraph or a line break. */
export type Line = { readonly items: readonly PlacedItem[]; readonly width: number; readonly last: boolean };

type Word = { readonly items: GlyphItem[]; readonly ink: number; readonly total: number };

const sum = (items: readonly GlyphItem[]) => items.reduce((total, { width }) => total + width, 0);

function inkOf(items: readonly GlyphItem[]): number {
  let end = items.length;
  while (end > 0 && items[end - 1].space) end--;
  return sum(items.slice(0, end));
}

function endsWord(item: GlyphItem, next: GlyphItem | undefined): boolean {
  if (!next || next.newline) return true;
  if (item.space) return !next.space;
  return !next.space && breaksBetween(item.text, next.text);
}

function words(items: readonly GlyphItem[]): (Word | null)[] {
  const out: (Word | null)[] = [];
  let word: GlyphItem[] = [];
  items.forEach((item, at) => {
    if (item.newline) {
      out.push(null);
      return;
    }
    word.push(item);
    if (!endsWord(item, items[at + 1])) return;
    out.push({ items: word, ink: inkOf(word), total: sum(word) });
    word = [];
  });
  return out;
}

function place(items: readonly GlyphItem[], width: number, align: Align | undefined, last: boolean): Line {
  const ink = inkOf(items);
  const free = Math.max(0, width - ink);
  let inner = items.length;
  while (inner > 0 && items[inner - 1].space) inner--;
  const gaps = items.slice(0, inner).filter(({ space }) => space).length;
  const spread = align === 'justify' && !last && gaps > 0 ? free / gaps : 0;
  let x = align === 'center' ? free / 2 : align === 'right' ? free : 0;
  const placed = items.map((item, at) => {
    const glyph = { ...item, x };
    x += item.width + (item.space && at < inner ? spread : 0);
    return glyph;
  });
  return { items: placed, width: ink, last };
}

/** Lays glyphs out in lines `width` wide, breaking after spaces, between ideographs, and inside a word too wide. */
export function layoutLines(items: readonly GlyphItem[], width: number, align?: Align): Line[] {
  const lines: Line[] = [];
  let current: GlyphItem[] = [];
  let total = 0;
  const finish = (last: boolean) => {
    lines.push(place(current, width, align, last));
    current = [];
    total = 0;
  };
  for (const word of words(items)) {
    if (word === null) {
      finish(true);
      continue;
    }
    if (current.length > 0 && total + word.ink > width) finish(false);
    if (current.length > 0 || word.ink <= width) {
      current.push(...word.items);
      total += word.total;
      continue;
    }
    for (const item of word.items) {
      if (!item.space && current.length > 0 && total + item.width > width) finish(false);
      current.push(item);
      total += item.width;
    }
  }
  finish(true);
  return lines;
}
