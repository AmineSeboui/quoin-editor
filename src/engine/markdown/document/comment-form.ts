import { specFor } from '../../blocks/unknown-spec';
import type { EngineBlock } from '../../model/types';
import type { MarkdownExportContext, Schema } from '../../schema/types';

// The types that are written as markdown even when lossless, with the data keys that markdown can carry.
const NATIVE_KEYS = new Map<string, readonly string[]>([
  ['MARKDOWN', ['markdown']],
  ['TOGGLE', ['markdown', 'open']],
  ['DIVIDER', []],
  ['TOC', []],
]);

export const hasNativeForm = (type: string): boolean => NATIVE_KEYS.has(type);

// When lossless, a block with a native form is still a comment if it holds data that form cannot carry, such as align,
// colour or an unknown key, or if the containers above it do not account for all of its indent.
export function needsComment(
  block: EngineBlock,
  residual: number,
  schema: Schema,
  ctx: MarkdownExportContext,
): boolean {
  const native = NATIVE_KEYS.get(block.type);
  if (!native) return false;
  if (residual > 0) return true;
  return Object.keys(specFor(schema, block.type).toData(block, ctx)).some((key) => !native.includes(key));
}
