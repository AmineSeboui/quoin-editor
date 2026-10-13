import type { EngineBlock } from '../model/types';
import type { Schema } from '../schema/types';
import { setAttrsStep } from '../transform/attrs-steps';
import { replaceBlockStep } from '../transform/block-steps';
import type { Step } from '../transform/step';
import { createBlock, withContent } from './block-helpers';

const PARAGRAPH = { kind: 'paragraph', level: undefined, checked: undefined, start: undefined };

export function paragraphStep(schema: Schema, block: EngineBlock, region: string): Step {
  if (block.type === 'MARKDOWN') return setAttrsStep(block.id, PARAGRAPH);
  const paragraph = createBlock(schema, schema.defaultTextBlock, {}, block.indent, block.id);
  return replaceBlockStep(withContent(schema, paragraph, block.regions[region]));
}
