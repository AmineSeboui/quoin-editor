import type { EngineBlock } from '../../engine/model/types';
import type { Box, Frame } from './box';
import { calloutBoxes, codeBoxes } from './framed-boxes';
import { imageBoxes } from './image-boxes';
import type { LayoutContext } from './layout-context';
import { lineBoxes } from './line-boxes';
import type { ListMarker } from './list-markers';
import { dividerBox, fileBoxes, mathBoxes, toggleBoxes, unknownBoxes, webLinkBoxes } from './plain-boxes';
import { tableBoxes } from './table-boxes';
import { tocBoxes } from './toc-boxes';

/** The boxes of one block, inside `frames`; a list item is drawn after its marker. */
export function blockBoxes(block: EngineBlock, ctx: LayoutContext, frames: readonly Frame[], marker?: ListMarker): Box[] {
  switch (block.type) {
    case 'MARKDOWN':
      return lineBoxes(block, ctx, frames, marker);
    case 'CALLOUT':
      return calloutBoxes(block, ctx, frames);
    case 'CODE':
      return codeBoxes(block, ctx, frames);
    case 'IMAGE':
      return imageBoxes(block, ctx, frames);
    case 'FILE':
      return fileBoxes(block, ctx, frames);
    case 'DIVIDER':
      return [dividerBox(block, ctx, frames)];
    case 'TOGGLE':
      return toggleBoxes(block, ctx, frames);
    case 'TABLE':
      return tableBoxes(block, ctx, frames);
    case 'EMBED':
    case 'BOOKMARK':
      return webLinkBoxes(block, ctx, frames);
    case 'MATH':
      return mathBoxes(block, ctx, frames);
    case 'TOC':
      return tocBoxes(block, ctx, frames);
    default:
      return unknownBoxes(block, ctx, frames);
  }
}
