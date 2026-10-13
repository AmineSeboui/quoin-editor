import { inlineText, normalizeInline, text } from '../../model/inline';
import type { Inline } from '../../model/types';
import { parseInline } from '../inline/parse-inline';
import { normalizeLabel, type LinkTarget } from '../inline/link-syntax';
import { serializeInline } from '../inline/serialize-inline';

export type TextOptions = {
  readonly softBreak: 'newline' | 'space';
  readonly refs: ReadonlyMap<string, LinkTarget>;
};

const BRACKET_LABEL = /\[((?:[^\\[\]]|\\[\s\S]){0,999})\]/g;

// The inline parser normalizes every reference it is given on each call, so a paragraph only gets the
// definitions its bracket groups could name.
function refsUsedBy(source: string, refs: ReadonlyMap<string, LinkTarget>): ReadonlyMap<string, LinkTarget> {
  const used = new Map<string, LinkTarget>();
  if (refs.size === 0) return used;
  for (const [, label] of source.matchAll(BRACKET_LABEL)) {
    const target = refs.get(normalizeLabel(label));
    if (target) used.set(label, target);
  }
  return used;
}

function parseText(source: string, { softBreak, refs }: TextOptions): Inline {
  return parseInline(source, { softBreak, refs: refsUsedBy(source, refs) });
}

export function canonicalInline(source: string, options: TextOptions, hardBreak?: 'backslash' | 'br'): string {
  return serializeInline(parseText(source, options), { escapeLineStart: true, hardBreak });
}

const ESCAPED_PIPE = /\\\|/g;

// GFM unescapes the pipes of a cell before it reads the inline markdown, code spans included.
export function canonicalCell(source: string, options: TextOptions): string {
  return serializeInline(parseText(source.replace(ESCAPED_PIPE, '|'), options), { escapePipes: true, hardBreak: 'br' });
}

export function canonicalParagraphs(paragraphs: readonly string[], options: TextOptions): string {
  const parts = paragraphs.map((source) => parseText(source, options));
  const joined = parts.flatMap((part, index) => (index === 0 ? part : [text('\n'), ...part]));
  return serializeInline(normalizeInline(joined), { escapeLineStart: true });
}

export function plainTextOf(source: string): string {
  return inlineText(parseInline(source, { softBreak: 'space' }), () => '');
}
