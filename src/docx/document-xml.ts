import type { Entry, Group } from '../engine/render/block-groups';
import { blockXml } from './block-xml';
import type { DocxContext } from './docx-context';
import { PAGE_TEXT_WIDTH } from './drawing-xml';
import { XML_DECLARATION, xmlElement } from './xml';

const NAMESPACES = {
  'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  'xmlns:wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
};

const MARGIN = 1440;
const SECTION = xmlElement(
  'w:sectPr',
  {},
  xmlElement('w:pgSz', { 'w:w': PAGE_TEXT_WIDTH + 2 * MARGIN, 'w:h': 16838 }) +
    xmlElement('w:pgMar', {
      'w:top': MARGIN,
      'w:right': MARGIN,
      'w:bottom': MARGIN,
      'w:left': MARGIN,
      'w:header': 708,
      'w:footer': 708,
      'w:gutter': 0,
    }),
);

const LEVELS = 9;

function entryXml({ block, children }: Entry, ctx: DocxContext, numId?: number): string {
  return blockXml(block, ctx, numId) + groupsXml(children, ctx);
}

function groupXml(group: Group, ctx: DocxContext): string {
  if (group.kind === 'single') return entryXml(group.entry, ctx);
  if (group.kind === 'quote') return group.items.map((entry) => entryXml(entry, ctx)).join('');
  const first = group.items[0].block;
  const start = first.attrs.start;
  const numId =
    group.list === 'task'
      ? undefined
      : ctx.list(group.list === 'ordered', Math.min(first.indent, LEVELS - 1), Number.isInteger(start) ? Number(start) : 1);
  return group.items.map((entry) => entryXml(entry, ctx, numId)).join('');
}

const groupsXml = (groups: readonly Group[], ctx: DocxContext): string => groups.map((group) => groupXml(group, ctx)).join('');

// Word joins two tables that touch and wants a paragraph after a table that ends the body.
const separateTables = (body: string) =>
  body.replaceAll('</w:tbl><w:tbl>', '</w:tbl><w:p/><w:tbl>').replace(/<\/w:tbl>$/, '</w:tbl><w:p/>');

/** The main part of a Word document: the body of grouped blocks, then the page set up. */
export function documentXml(groups: readonly Group[], ctx: DocxContext): string {
  const body = separateTables(groupsXml(groups, ctx)) || '<w:p/>';
  return XML_DECLARATION + xmlElement('w:document', NAMESPACES, xmlElement('w:body', {}, body + SECTION));
}
