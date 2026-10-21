import * as Y from 'yjs';
import type { BlockAttrs, EngineBlock } from '../engine/model/types';
import { inlineOf, toYText } from './inline-codec';

/** A block of the shared document: `{ id, type, indent, attrs: Y.Map, regions: Y.Map<Y.Text> }`. */
export type YBlock = Y.Map<unknown>;
export type YBlocks = Y.Array<YBlock>;

export const idOf = (block: YBlock) => block.get('id') as string;
export const attrsOf = (block: YBlock) => block.get('attrs') as Y.Map<unknown>;
export const regionsOf = (block: YBlock) => block.get('regions') as Y.Map<Y.Text>;

export const definedEntries = (attrs: BlockAttrs) => Object.entries(attrs).filter(([, value]) => value !== undefined);

export function toYBlock(block: EngineBlock): YBlock {
  const regions = Object.entries(block.regions).map(([name, inline]): [string, Y.Text] => [name, toYText(inline)]);
  return new Y.Map<unknown>([
    ['id', block.id],
    ['type', block.type],
    ['indent', block.indent],
    ['attrs', new Y.Map<unknown>(definedEntries(block.attrs))],
    ['regions', new Y.Map<Y.Text>(regions)],
  ]);
}

export function fromYBlock(block: YBlock): EngineBlock {
  const regions = [...regionsOf(block).entries()].map(([name, region]) => [name, inlineOf(region)]);
  return {
    id: idOf(block),
    type: block.get('type') as string,
    indent: block.get('indent') as number,
    attrs: attrsOf(block).toJSON(),
    regions: Object.fromEntries(regions),
  };
}
