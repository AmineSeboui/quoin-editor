import type { Attrs } from '../../model/types';
import { sanitizeHref } from '../urls';
import { parseInlineTag } from './html-tags';
import type { Item } from './inline-items';
import { parseAutolink } from './link-syntax';
import { findClose, pushText, type Scanner } from './scanner';

function findSpanClose(src: string, from: number): number {
  for (let at = src.indexOf('<', from); at >= 0; at = src.indexOf('<', at + 1)) {
    const parsed = parseInlineTag(src, at);
    if (parsed?.tag.close && parsed.tag.name === 'span') return parsed.end;
  }
  return -1;
}

function atomSpan(scanner: Scanner, atom: { type: string; attrs: Attrs }, openEnd: number): void {
  const closeEnd = findClose(scanner, 'span', openEnd, (from) => findSpanClose(scanner.src, from));
  if (closeEnd < 0) {
    pushText(scanner, scanner.src.slice(scanner.pos, openEnd), openEnd - scanner.pos);
    return;
  }
  scanner.items.push({ kind: 'atom', type: atom.type, attrs: atom.attrs });
  scanner.pos = closeEnd;
}

function autolinkItem(text: string, href: string | null): Item {
  return href === null ? { kind: 'text', text } : { kind: 'text', text, marks: [{ type: 'link', attrs: { href } }] };
}

export function openAngle(scanner: Scanner): void {
  const { src, pos, items } = scanner;
  const autolink = parseAutolink(src, pos);
  if (autolink) {
    items.push(autolinkItem(autolink.value.text, sanitizeHref(autolink.value.href)));
    scanner.pos = autolink.end;
    return;
  }
  const parsed = parseInlineTag(src, pos);
  if (!parsed) pushText(scanner, '<', 1);
  else if (parsed.tag.lineBreak) pushText(scanner, '\n', parsed.end - pos);
  else if (parsed.tag.atom) atomSpan(scanner, parsed.tag.atom, parsed.end);
  else {
    items.push({ kind: 'tag', source: src.slice(pos, parsed.end), tag: parsed.tag });
    scanner.pos = parsed.end;
  }
}
