import { str } from '../../engine/blocks/data-fields';
import type { EngineBlock } from '../../engine/model/types';
import { calloutFill } from '../../export/callout-fill';
import { inlinePieces } from '../text/inline-pieces';
import { BODY, CODE_FILL, rgbOf } from '../text/text-style';
import type { Box, Frame } from './box';
import { indented, type LayoutContext } from './layout-context';
import { textBoxes } from './text-boxes';

const PADDING = 8;
const CODE_SIZE = 9.5;
const CODE_LEADING = 1.35;

// The padding above is kept with the first line; the padding below is dropped where it does not fit, like a gap.
const padded = (frames: readonly Frame[], boxes: Box[]): Box[] => [
  { height: PADDING, frames, keepWithNext: true },
  ...boxes,
  { height: PADDING, frames, gap: true },
];

/** A code block: its source in a monospaced face on a shaded ground, its line breaks and indentation kept. */
export function codeBoxes(block: EngineBlock, ctx: LayoutContext, outer: readonly Frame[]): Box[] {
  const area = indented(ctx, block.indent);
  const frames = [...outer, { x: area.x, width: area.width, fill: CODE_FILL }];
  const style = { ...BODY, size: CODE_SIZE, mono: true };
  const text = { blockId: block.id, pieces: [{ text: str(block.attrs.code), style }], size: CODE_SIZE, leading: CODE_LEADING };
  return padded(frames, textBoxes({ ...text, x: area.x + PADDING, width: area.width - 2 * PADDING, frames }, ctx));
}

/** A callout: its icon and body on the ground of its tone. */
export function calloutBoxes(block: EngineBlock, ctx: LayoutContext, outer: readonly Frame[]): Box[] {
  const area = indented(ctx, block.indent);
  const frames = [...outer, { x: area.x, width: area.width, fill: rgbOf(calloutFill(block.attrs.tone)) }];
  const icon = str(block.attrs.icon);
  const pieces = [...(icon === '' ? [] : [{ text: `${icon} `, style: BODY }]), ...inlinePieces(block.regions.body, ctx, BODY)];
  const inset = PADDING + 4;
  return padded(frames, textBoxes({ blockId: block.id, pieces, x: area.x + inset, width: area.width - 2 * inset, size: BODY.size, frames }, ctx));
}
