import { matchAt } from './match-at';

const NAMED: ReadonlyMap<string, string> = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
  ['nbsp', '\u00A0'],
  ['copy', '\u00A9'],
  ['reg', '\u00AE'],
  ['trade', '\u2122'],
  ['hellip', '\u2026'],
  ['mdash', '\u2014'],
  ['ndash', '\u2013'],
  ['lsquo', '\u2018'],
  ['rsquo', '\u2019'],
  ['ldquo', '\u201C'],
  ['rdquo', '\u201D'],
  ['laquo', '\u00AB'],
  ['raquo', '\u00BB'],
  ['times', '\u00D7'],
  ['divide', '\u00F7'],
  ['deg', '\u00B0'],
  ['middot', '\u00B7'],
  ['bull', '\u2022'],
]);

const NUMERIC = /^#(?:([0-9]{1,7})|[xX]([0-9a-fA-F]{1,6}))$/;
const ENTITY_SOURCE = '&(#[xX][0-9a-fA-F]{1,6}|#[0-9]{1,7}|[A-Za-z][A-Za-z0-9]{1,31});';
const ENTITY_AT = new RegExp(ENTITY_SOURCE, 'y');
const ENTITIES = new RegExp(ENTITY_SOURCE, 'g');
const REPLACEMENT = '\uFFFD';

function fromCodePoint(code: number): string {
  const valid = code > 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff);
  return valid ? String.fromCodePoint(code) : REPLACEMENT;
}

export function decodeEntity(name: string): string | null {
  const numeric = NUMERIC.exec(name);
  if (numeric) return fromCodePoint(numeric[1] ? parseInt(numeric[1], 10) : parseInt(numeric[2], 16));
  return NAMED.get(name) ?? null;
}

export function matchEntity(src: string, pos: number): { value: string; end: number } | null {
  const match = matchAt(ENTITY_AT, src, pos);
  const value = match ? decodeEntity(match[1]) : null;
  return match && value !== null ? { value, end: pos + match[0].length } : null;
}

export function decodeEntities(value: string): string {
  return value.replace(ENTITIES, (source, name: string) => decodeEntity(name) ?? source);
}
