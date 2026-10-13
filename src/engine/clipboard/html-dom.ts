export const ELEMENT_NODE = 1;
export const TEXT_NODE = 3;
export const MAX_DEPTH = 100;

const DROPPED = new Set([
  'script',
  'style',
  'head',
  'meta',
  'link',
  'title',
  'template',
  'noscript',
  'svg',
  'iframe',
  'object',
  'embed',
  'canvas',
  'audio',
  'video',
  'select',
  'textarea',
  'button',
  'o:p',
]);

const BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'body',
  'caption',
  'center',
  'dd',
  'details',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
]);

export const isElement = (node: Node): node is Element => node.nodeType === ELEMENT_NODE;

export const tagName = (element: Element): string => element.localName.toLowerCase();

export const isFragmentRoot = ({ parentElement }: Element): boolean =>
  parentElement !== null && tagName(parentElement) === 'body';

export const isDropped = (element: Element): boolean => DROPPED.has(tagName(element));

export const isBlockTag = (element: Element): boolean => BLOCK_TAGS.has(tagName(element));

export const isBlockLevel = (element: Element): boolean => isBlockTag(element) || tagName(element) === 'img';

export function hasClass(element: Element, name: string): boolean {
  return (element.getAttribute('class') ?? '').split(/\s+/).includes(name);
}

export function hasBlockDescendant(node: Node, depth = 0): boolean {
  if (depth > MAX_DEPTH) return false;
  for (const child of Array.from(node.childNodes)) {
    if (!isElement(child) || isDropped(child)) continue;
    if (isBlockLevel(child) || hasBlockDescendant(child, depth + 1)) return true;
  }
  return false;
}

export const breaksRun = (node: Node): boolean =>
  isElement(node) && !isDropped(node) && (isBlockLevel(node) || hasBlockDescendant(node));

export function flatText(root: Node): string {
  const parts: string[] = [];
  const pending: Node[] = [root];
  for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
    if (node.nodeType === TEXT_NODE) parts.push(node.nodeValue ?? '');
    else if (!isElement(node) || !isDropped(node)) {
      for (let part = node.lastChild; part !== null; part = part.previousSibling) pending.push(part);
    }
  }
  return parts.join('');
}
