import { element, type Attr, type HtmlElement, type HtmlNode } from '../engine/render/html-node';

const attrOf = (node: HtmlElement, name: string) => node.attrs.find(([key]) => key === name)?.[1];

const isChange = (node: HtmlNode) =>
  typeof node !== 'string' && (node.tag === 'ins' || node.tag === 'del' || attrOf(node, 'data-diff') !== undefined);

// Each item takes the number its version gives it: a kept item the newer one's, a removed item the older one's.
function numbered(list: HtmlElement, children: HtmlNode[]): HtmlNode[] {
  let older = Number(attrOf(list, 'start') ?? 1);
  let newer = older;
  return children.map((item) => {
    if (typeof item === 'string') return item;
    const status = attrOf(item, 'data-diff');
    const inOlder = status !== 'added' && status !== 'moved';
    const inNewer = status !== 'removed' && status !== 'moved-away';
    const value: Attr = ['value', String(inNewer ? newer : older)];
    if (inOlder) older++;
    if (inNewer) newer++;
    return element(item.tag, [value, ...item.attrs], item.children, item.html);
  });
}

function settled(node: HtmlNode): { node: HtmlNode; holds: boolean } {
  if (typeof node === 'string') return { node, holds: false };
  const walked = node.children.map(settled);
  const holds = walked.some((child) => child.holds || isChange(child.node));
  let children = walked.map((child) => child.node);
  let attrs = node.attrs;
  if (node.tag === 'details' && holds && attrOf(node, 'open') !== true) {
    attrs = [['open', true], ...attrs.filter(([name]) => name !== 'open')];
  }
  if (node.tag === 'ol' && children.some(isChange)) children = numbered(node, children);
  const same = attrs === node.attrs && children.every((child, at) => child === node.children[at]);
  return { node: same ? node : element(node.tag, attrs, children, node.html), holds };
}

/**
 * The nodes of a diff with what its blocks cannot settle alone: a toggle that holds a change is open, so no change is
 * hidden, and the items of a numbered list keep their versions' numbers.
 */
export const settledDiff = (nodes: readonly HtmlNode[]): HtmlNode[] => nodes.map((node) => settled(node).node);
