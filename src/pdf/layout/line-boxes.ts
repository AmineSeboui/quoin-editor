import { alignOrUndefined } from '../../engine/blocks/data-fields';
import type { EngineBlock } from '../../engine/model/types';
import { headingLevel } from '../../engine/render/headings';
import { backgroundHex, textHex } from '../../export/palette-hex';
import { inlinePieces } from '../text/inline-pieces';
import { BODY, MUTED, rgbOf, type TextStyle } from '../text/text-style';
import type { Box, Frame } from './box';
import { indented, type LayoutContext } from './layout-context';
import { MARKER_GUTTER, markerPainter, type ListMarker } from './list-markers';
import { textBoxes } from './text-boxes';

export const HEADING_SIZES = [18, 15, 13, 12, 11, 11];

// A quote's text starts this far right of the bar its group draws.
const QUOTE_INSET = 12;

function baseStyle(block: EngineBlock): TextStyle {
  const color = textHex(block.attrs.color);
  const level = headingLevel(block);
  const style = color === undefined ? BODY : { ...BODY, color: rgbOf(color) };
  if (level !== null) return { ...style, size: HEADING_SIZES[level - 1], bold: true };
  return block.attrs.kind === 'quote' ? { ...style, italic: true, color: color === undefined ? MUTED : style.color } : style;
}

/** A text block: a heading, a paragraph, a quote line, or a list item drawn after `marker`. */
export function lineBoxes(block: EngineBlock, ctx: LayoutContext, frames: readonly Frame[], marker?: ListMarker): Box[] {
  const style = baseStyle(block);
  const area = indented(ctx, block.indent, block.attrs.kind === 'quote' ? QUOTE_INSET : 0);
  const x = marker ? area.x + MARKER_GUTTER : area.x;
  const width = marker ? area.width - MARKER_GUTTER : area.width;
  const fill = backgroundHex(block.attrs.background);
  const shaded = fill === undefined ? frames : [...frames, { x: area.x, width: area.width, fill: rgbOf(fill) }];
  const heading = headingLevel(block) !== null;
  return textBoxes(
    {
      blockId: block.id,
      pieces: inlinePieces(block.regions.text, ctx, style),
      x,
      width,
      size: style.size,
      align: alignOrUndefined(block.attrs.align),
      frames: shaded,
      keep: heading,
      anchor: heading ? block.id : undefined,
      marker: marker && markerPainter(marker, area.x, style.size, ctx),
    },
    ctx,
  );
}
