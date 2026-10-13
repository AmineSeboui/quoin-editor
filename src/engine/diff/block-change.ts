import { specFor } from '../blocks/unknown-spec';
import { compareRegionNames } from '../model/compare';
import type { QuoinBlock } from '../model/quoin-block';
import type { CodecContext, Schema } from '../schema/types';
import { diffInline, type InlineChange } from './diff-inline';
import { sameValue } from './same-value';

export type BlockChange = {
  op: 'change';
  before: QuoinBlock;
  after: QuoinBlock;
  regions: Record<string, InlineChange[]>;
  attrsChanged: boolean;
};

const indentOf = (block: QuoinBlock) => block.indent ?? 0;

export function sameContent(a: QuoinBlock, b: QuoinBlock): boolean {
  return a.type === b.type && indentOf(a) === indentOf(b) && sameValue(a.data, b.data);
}

export function changeBetween(before: QuoinBlock, after: QuoinBlock, schema: Schema, ctx: CodecContext): BlockChange {
  const left = specFor(schema, before.type).fromData(before.data, ctx);
  const right = specFor(schema, after.type).fromData(after.data, ctx);
  const names = [...new Set([...Object.keys(left.regions), ...Object.keys(right.regions)])].sort(compareRegionNames);
  return {
    op: 'change',
    before,
    after,
    regions: Object.fromEntries(
      names.map((name) => [name, diffInline(left.regions[name] ?? [], right.regions[name] ?? [])]),
    ),
    attrsChanged:
      before.type !== after.type || indentOf(before) !== indentOf(after) || !sameValue(left.attrs, right.attrs),
  };
}
