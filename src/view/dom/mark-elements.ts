import { sanitizeHref, type Mark } from '../../engine';
import { PLAIN_MARK_TAGS } from '../../engine/render/plain-mark-tags';
import { setAttributes } from './attributes';

type Pair = readonly [name: string, value: string | undefined];

function create(doc: Document, tag: string, attributes: readonly Pair[] = []): HTMLElement {
  const element = doc.createElement(tag);
  for (const [name, value] of attributes) if (value !== undefined) element.setAttribute(name, value);
  return element;
}

function linkElement(href: string, doc: Document): HTMLElement {
  const safe = sanitizeHref(href);
  if (safe === null) return create(doc, 'span', [['data-quoin-link', '']]);
  return create(doc, 'a', [['href', safe], ['data-quoin-link', '']]);
}

export function markElement(mark: Mark, doc: Document): HTMLElement {
  const attrs = mark.attrs ?? {};
  const plain = PLAIN_MARK_TAGS.get(mark.type);
  if (plain) return create(doc, plain);
  switch (mark.type) {
    case 'link':
      return linkElement(attrs.href ?? '', doc);
    case 'comment':
      return create(doc, 'span', [['data-comment', attrs.id ?? '']]);
    case 'highlight':
      return create(doc, 'mark', [['data-color', attrs.color || undefined]]);
    case 'color':
      return create(doc, 'span', [['data-color', attrs.color ?? '']]);
    case 'background':
      return create(doc, 'span', [['data-bg', attrs.color ?? '']]);
    default: {
      const element = create(doc, 'span', [['data-mark', mark.type]]);
      setAttributes(element, attrs, 'data-attr-');
      return element;
    }
  }
}
