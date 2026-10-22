import { createElement, type ReactElement, type ReactNode } from 'react';
import type { HtmlElement, HtmlNode } from '../engine/render/html-node';
import { reactProps } from './react-props';

/** What to draw inside an element in place of its children, such as the preview of a custom block. */
export type HtmlSlots = ReadonlyMap<HtmlElement, ReactNode>;

const NO_SLOTS: HtmlSlots = new Map();

function reactElement(node: HtmlElement, slots: HtmlSlots): ReactElement {
  const props = reactProps(node.attrs);
  if (node.html !== undefined) return createElement(node.tag, { ...props, dangerouslySetInnerHTML: { __html: node.html } });
  const children = slots.has(node) ? [slots.get(node)] : reactNodes(node.children, slots);
  return createElement(node.tag, props, ...children);
}

/**
 * React elements for HTML nodes. Neighbouring texts are joined, so a server render writes no separator between them,
 * and children go in as arguments, so they need no keys.
 */
export function reactNodes(nodes: readonly HtmlNode[], slots: HtmlSlots = NO_SLOTS): ReactNode[] {
  const out: ReactNode[] = [];
  let text = '';
  for (const node of nodes) {
    if (typeof node === 'string') {
      text += node;
      continue;
    }
    if (text !== '') out.push(text);
    text = '';
    out.push(reactElement(node, slots));
  }
  if (text !== '') out.push(text);
  return out;
}
