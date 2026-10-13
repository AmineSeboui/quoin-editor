import { requireBlockIndex } from '../model/doc';
import type { Pos } from '../model/types';
import type { Schema } from '../schema/types';
import type { Transaction } from '../state/transaction';
import { insertBlocksStep, removeBlocksStep } from '../transform/block-steps';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { joinBlocksStep } from '../transform/split-join-steps';
import { createBlock, isTextFlow, regionLength, startPos } from './block-helpers';

function clear(tr: Transaction, pos: Pos, start: number, end: number): void {
  if (start < end) tr.step(replaceInlineStep(pos.block, pos.region, start, end, []));
}

export function deleteRange(tr: Transaction, schema: Schema, from: Pos, to: Pos, newId?: () => string): Pos {
  if (from.block === to.block) {
    clear(tr, from, from.offset, to.offset);
    return from;
  }
  const { doc } = tr;
  const start = requireBlockIndex(doc, from.block);
  const end = requireBlockIndex(doc, to.block);
  const first = doc.blocks[start];
  const last = doc.blocks[end];
  const keepFirst = isTextFlow(schema, first);
  const keepLast = isTextFlow(schema, last);
  if (keepFirst) clear(tr, from, from.offset, regionLength(first, from.region));
  if (keepLast) clear(tr, to, 0, to.offset);
  const removeFrom = keepFirst ? start + 1 : start;
  const removeTo = keepLast ? end : end + 1;
  if (removeTo > removeFrom) tr.step(removeBlocksStep(removeFrom, removeTo - removeFrom));
  if (keepFirst) {
    if (keepLast) tr.step(joinBlocksStep(first.id, from.region, last.id, to.region));
    return from;
  }
  if (keepLast) return { block: last.id, region: to.region, offset: 0 };
  // Both ends were removed whole, so an empty default block takes their place to give the caret somewhere to land.
  const filler = createBlock(schema, schema.defaultTextBlock, {}, first.indent, newId?.());
  tr.step(insertBlocksStep(removeFrom, [filler]));
  return startPos(schema, filler);
}
