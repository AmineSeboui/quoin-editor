import { str } from '../engine/blocks/data-fields';
import type { EngineBlock } from '../engine/model/types';
import { blockPlainText } from '../engine/render/block-plain-text';
import type { DocxContext } from './docx-context';
import { lineXml } from './line-xml';
import { fileXml, imageXml, webLinkXml } from './media-xml';
import { indentOf, paragraphXml } from './paragraph-xml';
import { CODE_CHAR_STYLE, CODE_STYLE } from './style-ids';
import { runsXml, runXml } from './runs-xml';
import { calloutXml, tableXml } from './table-xml';
import { tocXml } from './toc-xml';

function unknownXml(block: EngineBlock, ctx: DocxContext): string {
  const text = blockPlainText(block, ctx.schema);
  const label = runXml(`[${block.type}]`, { italic: true });
  return paragraphXml({ indent: indentOf(block.indent) }, label + runXml(text && ` ${text}`));
}

/** The paragraphs or table of one block; a list item is numbered by `numId`. */
export function blockXml(block: EngineBlock, ctx: DocxContext, numId?: number): string {
  const indent = { indent: indentOf(block.indent) };
  switch (block.type) {
    case 'MARKDOWN':
      return lineXml(block, ctx, numId);
    case 'CALLOUT':
      return calloutXml(block, ctx);
    case 'CODE':
      return paragraphXml({ ...indent, style: CODE_STYLE }, runXml(str(block.attrs.code)));
    case 'IMAGE':
      return imageXml(block, ctx);
    case 'FILE':
      return fileXml(block, ctx);
    case 'DIVIDER':
      return paragraphXml({ ...indent, border: true }, '');
    case 'TOGGLE':
      return paragraphXml(indent, runsXml(block.regions.text, ctx));
    case 'TABLE':
      return tableXml(block, ctx);
    case 'EMBED':
    case 'BOOKMARK':
      return webLinkXml(block, ctx);
    case 'MATH':
      return paragraphXml(indent, runXml(str(block.attrs.latex), { style: CODE_CHAR_STYLE }));
    case 'TOC':
      return tocXml(ctx.headings, ctx, indent.indent);
    default:
      return unknownXml(block, ctx);
  }
}
