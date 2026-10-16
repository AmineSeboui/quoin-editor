export type DropTarget = { index: number; indent: number; lineTop: number; lineLeft: number };

/** A drawn block, with `left` where its indent is measured from. */
export type DropCandidate = { id: string; top: number; bottom: number; left: number; indent: number; dragged: boolean };

export type DropTargetInput = {
  pointerX: number;
  pointerY: number;
  blocks: readonly DropCandidate[];
  indentStep: number;
};

function gapY(blocks: readonly DropCandidate[], gap: number): number {
  if (gap === 0) return blocks[0].top;
  if (gap === blocks.length) return blocks[gap - 1].bottom;
  return (blocks[gap - 1].bottom + blocks[gap].top) / 2;
}

function nearestGap(blocks: readonly DropCandidate[], pointerY: number): number {
  let nearest = 0;
  for (let gap = 1; gap <= blocks.length; gap++) {
    if (Math.abs(gapY(blocks, gap) - pointerY) < Math.abs(gapY(blocks, nearest) - pointerY)) nearest = gap;
  }
  return nearest;
}

/** The gap among the blocks not being dragged that a drop at the pointer lands in, and the indent it takes there. */
export function computeDropTarget({ pointerX, pointerY, blocks, indentStep }: DropTargetInput): DropTarget {
  const staying = blocks.filter((block) => !block.dragged);
  if (staying.length === 0) return { index: 0, indent: 0, lineTop: blocks[0].top, lineLeft: blocks[0].left };
  const index = nearestGap(staying, pointerY);
  const lineTop = gapY(staying, index);
  if (index === 0) return { index, indent: 0, lineTop, lineLeft: staying[0].left };
  const above = staying[index - 1];
  const indent = Math.min(Math.max(Math.round((pointerX - above.left) / indentStep), 0), above.indent + 1);
  return { index, indent, lineTop, lineLeft: above.left + indent * indentStep };
}
