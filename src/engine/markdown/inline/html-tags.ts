import { isCoreMark } from '../../model/marks';
import type { Attrs, Mark } from '../../model/types';
import { isPaletteColor } from '../palette';
import { decodeEntities } from './entities';
import { matchAt } from './match-at';

export type TagInfo = {
  close: boolean;
  name: string;
  mark?: Mark;
  atom?: { type: string; attrs: Attrs };
  lineBreak?: boolean;
};

type TagMeaning = Omit<TagInfo, 'close' | 'name'>;
type Attributes = ReadonlyMap<string, string>;

const OPEN_TAG = /<([A-Za-z][A-Za-z0-9]*)((?:[ \t\n]+[A-Za-z_:][\w.:-]*="[^"]*")*)[ \t\n]*(\/?)>/y;
const CLOSE_TAG = /<\/([A-Za-z][A-Za-z0-9]*)[ \t\n]*>/y;
const ATTRIBUTE = /([A-Za-z_:][\w.:-]*)="([^"]*)"/g;
const ATTR_PREFIX = 'data-attr-';
const SPAN_KINDS = ['data-color', 'data-bg', 'data-comment', 'data-mark', 'data-atom'];
const PLAIN_MARKS: ReadonlyMap<string, string> = new Map([
  ['u', 'underline'],
  ['b', 'bold'],
  ['strong', 'bold'],
  ['i', 'italic'],
  ['em', 'italic'],
  ['s', 'strike'],
  ['del', 'strike'],
  ['strike', 'strike'],
  ['code', 'code'],
  ['sub', 'sub'],
  ['sup', 'sup'],
]);
const PAIRED = new Set([...PLAIN_MARKS.keys(), 'mark', 'span']);

function readAttributes(source: string): Attributes | null {
  const attributes = new Map<string, string>();
  for (const [, name, value] of source.matchAll(ATTRIBUTE)) {
    if (attributes.has(name)) return null;
    attributes.set(name, decodeEntities(value));
  }
  return attributes;
}

function customAttrs(attributes: Attributes, kind: string): Attrs | null {
  const entries = [...attributes].filter(([name]) => name !== kind);
  if (entries.some(([name]) => !name.startsWith(ATTR_PREFIX) || name === ATTR_PREFIX)) return null;
  return Object.fromEntries(entries.map(([name, value]) => [name.slice(ATTR_PREFIX.length), value]));
}

function customSpan(kind: string, type: string, attributes: Attributes): TagMeaning | null {
  const attrs = customAttrs(attributes, kind);
  if (!attrs || !type) return null;
  if (kind === 'data-atom') return { atom: { type, attrs } };
  if (isCoreMark(type)) return null;
  return { mark: Object.keys(attrs).length > 0 ? { type, attrs } : { type } };
}

function spanTag(attributes: Attributes): TagMeaning | null {
  const kinds = [...attributes].filter(([name]) => SPAN_KINDS.includes(name));
  if (kinds.length !== 1) return null;
  const [[kind, value]] = kinds;
  if (kind === 'data-mark' || kind === 'data-atom') return customSpan(kind, value, attributes);
  if (attributes.size !== 1) return null;
  if (kind === 'data-comment') return value ? { mark: { type: 'comment', attrs: { id: value } } } : null;
  if (!isPaletteColor(value)) return null;
  return { mark: { type: kind === 'data-color' ? 'color' : 'background', attrs: { color: value } } };
}

function highlightTag(attributes: Attributes): TagMeaning | null {
  if ([...attributes.keys()].some((name) => name !== 'data-color')) return null;
  const color = attributes.get('data-color') ?? '';
  return { mark: isPaletteColor(color) ? { type: 'highlight', attrs: { color } } : { type: 'highlight' } };
}

function describeOpenTag(name: string, attributes: Attributes, selfClosing: boolean): TagMeaning | null {
  if (name === 'br') return attributes.size === 0 ? { lineBreak: true } : null;
  if (selfClosing) return null;
  const type = PLAIN_MARKS.get(name);
  if (type) return attributes.size === 0 ? { mark: { type } } : null;
  if (name === 'mark') return highlightTag(attributes);
  if (name === 'span') return spanTag(attributes);
  return null;
}

export function parseInlineTag(src: string, pos: number): { tag: TagInfo; end: number } | null {
  const close = matchAt(CLOSE_TAG, src, pos);
  if (close) {
    const name = close[1].toLowerCase();
    return PAIRED.has(name) ? { tag: { close: true, name }, end: pos + close[0].length } : null;
  }
  const open = matchAt(OPEN_TAG, src, pos);
  const attributes = open && readAttributes(open[2]);
  if (!open || !attributes) return null;
  const name = open[1].toLowerCase();
  const meaning = describeOpenTag(name, attributes, open[3] === '/');
  return meaning && { tag: { close: false, name, ...meaning }, end: pos + open[0].length };
}
