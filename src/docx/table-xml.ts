import { str } from '../engine/blocks/data-fields';
import type { EngineBlock } from '../engine/model/types';
import { tableCells } from '../engine/render/table-cells';
import type { DocxContext } from './docx-context';
import { PAGE_TEXT_WIDTH } from './drawing-xml';
import { backgroundHex } from './palette-hex';
import { indentOf, paragraphXml } from './paragraph-xml';
import { runsXml, runXml } from './runs-xml';
import { xmlElement } from './xml';

const TONE_COLORS: Readonly<Record<string, string>> = {
  info: 'blue',
  tip: 'purple',
  success: 'green',
  warning: 'yellow',
  danger: 'red',
};

const NO_BORDERS = xmlElement(
  'w:tblBorders',
  {},
  ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((side) => xmlElement(`w:${side}`, { 'w:val': 'nil' })).join(''),
);

type Shell = { readonly cols: number; readonly indent: number; readonly style?: string; readonly rows: readonly string[] };

function tableShell({ cols, indent, style, rows }: Shell): string {
  const width = Math.floor((PAGE_TEXT_WIDTH - indentOf(indent)) / cols);
  const props =
    (style ? xmlElement('w:tblStyle', { 'w:val': style }) : '') +
    xmlElement('w:tblW', { 'w:w': width * cols, 'w:type': 'dxa' }) +
    (indent > 0 ? xmlElement('w:tblInd', { 'w:w': indentOf(indent), 'w:type': 'dxa' }) : '') +
    (style ? '' : NO_BORDERS);
  const grid = Array.from({ length: cols }, () => xmlElement('w:gridCol', { 'w:w': width })).join('');
  return xmlElement('w:tbl', {}, xmlElement('w:tblPr', {}, props) + xmlElement('w:tblGrid', {}, grid) + rows.join(''));
}

const cellXml = (inner: string, cellProps = '') =>
  xmlElement('w:tc', {}, (cellProps && xmlElement('w:tcPr', {}, cellProps)) + inner);

/** A table, its first row repeated as a header on each page when the block has one. */
export function tableXml(block: EngineBlock, ctx: DocxContext): string {
  const rows = tableCells(block);
  const cols = rows[0]?.length ?? 0;
  if (rows.length === 0 || cols === 0) return '';
  const aligns: unknown[] = Array.isArray(block.attrs.align) ? block.attrs.align : [];
  const headed = block.attrs.header !== false;
  const rowXml = (cells: (typeof rows)[number], header: boolean) => {
    const base = header ? { bold: true } : {};
    const written = cells.map((cell, col) => cellXml(paragraphXml({ align: aligns[col] }, runsXml(cell, ctx, base))));
    return xmlElement('w:tr', {}, (header ? '<w:trPr><w:tblHeader/></w:trPr>' : '') + written.join(''));
  };
  const written = rows.map((cells, row) => rowXml(cells, headed && row === 0));
  return tableShell({ cols, indent: block.indent, style: 'TableGrid', rows: written });
}

/** A callout as one shaded cell holding its icon and body. */
export function calloutXml(block: EngineBlock, ctx: DocxContext): string {
  const icon = str(block.attrs.icon);
  const fill = backgroundHex(TONE_COLORS[str(block.attrs.tone)] ?? 'gray');
  const shade = xmlElement('w:shd', { 'w:val': 'clear', 'w:color': 'auto', 'w:fill': fill });
  const body = paragraphXml({}, (icon === '' ? '' : runXml(`${icon} `)) + runsXml(block.regions.body, ctx));
  return tableShell({ cols: 1, indent: block.indent, rows: [xmlElement('w:tr', {}, cellXml(body, shade))] });
}
