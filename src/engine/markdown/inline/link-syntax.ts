import { isEscapable, unescapeMarkdown } from './escapes';
import { matchAt } from './match-at';

export type Parsed<T> = { value: T; end: number };
export type LinkTarget = { href: string; title?: string };

const URI_AUTOLINK = /<([A-Za-z][A-Za-z0-9+.-]{1,31}:[^<>\p{Cc} ]*)>/uy;
const DOMAIN_LABEL = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?';
const EMAIL_AUTOLINK = new RegExp(`<([A-Za-z0-9.!#$%&'*+/=?^_\`{|}~-]+@${DOMAIN_LABEL}(?:\\.${DOMAIN_LABEL})*)>`, 'y');
const LABEL = /\[((?:[^\\[\]]|\\[\s\S]){0,999})\]/y;
const MAX_PAREN_DEPTH = 32;
const TITLE_CLOSERS: ReadonlyMap<string, string> = new Map([
  ['"', '"'],
  ["'", "'"],
  ['(', ')'],
]);

function isSpaceOrControl(char: string): boolean {
  const code = char.charCodeAt(0);
  return code <= 0x20 || code === 0x7f;
}

function parseAngleDestination(src: string, pos: number): Parsed<string> | null {
  for (let p = pos + 1; p < src.length; p++) {
    const char = src[p];
    if (char === '\\' && p + 1 < src.length && src[p + 1] !== '\n') p++;
    else if (char === '>') return { value: unescapeMarkdown(src.slice(pos + 1, p)), end: p + 1 };
    else if (char === '<' || char === '\n') return null;
  }
  return null;
}

export function parseLinkDestination(src: string, pos: number): Parsed<string> | null {
  if (src[pos] === '<') return parseAngleDestination(src, pos);
  let depth = 0;
  let p = pos;
  for (; p < src.length; p++) {
    const char = src[p];
    if (char === '\\' && isEscapable(src[p + 1])) p++;
    else if (char === '(' && depth === MAX_PAREN_DEPTH) return null;
    else if (char === '(') depth++;
    else if (char === ')' && depth === 0) break;
    else if (char === ')') depth--;
    else if (isSpaceOrControl(char)) break;
  }
  if (depth !== 0 || (p === pos && src[p] !== ')')) return null;
  return { value: unescapeMarkdown(src.slice(pos, p)), end: p };
}

export function parseLinkTitle(src: string, pos: number): Parsed<string> | null {
  const close = TITLE_CLOSERS.get(src[pos]);
  if (!close) return null;
  for (let p = pos + 1; p < src.length; p++) {
    const char = src[p];
    if (char === '\\') p++;
    else if (char === close) return { value: unescapeMarkdown(src.slice(pos + 1, p)), end: p + 1 };
    else if (close === ')' && char === '(') return null;
  }
  return null;
}

export function parseAutolink(src: string, pos: number): Parsed<{ href: string; text: string }> | null {
  const uri = matchAt(URI_AUTOLINK, src, pos);
  if (uri) return { value: { href: uri[1], text: uri[1] }, end: pos + uri[0].length };
  const email = matchAt(EMAIL_AUTOLINK, src, pos);
  return email ? { value: { href: `mailto:${email[1]}`, text: email[1] }, end: pos + email[0].length } : null;
}

export function parseLinkLabel(src: string, pos: number): Parsed<string> | null {
  const match = matchAt(LABEL, src, pos);
  return match ? { value: match[1], end: pos + match[0].length } : null;
}

function skipLinkSpace(src: string, pos: number): number {
  let p = pos;
  while (src[p] === ' ' || src[p] === '\t') p++;
  if (src[p] === '\n') p++;
  while (src[p] === ' ' || src[p] === '\t') p++;
  return p;
}

export function parseInlineLinkTail(src: string, pos: number): Parsed<LinkTarget> | null {
  const destination = parseLinkDestination(src, skipLinkSpace(src, pos));
  if (!destination) return null;
  let p = skipLinkSpace(src, destination.end);
  const title = p > destination.end ? parseLinkTitle(src, p) : null;
  if (title) p = skipLinkSpace(src, title.end);
  if (src[p] !== ')') return null;
  const value = title?.value ? { href: destination.value, title: title.value } : { href: destination.value };
  return { value, end: p + 1 };
}

export function normalizeLabel(label: string): string {
  return label.trim().replace(/[ \t\r\n]+/g, ' ').toLowerCase().toUpperCase();
}
