import { compareRegionNames } from '../model/compare';
import { requireBlockIndex } from '../model/doc';
import type { Pos } from '../model/types';
import type { Schema } from '../schema/types';
import type { Transaction } from '../state/transaction';
import { insertBlocksStep, removeBlocksStep } from '../transform/block-steps';
import { replaceInlineStep } from '../transform/replace-inline-step';
import { joinBlocksStep } from '../transform/split-join-steps';
import { createBlock, isTextFlow, regionLength, startPos } from './block-helpers';
import { capIndents } from './cap-indents';

function clear(tr: Transaction, pos: Pos, start: number, end: number): void {
  if (start < end) tr.step(replaceInlineStep(pos.block, pos.region, start, end, []));
}

function deleteWithinBlock(tr: Transaction, from: Pos, to: Pos): Pos {
  if (from.region === to.region) {
    clear(tr, from, from.offset, to.offset);
    return from;
  }
  const block = tr.doc.blocks[requireBlockIndex(tr.doc, from.block)];
  clear(tr, from, from.offset, regionLength(block, from.region));
  for (const region of Object.keys(block.regions)) {
    const between = compareRegionNames(from.region, region) < 0 && compareRegionNames(region, to.region) < 0;
    if (between) clear(tr, { ...from, region }, 0, regionLength(block, region));
  }
  clear(tr, to, 0, to.offset);
  return from;
}

export function deleteRange(tr: Transaction, schema: Schema, from: Pos, to: Pos, newId?: () => string): Pos {
  if (from.block === to.block) return deleteWithinBlock(tr, from, to);
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
    capIndents(tr, start + 1);
    return from;
  }
  if (keepLast) {
    capIndents(tr, start);
    return { block: last.id, region: to.region, offset: 0 };
  }
  // Both ends were removed whole, so an empty default block takes their place to give the caret somewhere to land.
  const filler = createBlock(schema, schema.defaultTextBlock, {}, first.indent, newId?.());
  tr.step(insertBlocksStep(removeFrom, [filler]));
  capIndents(tr, start + 1);
  return startPos(schema, filler);
}
