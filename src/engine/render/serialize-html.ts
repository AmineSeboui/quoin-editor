import { escapeAttr, escapeHtml } from './escape-html';
import { writtenAttrs, type HtmlNode } from './html-node';

const VOID = new Set(['br', 'hr', 'img', 'input']);

const attrsHtml = (node: Exclude<HtmlNode, string>): string =>
  writtenAttrs(node.attrs)
    .map(([name, value]) => (value === true ? ` ${name}` : ` ${name}="${escapeAttr(value)}"`))
    .join('');

export const serializeHtml = (nodes: readonly HtmlNode[]): string =>
  nodes
    .map((node) =>
      typeof node === 'string'
        ? escapeHtml(node)
        : `<${node.tag}${attrsHtml(node)}>${VOID.has(node.tag) ? '' : `${node.html ?? serializeHtml(node.children)}</${node.tag}>`}`,
    )
    .join('');
