import type { EngineBlock, Inline } from '../model/types';
import { alignAttr, indentAttr } from './block-attrs';
import { inlineOf, type BlockView, type HtmlEnv } from './html-env';
import { element, type HtmlNode } from './html-node';
import { tableCells } from './table-cells';

export function tableNode(block: EngineBlock, view: BlockView, env: HtmlEnv): HtmlNode {
  const rows = tableCells(block);
  const aligns: unknown[] = Array.isArray(block.attrs.align) ? block.attrs.align : [];
  const row = (tag: 'th' | 'td', cells: readonly Inline[]) =>
    element('tr', [], cells.map((cell, col) => element(tag, [alignAttr(aligns[col])], inlineOf(cell, env))));
  const headed = block.attrs.header !== false && rows.length > 0;
  const head = headed ? [element('thead', [], [row('th', rows[0])])] : [];
  const bodyRows = headed ? rows.slice(1) : rows;
  const body = bodyRows.length > 0 ? [element('tbody', [], bodyRows.map((cells) => row('td', cells)))] : [];
  return element('table', [indentAttr(view.excess)], [...head, ...body]);
}
