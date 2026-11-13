import { alignOrUndefined, optionalNumber, str } from '../../engine/blocks/data-fields';
import type { EngineBlock } from '../../engine/model/types';
import { pictureUrl } from '../../export/asset-source';
import type { PdfImage } from '../image/pdf-image';
import { inlinePieces } from '../text/inline-pieces';
import { BODY, MUTED } from '../text/text-style';
import type { Box, Frame } from './box';
import { indented, type LayoutContext } from './layout-context';
import { textBoxes } from './text-boxes';

// A CSS pixel, in points.
const PIXEL = 0.75;
const CAPTION = { ...BODY, size: 9, italic: true, color: MUTED };

// A width percent sizes the picture to that share of the text width; otherwise it keeps its own size, down to fit.
function sizeOf(image: PdfImage, block: EngineBlock, width: number, room: number): { width: number; height: number } {
  const percent = optionalNumber(block.attrs.widthPercent);
  const share = percent && percent > 0 && percent <= 100 ? (width * percent) / 100 : undefined;
  const drawn = share ?? Math.min(image.width * PIXEL, width);
  const height = (drawn * image.height) / image.width;
  return height > room ? { width: (drawn * room) / height, height: room } : { width: drawn, height };
}

function pictureBox(image: PdfImage, block: EngineBlock, ctx: LayoutContext, frames: readonly Frame[]): Box {
  const area = indented(ctx, block.indent);
  const size = sizeOf(image, block, area.width, ctx.room);
  const align = alignOrUndefined(block.attrs.align);
  const free = area.width - size.width;
  const x = area.x + (align === 'center' ? free / 2 : align === 'right' ? free : 0);
  return {
    height: size.height,
    frames,
    paint: (canvas, top) => canvas.image(canvas.resources.image(image), x, top, size.width, size.height),
  };
}

/** A picture, or its alt text where it could not be drawn, then its caption. */
export function imageBoxes(block: EngineBlock, ctx: LayoutContext, frames: readonly Frame[]): Box[] {
  const url = pictureUrl(block, ctx.resolveAssetUrl);
  const picture = url === null ? undefined : ctx.images.get(url);
  const area = indented(ctx, block.indent);
  const align = alignOrUndefined(block.attrs.align);
  const text = (pieces: ReturnType<typeof inlinePieces>, size: number) =>
    textBoxes({ blockId: block.id, pieces, x: area.x, width: area.width, size, align, frames }, ctx);
  const caption = block.regions.caption ?? [];
  const captionBoxes = caption.length > 0 ? text(inlinePieces(caption, ctx, CAPTION), CAPTION.size) : [];
  if (typeof picture === 'object') {
    return [{ ...pictureBox(picture, block, ctx, frames), keepWithNext: captionBoxes.length > 0 }, ...captionBoxes];
  }
  if (url !== null && picture !== undefined) ctx.report({ type: 'image', blockId: block.id, url, reason: picture });
  const alt = str(block.attrs.alt);
  return [...(alt === '' ? [] : text([{ text: alt, style: BODY }], BODY.size)), ...captionBoxes];
}
