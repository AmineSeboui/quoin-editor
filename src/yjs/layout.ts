import type * as Y from 'yjs';
import { inlineLength } from '../engine/model/inline';
import type { EngineBlock } from '../engine/model/types';

/** A run of one region's characters, `at` places into the span that holds it. */
export type Seg = { readonly host: Span; readonly region: Region; at: number; length: number };
export type Region = { readonly name: string; readonly entry: Entry; readonly segs: Seg[] };
/** The text from one block marker up to the next, or before the first marker. */
export type Span = { length: number; entry: Entry | null; readonly segs: Seg[]; index: number; copyOf?: Entry };
/** A block of the document and where the text holds it; `copies` are later spans of its id, which nobody reads. */
export type Entry = {
  readonly id: string;
  readonly map: Y.Map<unknown>;
  readonly span: Span;
  readonly regions: Region[];
  readonly copies: Span[];
};

/**
 * Where each block and region of the document sits in the shared text, so that a change by offset needs no scan of the
 * text. A layout is `clean` when the text holds exactly the blocks, one region start before each region's characters.
 */
export type Layout = {
  readonly spans: Span[];
  readonly entries: Map<string, Entry>;
  clean: boolean;
  readonly strays: Strays;
  readonly starts: number[];
  valid: number;
};

/**
 * Characters outside any region: the segs they are `read` as, the `leading` ones among them, read into the first
 * region of the document as no region comes before them, and whether some are `unread`, the document having no region.
 */
export type Strays = { readonly read: readonly Seg[]; readonly leading: ReadonlySet<Seg>; readonly unread: boolean };

const NO_STRAYS: Strays = { read: [], leading: new Set(), unread: false };

export const emptySpan = (): Span => ({ length: 0, entry: null, segs: [], index: 0 });

export const createLayout = (
  spans: Span[],
  entries: Map<string, Entry>,
  clean: boolean,
  strays: Strays = NO_STRAYS,
): Layout => ({
  spans,
  entries,
  clean,
  strays,
  starts: [],
  valid: 0,
});

function settle(layout: Layout): void {
  const { spans, starts } = layout;
  let at = layout.valid === 0 ? 0 : starts[layout.valid - 1] + spans[layout.valid - 1].length;
  for (let i = layout.valid; i < spans.length; i++) {
    starts[i] = at;
    spans[i].index = i;
    at += spans[i].length;
  }
  layout.valid = spans.length;
}

export const invalidate = (layout: Layout, from: number): void => void (layout.valid = Math.min(layout.valid, from));

export function spanStart(layout: Layout, span: Span): number {
  if (span.index >= layout.valid || layout.spans[span.index] !== span) settle(layout);
  return layout.starts[span.index];
}

export function indexOf(layout: Layout, span: Span): number {
  spanStart(layout, span);
  return span.index;
}

export function textLength(layout: Layout): number {
  const last = layout.spans[layout.spans.length - 1];
  return spanStart(layout, last) + last.length;
}

/** The span an insertion at `at` goes into, or with `item` the span of the character at `at`. */
export function spanAt(layout: Layout, at: number, item = false): Span {
  settle(layout);
  let [low, high] = [0, layout.spans.length - 1];
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (layout.starts[middle] < at || (item && layout.starts[middle] === at)) low = middle;
    else high = middle - 1;
  }
  return layout.spans[low];
}

export const regionLength = (region: Region): number => region.segs.reduce((sum, seg) => sum + seg.length, 0);

/** The offset in its region of the place `rel` of `seg`. */
export function offsetIn(seg: Seg, rel: number): number {
  let offset = rel - seg.at;
  for (const other of seg.region.segs) {
    if (other === seg) return offset;
    offset += other.length;
  }
  return offset;
}

/** The seg and place in it of `offset` in `region`; an offset between two segs is the end of the first. */
export function pointOf(region: Region, offset: number): { seg: Seg; rel: number } {
  let before = 0;
  for (const seg of region.segs) {
    if (offset <= before + seg.length) return { seg, rel: seg.at + offset - before };
    before += seg.length;
  }
  throw new RangeError(`offset ${offset} is past the end of region "${region.name}"`);
}

/** The parts of each seg that the offsets `from` to `to` of `region` cover, in the order of the text. */
export function piecesOf(region: Region, from: number, to: number): { seg: Seg; rel: number; length: number }[] {
  const pieces: { seg: Seg; rel: number; length: number }[] = [];
  let before = 0;
  for (const seg of region.segs) {
    const start = Math.max(from, before);
    const end = Math.min(to, before + seg.length);
    if (end > start) pieces.push({ seg, rel: seg.at + start - before, length: end - start });
    before += seg.length;
  }
  return pieces;
}

/** Records `by` characters put in (or, negative, taken out) at the place `rel` of `seg`. */
export function grow(layout: Layout, seg: Seg, rel: number, by: number): void {
  seg.length += by;
  seg.host.length += by;
  for (const other of seg.host.segs) {
    if (other !== seg && (by > 0 ? other.at >= rel : other.at > rel)) other.at += by;
  }
  invalidate(layout, seg.host.index + 1);
}

/** The entry of a block written out cleanly: its marker, then each region's start and characters. */
export function cleanEntry(block: EngineBlock, map: Y.Map<unknown>): Entry {
  const span = emptySpan();
  const entry: Entry = { id: block.id, map, span, regions: [], copies: [] };
  span.entry = entry;
  span.length = 1;
  for (const [name, inline] of Object.entries(block.regions)) {
    const region: Region = { name, entry, segs: [] };
    const seg: Seg = { host: span, region, at: span.length + 1, length: inlineLength(inline) };
    region.segs.push(seg);
    span.segs.push(seg);
    entry.regions.push(region);
    span.length += 1 + seg.length;
  }
  return entry;
}

/** Puts `entries` in place of the `count` spans from index `at`. */
export function placeEntries(layout: Layout, at: number, count: number, entries: readonly Entry[]): void {
  for (const span of layout.spans.splice(at, count, ...entries.map((entry) => entry.span))) {
    if (span.entry !== null && layout.entries.get(span.entry.id) === span.entry) layout.entries.delete(span.entry.id);
    const copies = span.copyOf?.copies;
    if (copies?.includes(span)) copies.splice(copies.indexOf(span), 1);
  }
  for (const entry of entries) layout.entries.set(entry.id, entry);
  invalidate(layout, at);
}

export function regionOf(layout: Layout, id: string, name: string): Region {
  const region = layout.entries.get(id)?.regions.find((candidate) => candidate.name === name);
  if (region === undefined) throw new RangeError(`no region "${name}" in block "${id}"`);
  return region;
}
