import { sanitizeHref, type Mark } from '../../engine';
import { writtenAttrs, type HtmlElement } from '../../engine/render/html-node';
import { markElement as markNode } from '../../engine/render/mark-node';

function create(doc: Document, tag: string, attributes: readonly (readonly [string, string | true])[]): HTMLElement {
  const element = doc.createElement(tag);
  for (const [name, value] of attributes) element.setAttribute(name, value as string);
  return element;
}

function linkElement(href: string, doc: Document): HTMLElement {
  const safe = sanitizeHref(href);
  if (safe === null) return create(doc, 'span', [['data-quoin-link', '']]);
  return create(doc, 'a', [['href', safe], ['data-quoin-link', '']]);
}

// Every mark but a link is drawn with the element toHTML writes for it.
export function markElement(mark: Mark, doc: Document): HTMLElement {
  if (mark.type === 'link') return linkElement(mark.attrs?.href ?? '', doc);
  const { tag, attrs } = markNode(mark) as HtmlElement;
  return create(doc, tag, writtenAttrs(attrs));
}
