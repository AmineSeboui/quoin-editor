import { sanitizeHref, type Mark } from '../../engine';
import { writtenAttrs, type HtmlElement } from '../../engine/render/html-node';
import { markElement as markNode } from '../../engine/render/mark-node';

function create(doc: Document, tag: string, attributes: readonly (readonly [string, string | true])[]): HTMLElement {
  const element = doc.createElement(tag);
  for (const [name, value] of attributes) element.setAttribute(name, value as string);
  return element;
}

function linkElement({ href = '', title }: Record<string, string | undefined> = {}, doc: Document): HTMLElement {
  const safe = sanitizeHref(href);
  if (safe === null) return create(doc, 'span', [['data-quoin-link', '']]);
  const anchor = create(doc, 'a', [['href', safe], ['data-quoin-link', '']]);
  if (title) anchor.title = title;
  return anchor;
}

// Every mark but a link is drawn with the element toHTML writes for it.
export function markElement(mark: Mark, doc: Document): HTMLElement {
  if (mark.type === 'link') return linkElement(mark.attrs, doc);
  const { tag, attrs } = markNode(mark) as HtmlElement;
  return create(doc, tag, writtenAttrs(attrs));
}
