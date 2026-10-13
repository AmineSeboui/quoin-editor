import { inlineLength, removeMarkRange } from '../../model/inline';
import type { EngineBlock, Inline } from '../../model/types';

const hasCommentMark = (inline: Inline) => inline.some((node) => node.marks.some((mark) => mark.type === 'comment'));

export function stripComments(block: EngineBlock): EngineBlock {
  const regions = Object.entries(block.regions);
  if (!regions.some(([, inline]) => hasCommentMark(inline))) return block;
  return {
    ...block,
    regions: Object.fromEntries(
      regions.map(([name, inline]) => [
        name,
        hasCommentMark(inline) ? removeMarkRange(inline, 0, inlineLength(inline), 'comment') : inline,
      ]),
    ),
  };
}
