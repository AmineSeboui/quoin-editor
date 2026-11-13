import type { EngineBlock } from '../../engine/model/types';
import { nestHeadings, type HeadingNode } from '../../engine/render/heading-tree';
import type { Heading } from '../../engine/render/headings';
import { BODY, LINK } from '../text/text-style';
import type { Box, Frame } from './box';
import { indented, type LayoutContext } from './layout-context';
import { textBoxes } from './text-boxes';

const LEVEL_STEP = 18;

/** The table of contents: a line for each heading, nested as the headings are, each linking to its heading. */
export function tocBoxes(block: EngineBlock, ctx: LayoutContext, frames: readonly Frame[]): Box[] {
  const area = indented(ctx, block.indent);
  const entries = (nodes: readonly HeadingNode<Heading>[], depth: number): Box[] =>
    nodes.flatMap(({ heading, children }) => [
      ...textBoxes(
        {
          blockId: block.id,
          pieces: [{ text: heading.text, style: { ...BODY, color: LINK, link: { heading: heading.blockId } } }],
          x: area.x + depth * LEVEL_STEP,
          width: area.width - depth * LEVEL_STEP,
          size: BODY.size,
          leading: 1.3,
          frames,
        },
        ctx,
      ),
      ...entries(children, depth + 1),
    ]);
  return entries(nestHeadings(ctx.headings), 0);
}
