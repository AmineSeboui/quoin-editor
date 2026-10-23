import type { EngineBlock } from '../engine/model/types';

const CELL = /^cell:(\d+):(\d+)$/;

/** A table grown to hold every cell either version has, so the rows and columns only the older one had are drawn. */
export function withEveryCell(block: EngineBlock, regions: readonly string[]): EngineBlock {
  if (block.type !== 'TABLE') return block;
  let rows = Number(block.attrs.rows) || 0;
  let cols = Number(block.attrs.cols) || 0;
  for (const name of regions) {
    const cell = CELL.exec(name);
    if (cell) {
      rows = Math.max(rows, Number(cell[1]) + 1);
      cols = Math.max(cols, Number(cell[2]) + 1);
    }
  }
  return { ...block, attrs: { ...block.attrs, rows, cols } };
}
