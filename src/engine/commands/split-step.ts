import type { EngineBlock } from '../model/types';
import type { Schema } from '../schema/types';
import { primaryRegion } from '../state/selection';
import { splitBlockStep } from '../transform/split-join-steps';
import type { Step } from '../transform/step';
import { createBlock, specOf } from './block-helpers';

export function splitStep(
  schema: Schema,
  block: EngineBlock,
  region: string,
  offset: number,
  id: string,
): { step: Step; tail: { id: string; region: string } } {
  const next = specOf(schema, block).splitAttrs?.(block.attrs) ?? { type: block.type, attrs: block.attrs };
  const created = createBlock(schema, next.type, next.attrs, block.indent, id);
  const tailRegion = primaryRegion(schema, created) ?? '';
  const { type, attrs, indent, regions } = created;
  const step = splitBlockStep(block.id, region, offset, { id, type, attrs, indent, region: tailRegion, regions });
  return { step, tail: { id, region: tailRegion } };
}
