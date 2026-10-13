import { sanitizeHref } from '../urls';
import { parseInlineLinkTail } from '../inline/link-syntax';
import { plainTextOf } from './inline-text';

export type ImageParagraph = { alt: string; url: string; title?: string };

function labelEnd(source: string, open: number): number {
  let depth = 0;
  for (let at = open; at < source.length; at++) {
    if (source[at] === '\\') at++;
    else if (source[at] === '[') depth++;
    else if (source[at] === ']' && --depth === 0) return at;
  }
  return -1;
}

export function imageParagraph(source: string): ImageParagraph | null {
  if (!source.startsWith('![')) return null;
  const end = labelEnd(source, 1);
  if (end < 0 || source[end + 1] !== '(') return null;
  const tail = parseInlineLinkTail(source, end + 2);
  if (!tail || tail.end !== source.length) return null;
  const url = sanitizeHref(tail.value.href);
  if (!url) return null;
  const alt = plainTextOf(source.slice(2, end));
  return tail.value.title ? { alt, url, title: tail.value.title } : { alt, url };
}
