import { cellKey } from '../blocks/table-spec';
import type { EngineBlock, Inline } from '../model/types';

const count = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0;

export function tableCells(block: EngineBlock): Inline[][] {
  const cols = count(block.attrs.cols);
  return Array.from({ length: count(block.attrs.rows) }, (_, row) =>
    Array.from({ length: cols }, (_, col) => block.regions[cellKey(row, col)] ?? []),
  );
}
