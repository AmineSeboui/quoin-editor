import type { EngineBlock, Inline } from '../model/types';
import { alignAttr, indentAttr } from './block-attrs';
import { inlineHTML, type BlockView, type HtmlEnv } from './html-env';
import { element } from './html-tag';
import { tableCells } from './table-cells';

export function tableHTML(block: EngineBlock, view: BlockView, env: HtmlEnv): string {
  const rows = tableCells(block);
  const aligns: unknown[] = Array.isArray(block.attrs.align) ? block.attrs.align : [];
  const rowHTML = (tag: 'th' | 'td', cells: readonly Inline[]) =>
    element('tr', [], cells.map((cell, col) => element(tag, [alignAttr(aligns[col])], inlineHTML(cell, env))).join(''));
  const headed = block.attrs.header !== false && rows.length > 0;
  const head = headed ? element('thead', [], rowHTML('th', rows[0])) : '';
  const bodyRows = headed ? rows.slice(1) : rows;
  const body = bodyRows.length > 0 ? element('tbody', [], bodyRows.map((cells) => rowHTML('td', cells)).join('')) : '';
  return element('table', [indentAttr(view.excess)], head + body);
}
