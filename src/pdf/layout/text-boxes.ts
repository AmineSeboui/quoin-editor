import type { Align } from '../../engine/blocks/data-fields';
import type { PageCanvas } from '../paint/page-canvas';
import { paintLine } from '../paint/paint-line';
import { glyphItems, type Piece } from '../text/glyph-items';
import { layoutLines, type Line } from '../text/line-layout';
import type { Box, Frame } from './box';
import type { LayoutContext } from './layout-context';

export type TextBlock = {
  readonly blockId: string;
  readonly pieces: readonly Piece[];
  readonly x: number;
  readonly width: number;
  readonly size: number;
  readonly align?: Align;
  readonly leading?: number;
  readonly frames?: readonly Frame[];
  /** Kept with what follows, as a heading is. */
  readonly keep?: boolean;
  readonly anchor?: string;
  /** Paints what stands before the first line, such as a list marker, given its baseline. */
  readonly marker?: (canvas: PageCanvas, baseline: number) => void;
};

export const LEADING = 1.4;

/** Where the baseline of a line sits below its top, the glyphs centred in the line's height. */
export const baselineOffset = (size: number, leading: number): number => size * ((leading - 1) / 2 + 0.8);

/** The lines of a text, laid out in its width, with the characters no font draws recorded against its block. */
export function textLines(block: Pick<TextBlock, 'blockId' | 'pieces' | 'width' | 'align'>, ctx: LayoutContext): Line[] {
  const items = glyphItems(block.pieces, ctx.fonts);
  const missing = items.filter(({ use, newline }) => !use && !newline).map(({ text }) => text);
  if (missing.length > 0) ctx.missing(block.blockId, missing);
  return layoutLines(items, block.width, block.align);
}

/** A text as boxes, one a line, so a page can break between any two of them. */
export function textBoxes(block: TextBlock, ctx: LayoutContext): Box[] {
  const leading = block.leading ?? LEADING;
  const height = block.size * leading;
  return textLines(block, ctx).map((line, at) => ({
    height,
    frames: block.frames,
    keepWithNext: block.keep,
    anchor: at === 0 ? block.anchor : undefined,
    paint(canvas, top) {
      const baseline = top + baselineOffset(block.size, leading);
      paintLine(canvas, line, block.x, baseline);
      if (at === 0) block.marker?.(canvas, baseline);
    },
  }));
}
