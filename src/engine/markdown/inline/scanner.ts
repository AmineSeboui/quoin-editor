import type { ParseInlineOptions } from '../../schema/types';
import type { DelimiterItem, Item } from './inline-items';
import { normalizeLabel, type LinkTarget } from './link-syntax';

export type Bracket = {
  readonly index: number;
  readonly start: number;
  readonly image: boolean;
  readonly bottom: number;
  active: boolean;
};

export type Scanner = {
  readonly src: string;
  readonly softBreak: string;
  readonly refs: ReadonlyMap<string, LinkTarget>;
  readonly items: Item[];
  readonly delimiters: DelimiterItem[];
  readonly brackets: Bracket[];
  readonly closeMisses: Map<string, number>;
  pos: number;
};

function normalizeRefs(refs: ParseInlineOptions['refs']): ReadonlyMap<string, LinkTarget> {
  const result = new Map<string, LinkTarget>();
  for (const [label, target] of refs ?? []) {
    const key = normalizeLabel(label);
    if (key && !result.has(key)) result.set(key, target);
  }
  return result;
}

export function createScanner(src: string, options: ParseInlineOptions): Scanner {
  return {
    src,
    softBreak: options.softBreak === 'space' ? ' ' : '\n',
    refs: normalizeRefs(options.refs),
    items: [],
    delimiters: [],
    brackets: [],
    closeMisses: new Map(),
    pos: 0,
  };
}

export function pushText(scanner: Scanner, value: string, advance: number): void {
  scanner.items.push({ kind: 'text', text: value });
  scanner.pos += advance;
}

// A closer search that fails from one position fails from every later one, and the scan only moves forward.
export function findClose(scanner: Scanner, key: string, from: number, find: (from: number) => number): number {
  if (from >= (scanner.closeMisses.get(key) ?? Infinity)) return -1;
  const close = find(from);
  if (close < 0) scanner.closeMisses.set(key, from);
  return close;
}
