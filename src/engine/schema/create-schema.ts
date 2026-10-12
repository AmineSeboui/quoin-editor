import { coreBlockSpecs } from '../blocks/core-specs';
import { coreAtomSpecs } from './core-atoms';
import { coreMarkSpecs } from './core-marks';
import type { AtomSpec, BlockSpec, MarkSpec, Schema } from './types';

export type SchemaInput = {
  blocks?: BlockSpec[];
  marks?: MarkSpec[];
  atoms?: AtomSpec[];
  defaultTextBlock?: string;
};

const byType = <T extends { readonly type: string }>(specs: readonly T[]): ReadonlyMap<string, T> =>
  new Map(specs.map((spec) => [spec.type, spec]));

export function createSchema(input: SchemaInput = {}): Schema {
  return {
    blocks: byType([...coreBlockSpecs, ...(input.blocks ?? [])]),
    marks: byType([...coreMarkSpecs, ...(input.marks ?? [])]),
    atoms: byType([...coreAtomSpecs, ...(input.atoms ?? [])]),
    defaultTextBlock: input.defaultTextBlock ?? 'MARKDOWN',
  };
}
