import { cellOf, cellsBetween } from '../blocks/table-cell';
import { cellKey } from '../blocks/table-spec';
import type { EngineBlock, Inline } from '../model/types';

/**
 * The cells of a table between two of its regions, as a table of their own that keeps their columns' alignment and
 * widths, and the header row only when it is one of them. The whole block for regions that are no cells.
 */
export function tablePart(block: EngineBlock, from: string, to: string): EngineBlock {
  const a = cellOf(from);
  const b = cellOf(to);
  if (a === null || b === null) return block;
  const cells = cellsBetween(a, b);
  const [top, left] = cells[0];
  const [bottom, right] = cells[cells.length - 1];
  const regions: Record<string, Inline> = {};
  for (const [row, col] of cells) regions[cellKey(row - top, col - left)] = block.regions[cellKey(row, col)] ?? [];
  const columns = (list: unknown) => (Array.isArray(list) ? list.slice(left, right + 1) : list);
  const { attrs } = block;
  return {
    ...block,
    regions,
    attrs: {
      ...attrs,
      rows: bottom - top + 1,
      cols: right - left + 1,
      header: attrs.header !== false && top === 0,
      align: columns(attrs.align),
      widths: columns(attrs.widths),
    },
  };
}
