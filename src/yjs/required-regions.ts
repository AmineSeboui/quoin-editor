import { cellKey } from '../engine/blocks/table-spec';
import { countOf } from '../engine/model/count';
import type { BlockAttrs } from '../engine/model/types';
import type { Schema } from '../engine/schema/types';

/** The regions a block of a type cannot be without, which a reading gives it empty when the text holds none. */
export type RequiredRegions = (type: string, attrs?: BlockAttrs) => readonly string[];

export const noRequiredRegions: RequiredRegions = () => [];

function cells(attrs: BlockAttrs): string[] {
  const cols = countOf(attrs.cols);
  return Array.from({ length: countOf(attrs.rows) * cols }, (_, i) => cellKey((i / cols) | 0, i % cols));
}

/**
 * The regions of each text block type of `schema`, so that every command that edits text finds them, and the cells of
 * a table, so that each can be selected and typed into.
 */
export function requiredRegions(schema: Schema): RequiredRegions {
  const known = new Map<string, readonly string[]>();
  return (type, attrs = {}) => {
    if (type === 'TABLE') return cells(attrs);
    let names = known.get(type);
    if (names === undefined) {
      const spec = schema.blocks.get(type);
      names = spec?.flow === 'text' ? Object.keys(spec.initial().regions) : [];
      known.set(type, names);
    }
    return names;
  };
}
