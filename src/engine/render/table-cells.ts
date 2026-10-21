import { cellKey } from '../blocks/table-spec';
import { countOf } from '../model/count';
import type { EngineBlock, Inline } from '../model/types';

export function tableCells(block: EngineBlock): Inline[][] {
  const cols = countOf(block.attrs.cols);
  return Array.from({ length: countOf(block.attrs.rows) }, (_, row) =>
    Array.from({ length: cols }, (_, col) => block.regions[cellKey(row, col)] ?? []),
  );
}
