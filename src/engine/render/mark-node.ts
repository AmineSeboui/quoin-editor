import { dataAttributes } from '../markdown/inline/data-attributes';
import { sanitizeHref } from '../markdown/urls';
import type { Mark } from '../model/types';
import { element, type HtmlElement } from './html-node';
import { PLAIN_MARK_TAGS } from './plain-mark-tags';

/** The element a mark wraps its text in, or null for a link whose address is unsafe. */
export function markElement(mark: Mark): HtmlElement | null {
  const plain = PLAIN_MARK_TAGS.get(mark.type);
  if (plain) return element(plain);
  const attrs = mark.attrs ?? {};
  switch (mark.type) {
    case 'link': {
      const href = sanitizeHref(attrs.href ?? '');
      return href === null ? null : element('a', [['href', href], ['title', attrs.title], ['rel', 'noopener noreferrer']]);
    }
    case 'comment':
      return element('span', [['data-comment', attrs.id ?? '']]);
    case 'highlight':
      return element('mark', [['data-color', attrs.color || undefined]]);
    case 'color':
      return element('span', [['data-color', attrs.color ?? '']]);
    case 'background':
      return element('span', [['data-bg', attrs.color ?? '']]);
    default:
      return element('span', [['data-mark', mark.type], ...dataAttributes(attrs)]);
  }
}
