import type { Schema } from '../engine/schema/types';

/** The regions a block of a type cannot be without, which a reading gives it empty when the text holds none. */
export type RequiredRegions = (type: string) => readonly string[];

export const noRequiredRegions: RequiredRegions = () => [];

/** The regions of each text block type of `schema`, so that every command that edits text finds them. */
export function requiredRegions(schema: Schema): RequiredRegions {
  const known = new Map<string, readonly string[]>();
  return (type) => {
    let names = known.get(type);
    if (names === undefined) {
      const spec = schema.blocks.get(type);
      names = spec?.flow === 'text' ? Object.keys(spec.initial().regions) : [];
      known.set(type, names);
    }
    return names;
  };
}
