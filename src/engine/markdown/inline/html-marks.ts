import { compareCodeUnits } from '../../model/compare';
import type { Attrs, Mark } from '../../model/types';

export type Wrapper = { readonly open: string; readonly close: string };

const PLAIN_TAGS: ReadonlyMap<string, string> = new Map([
  ['bold', 'strong'],
  ['italic', 'em'],
  ['strike', 'del'],
  ['underline', 'u'],
  ['sub', 'sub'],
  ['sup', 'sup'],
  ['code', 'code'],
]);
const ATTR_PREFIX = 'data-attr-';

function escapeAttribute(value: string, escapePipes: boolean): string {
  const escaped = value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
  return escapePipes ? escaped.replace(/\|/g, '&#124;') : escaped;
}

/** The attributes, sorted by name, each named with `prefix`. */
export function dataAttributes(attrs: Attrs | undefined, prefix = ATTR_PREFIX): [string, string][] {
  return Object.keys(attrs ?? {})
    .sort(compareCodeUnits)
    .map((key) => [`${prefix}${key}`, (attrs as Attrs)[key]]);
}

export function htmlTag(name: string, attributes: readonly [string, string][], escapePipes: boolean): Wrapper {
  const written = attributes.map(([key, value]) => ` ${key}="${escapeAttribute(value, escapePipes)}"`).join('');
  return { open: `<${name}${written}>`, close: `</${name}>` };
}

export function markTag(mark: Mark, escapePipes: boolean): Wrapper {
  const plain = PLAIN_TAGS.get(mark.type);
  const attrs = mark.attrs ?? {};
  if (plain) return htmlTag(plain, [], escapePipes);
  if (mark.type === 'highlight') return htmlTag('mark', attrs.color ? [['data-color', attrs.color]] : [], escapePipes);
  if (mark.type === 'color') return htmlTag('span', [['data-color', attrs.color ?? '']], escapePipes);
  if (mark.type === 'background') return htmlTag('span', [['data-bg', attrs.color ?? '']], escapePipes);
  if (mark.type === 'comment') return htmlTag('span', [['data-comment', attrs.id ?? '']], escapePipes);
  return htmlTag('span', [['data-mark', mark.type], ...dataAttributes(attrs)], escapePipes);
}
