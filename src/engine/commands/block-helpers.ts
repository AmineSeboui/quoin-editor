import { specFor } from '../blocks/unknown-spec';
import { inlineLength } from '../model/inline';
import { newId } from '../model/new-id';
import type { BlockAttrs, EngineBlock, EngineDoc, Inline, Pos } from '../model/types';
import type { BlockSpec, Schema } from '../schema/types';
import { primaryRegion } from '../state/selection';

const ITEM_KINDS = new Set(['bullet', 'ordered', 'task', 'quote']);

export function specOf(schema: Schema, block: EngineBlock): BlockSpec {
  return specFor(schema, block.type);
}

export function isTextFlow(schema: Schema, block: EngineBlock): boolean {
  return specOf(schema, block).flow === 'text';
}

export function isParagraph(block: EngineBlock): boolean {
  return block.type === 'MARKDOWN' && block.attrs.kind === 'paragraph';
}

export function isItem(block: EngineBlock): boolean {
  return block.type === 'MARKDOWN' && typeof block.attrs.kind === 'string' && ITEM_KINDS.has(block.attrs.kind);
}

export function regionLength(block: EngineBlock, region: string): number {
  return Object.hasOwn(block.regions, region) ? inlineLength(block.regions[region]) : 0;
}

export function descendantsEnd(doc: EngineDoc, index: number): number {
  const { indent } = doc.blocks[index];
  let end = index + 1;
  while (end < doc.blocks.length && doc.blocks[end].indent > indent) end++;
  return end;
}

export function createBlock(
  schema: Schema,
  type: string,
  attrs: BlockAttrs = {},
  indent = 0,
  id: string = newId(),
): EngineBlock {
  const initial = specFor(schema, type).initial();
  return { id, type, indent, attrs: { ...initial.attrs, ...attrs }, regions: initial.regions };
}

export function withContent(schema: Schema, block: EngineBlock, content: Inline): EngineBlock {
  const region = primaryRegion(schema, block) ?? '';
  return { ...block, regions: { ...block.regions, [region]: content } };
}

export function startPos(schema: Schema, block: EngineBlock): Pos {
  return { block: block.id, region: primaryRegion(schema, block) ?? '', offset: 0 };
}
