import { str } from '../../engine/blocks/data-fields';
import type { EngineBlock } from '../../engine/model/types';
import { blockPlainText } from '../../engine/render/block-plain-text';
import { assetUrl } from '../../export/asset-source';
import { linkTarget } from '../../export/link-target';
import type { Piece } from '../text/glyph-items';
import { inlinePieces, linkedStyle } from '../text/inline-pieces';
import { BODY, RULE } from '../text/text-style';
import type { Box, Frame } from './box';
import { indented, type LayoutContext } from './layout-context';
import { textBoxes } from './text-boxes';

const DIVIDER_HEIGHT = 12;

function paragraph(block: EngineBlock, pieces: readonly Piece[], ctx: LayoutContext, frames: readonly Frame[]): Box[] {
  const area = indented(ctx, block.indent);
  return textBoxes({ blockId: block.id, pieces, x: area.x, width: area.width, size: BODY.size, frames }, ctx);
}

/** A paragraph of `text`, linked to `href` where an exported file can open it. */
function linkParagraph(block: EngineBlock, href: string | null, text: string, ctx: LayoutContext, frames: readonly Frame[]): Box[] {
  const uri = href === null ? null : linkTarget(href, ctx.baseUrl);
  return paragraph(block, [{ text, style: uri === null ? BODY : linkedStyle(BODY, uri) }], ctx, frames);
}

export const fileBoxes = (block: EngineBlock, ctx: LayoutContext, frames: readonly Frame[]): Box[] =>
  linkParagraph(block, assetUrl(block, ctx.resolveAssetUrl), str(block.attrs.filename), ctx, frames);

export function webLinkBoxes(block: EngineBlock, ctx: LayoutContext, frames: readonly Frame[]): Box[] {
  const url = str(block.attrs.url);
  const text = block.type === 'BOOKMARK' ? str(block.attrs.title) || url : url;
  return url === '' ? [] : linkParagraph(block, url, text, ctx, frames);
}

export const mathBoxes = (block: EngineBlock, ctx: LayoutContext, frames: readonly Frame[]): Box[] =>
  paragraph(block, [{ text: str(block.attrs.latex), style: { ...BODY, mono: true } }], ctx, frames);

export const toggleBoxes = (block: EngineBlock, ctx: LayoutContext, frames: readonly Frame[]): Box[] =>
  paragraph(block, inlinePieces(block.regions.text, ctx, BODY), ctx, frames);

export function dividerBox(block: EngineBlock, ctx: LayoutContext, frames: readonly Frame[]): Box {
  const area = indented(ctx, block.indent);
  return {
    height: DIVIDER_HEIGHT,
    frames,
    paint: (canvas, top) => canvas.fillRect(area.x, top + DIVIDER_HEIGHT / 2, area.width, 0.75, RULE),
  };
}

/** A block type the export does not know: its type in brackets, then its plain text where its spec gives one. */
export function unknownBoxes(block: EngineBlock, ctx: LayoutContext, frames: readonly Frame[]): Box[] {
  const text = blockPlainText(block, ctx.schema);
  const pieces = [{ text: `[${block.type}]`, style: { ...BODY, italic: true } }, { text: text && ` ${text}`, style: BODY }];
  return paragraph(block, pieces, ctx, frames);
}
