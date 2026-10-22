import { dataAttributes } from '../markdown/inline/data-attributes';
import { sameMark } from '../model/marks';
import type { AtomNode, Inline, Mark } from '../model/types';
import { element, type HtmlNode } from './html-node';
import { markElement } from './mark-node';

export type InlineHtmlOptions = {
  renderMath?: (latex: string, options: { displayMode: boolean }) => string;
};

function atomNode(node: AtomNode, options: InlineHtmlOptions): HtmlNode {
  const { attrs } = node;
  if (node.type === 'mention') {
    return element('span', [['data-mention', attrs.id ?? ''], ['data-kind', attrs.kind || undefined]], [`@${attrs.label ?? ''}`]);
  }
  if (node.type === 'math') {
    const latex = attrs.latex ?? '';
    const math: [string, string] = ['data-math', ''];
    return options.renderMath
      ? element('span', [math], [latex], options.renderMath(latex, { displayMode: false }))
      : element('span', [math], [latex]);
  }
  return element('span', [['data-atom', node.type], ...dataAttributes(attrs)]);
}

const textNodes = (value: string): HtmlNode[] =>
  value.split('\n').flatMap((line, at) => (at === 0 ? [line] : [element('br'), line]));

// Marks arrive sorted by rank, so keeping the longest shared prefix of open marks nests them in rank order.
// A link with an unsafe href is dropped but still takes its place in the open list, its content going to its parent.
export function inlineNodes(inline: Inline, options: InlineHtmlOptions = {}): HtmlNode[] {
  const root: HtmlNode[] = [];
  const open: { readonly mark: Mark; readonly children: HtmlNode[] }[] = [];
  const current = () => open[open.length - 1]?.children ?? root;
  for (const node of inline) {
    let shared = 0;
    while (shared < open.length && shared < node.marks.length && sameMark(open[shared].mark, node.marks[shared])) {
      shared++;
    }
    open.length = shared;
    for (const mark of node.marks.slice(shared)) {
      const wrapper = markElement(mark);
      if (wrapper) current().push(wrapper);
      open.push({ mark, children: wrapper?.children ?? current() });
    }
    current().push(...(node.kind === 'text' ? textNodes(node.text) : [atomNode(node, options)]));
  }
  return root;
}
