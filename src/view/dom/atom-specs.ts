import type { AtomNode } from '../../engine';
import { setAttributes } from './attributes';
import type { RenderOptions, WidgetRenderer } from './render-options';
import type { RenderSpec } from './render-spec';
import { segmentSignature, type Segment } from './segments';
import { createWrappers, unwrap, wrapperDepth, wrapperEntries } from './wrappers';

function defaultAtomText(node: AtomNode): string {
  if (node.type === 'mention') return `@${node.attrs.label ?? ''}`;
  return node.type === 'math' ? (node.attrs.latex ?? '') : node.type;
}

function defaultAtom(node: AtomNode, doc: Document, atomText: (node: AtomNode) => string): HTMLElement {
  const element = doc.createElement('span');
  element.setAttribute('contenteditable', 'false');
  element.setAttribute('data-quoin-atom', node.type);
  setAttributes(element, node.attrs, 'data-');
  element.textContent = atomText(node);
  return element;
}

const defaultWidget: WidgetRenderer = (decoration, doc) => {
  const element = doc.createElement('span');
  element.setAttribute('contenteditable', 'false');
  element.setAttribute('data-quoin-widget', decoration.widget);
  return element;
};

function own<T>(record: Readonly<Record<string, T>> | undefined, key: string): T | undefined {
  return record && Object.hasOwn(record, key) ? record[key] : undefined;
}

export function atomSpec(
  segment: Extract<Segment, { kind: 'atom' }>,
  options: RenderOptions,
  doc: Document,
): RenderSpec {
  const { node, decorations, from } = segment;
  const depth = wrapperDepth(node.marks, decorations);
  const soleContent = (wrappers: readonly Element[]) =>
    wrappers.length === 0 || wrappers[wrappers.length - 1].childNodes.length === 1;
  return {
    sig: segmentSignature(segment),
    create() {
      const render = own(options.atoms, node.type);
      const content = render ? render(node, doc) : defaultAtom(node, doc, options.atomText ?? defaultAtomText);
      const wrappers = createWrappers(node.marks, decorations, doc);
      wrappers[wrappers.length - 1]?.appendChild(content);
      return wrappers[0] ?? content;
    },
    refresh(top) {
      const chain = unwrap(top, depth);
      return chain !== null && soleContent(chain.wrappers);
    },
    describe(top, out) {
      const { wrappers, content } = unwrap(top, depth) as { wrappers: Element[]; content: Node };
      out.push(...wrapperEntries(wrappers, from, from + 1), { node: content, from, to: from + 1, kind: 'atom' });
    },
  };
}

export function widgetSpec(
  segment: Extract<Segment, { kind: 'widget' }>,
  options: RenderOptions,
  doc: Document,
): RenderSpec {
  const { decoration, from } = segment;
  return {
    sig: segmentSignature(segment),
    create: () => (own(options.widgets, decoration.widget) ?? defaultWidget)(decoration, doc),
    describe: (node, out) => void out.push({ node, from, to: from, kind: 'widget' }),
  };
}
