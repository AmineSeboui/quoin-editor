import type { Attrs, Mark } from '../../engine';
import { setAttributes } from './attributes';
import { withoutEventHandlers } from './decoration-attrs';
import type { MapEntry } from './dom-map';
import { markElement } from './mark-elements';

const created = new WeakSet<Node>();

function decorationElement(attrs: Attrs, doc: Document): HTMLElement {
  const element = doc.createElement('span');
  element.setAttribute('data-quoin-deco', '');
  setAttributes(element, withoutEventHandlers(attrs));
  return element;
}

export function wrapperDepth(marks: readonly Mark[], decorations: readonly Attrs[]): number {
  return marks.length + decorations.length;
}

export function createWrappers(marks: readonly Mark[], decorations: readonly Attrs[], doc: Document): HTMLElement[] {
  const wrappers = [
    ...marks.map((mark) => markElement(mark, doc)),
    ...decorations.map((attrs) => decorationElement(attrs, doc)),
  ];
  wrappers.forEach((wrapper, index) => {
    created.add(wrapper);
    if (index > 0) wrappers[index - 1].appendChild(wrapper);
  });
  return wrappers;
}

// Null when the browser changed the chain: a wrapper it replaced or a stray sibling it put beside the next wrapper.
export function unwrap(node: Node, depth: number): { wrappers: Element[]; content: Node | null } | null {
  const wrappers: Element[] = [];
  let content: Node | null = node;
  for (let level = 0; level < depth; level++) {
    if (!content || !created.has(content)) return null;
    if (level < depth - 1 && content.childNodes.length !== 1) return null;
    wrappers.push(content as Element);
    content = content.firstChild;
  }
  return { wrappers, content };
}

export function wrapperEntries(wrappers: readonly Element[], from: number, to: number): MapEntry[] {
  return wrappers.map((node) => ({ node, from, to, kind: 'wrapper' }));
}
