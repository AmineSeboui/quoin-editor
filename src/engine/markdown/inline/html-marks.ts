import type { Mark } from '../../model/types';
import type { HtmlElement } from '../../render/html-node';
import { markElement } from '../../render/mark-node';

export type Wrapper = { readonly open: string; readonly close: string };

function escapeAttribute(value: string, escapePipes: boolean): string {
  const escaped = value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/\n/g, '&#10;');
  return escapePipes ? escaped.replace(/\|/g, '&#124;') : escaped;
}

export function htmlTag(name: string, attributes: readonly [string, string][], escapePipes: boolean): Wrapper {
  const written = attributes.map(([key, value]) => ` ${key}="${escapeAttribute(value, escapePipes)}"`).join('');
  return { open: `<${name}${written}>`, close: `</${name}>` };
}

// A mark other than a link is written as the element toHTML draws for it, but for a strike, which markdown spells del.
export function markTag(mark: Mark, escapePipes: boolean): Wrapper {
  const { tag, attrs } = markElement(mark) as HtmlElement;
  const written = attrs.filter((attr): attr is [string, string] => attr[1] !== undefined);
  return htmlTag(mark.type === 'strike' ? 'del' : tag, written, escapePipes);
}
