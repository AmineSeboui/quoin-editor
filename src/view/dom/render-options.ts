import type { AtomNode, Decoration } from '../../engine';

export type AtomRenderer = (node: AtomNode, doc: Document) => HTMLElement;
export type WidgetRenderer = (decoration: Extract<Decoration, { kind: 'widget' }>, doc: Document) => HTMLElement;

export type RenderOptions = {
  atoms?: Readonly<Record<string, AtomRenderer>>;
  widgets?: Readonly<Record<string, WidgetRenderer>>;
  atomText?: (node: AtomNode) => string;
};
