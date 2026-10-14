import { sanitizeHref, type Mark } from '../../engine';
import { setAttributes } from './attributes';

const PLAIN_TAGS: Readonly<Record<string, string>> = {
  bold: 'strong',
  italic: 'em',
  underline: 'u',
  strike: 's',
  sub: 'sub',
  sup: 'sup',
  code: 'code',
};

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
  const plain = Object.hasOwn(PLAIN_TAGS, mark.type) ? PLAIN_TAGS[mark.type] : undefined;
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
