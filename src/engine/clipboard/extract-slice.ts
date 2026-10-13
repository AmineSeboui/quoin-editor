import type { BlockCodec } from '../blocks/codec';
import { createBlock, isTextFlow, regionLength, selectedBlockRange, withContent } from '../commands/block-helpers';
import { requireBlockIndex } from '../model/doc';
import { sliceInline } from '../model/inline';
import { orderedRange } from '../model/position';
import type { EngineBlock, TextSelection } from '../model/types';
import type { Schema } from '../schema/types';
import type { EditorState } from '../state/editor-state';
import { isCollapsed, primaryRegion } from '../state/selection';
import type { Slice } from './slice';

function isFlowRegion(schema: Schema, block: EngineBlock, region: string): boolean {
  return isTextFlow(schema, block) && region === primaryRegion(schema, block);
}

function trimmed(block: EngineBlock, region: string, from: number, to: number): EngineBlock {
  return { ...block, regions: { ...block.regions, [region]: sliceInline(block.regions[region], from, to) } };
}

function insideOneRegion(schema: Schema, block: EngineBlock, region: string, from: number, to: number): EngineBlock {
  if (isFlowRegion(schema, block, region)) return trimmed(block, region, from, to);
  const paragraph = createBlock(schema, schema.defaultTextBlock, {}, block.indent, block.id);
  return withContent(schema, paragraph, sliceInline(block.regions[region], from, to));
}

function textBlocks({ doc, schema }: EditorState, selection: TextSelection): EngineBlock[] {
  const { from, to } = orderedRange(doc, selection.anchor, selection.head);
  const start = requireBlockIndex(doc, from.block);
  const end = requireBlockIndex(doc, to.block);
  const first = doc.blocks[start];
  if (start === end) {
    if (from.region !== to.region) return [first];
    return [insideOneRegion(schema, first, from.region, from.offset, to.offset)];
  }
  const last = doc.blocks[end];
  return [
    isFlowRegion(schema, first, from.region)
      ? trimmed(first, from.region, from.offset, regionLength(first, from.region))
      : first,
    ...doc.blocks.slice(start + 1, end),
    isFlowRegion(schema, last, to.region) ? trimmed(last, to.region, 0, to.offset) : last,
  ];
}

function selectedBlocks(state: EditorState): EngineBlock[] {
  const { doc, selection } = state;
  if (selection?.kind === 'text') return textBlocks(state, selection);
  const range = selectedBlockRange(doc, selection);
  return range === null ? [] : doc.blocks.slice(range.start, range.end);
}

export function sliceFromSelection(state: EditorState, codec: BlockCodec): Slice | null {
  const { selection } = state;
  if (selection === null || isCollapsed(selection)) return null;
  const blocks = selectedBlocks(state);
  if (blocks.length === 0) return null;
  const base = blocks.reduce((least, block) => Math.min(least, block.indent), Infinity);
  const open = selection.kind === 'text';
  return {
    blocks: blocks.map((block) => codec.toQuoin(base > 0 ? { ...block, indent: block.indent - base } : block)),
    openStart: open,
    openEnd: open,
  };
}
