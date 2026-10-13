import { descendantsEnd, isTextFlow, regionLength } from '../commands/block-helpers';
import { capIndents } from '../commands/cap-indents';
import { splitStep } from '../commands/split-step';
import { requireBlockIndex } from '../model/doc';
import { inlineLength } from '../model/inline';
import type { EngineBlock, Inline, Pos } from '../model/types';
import type { Schema } from '../schema/types';
import { endOf, primaryRegion, textSelection } from '../state/selection';
import type { Transaction } from '../state/transaction';
import { insertBlocksStep, removeBlocksStep } from '../transform/block-steps';
import { replaceInlineStep } from '../transform/replace-inline-step';
import type { Slice } from './slice';
import { freshBlocks } from './slice-blocks';

type Ends = Pick<Slice, 'openStart' | 'openEnd' | 'plainText'>;

function contentOf(schema: Schema, block: EngineBlock): Inline {
  return block.regions[primaryRegion(schema, block) ?? ''] ?? [];
}

function insertAt(tr: Transaction, pos: Pos, content: Inline): void {
  if (content.length > 0) tr.step(replaceInlineStep(pos.block, pos.region, pos.offset, pos.offset, content));
}

function insertCapped(tr: Transaction, at: number, blocks: readonly EngineBlock[]): void {
  tr.step(insertBlocksStep(at, blocks));
  capIndents(tr, at, at + blocks.length);
}

function insertClosed(tr: Transaction, schema: Schema, at: number, blocks: readonly EngineBlock[]): void {
  insertCapped(tr, at, blocks);
  tr.setSelection(endOf(tr.doc, schema, blocks[blocks.length - 1].id));
}

function replaceEmpty(tr: Transaction, schema: Schema, index: number, blocks: readonly EngineBlock[]): void {
  tr.step(insertBlocksStep(index, blocks));
  tr.step(removeBlocksStep(index + blocks.length, 1));
  capIndents(tr, index, index + blocks.length);
  tr.setSelection(endOf(tr.doc, schema, blocks[blocks.length - 1].id));
}

export function pasteAtCaret(
  tr: Transaction,
  schema: Schema,
  caret: Pos,
  ends: Ends,
  pieces: readonly EngineBlock[],
  makeId: () => string,
): void {
  const index = requireBlockIndex(tr.doc, caret.block);
  const current = tr.doc.blocks[index];
  const { region } = caret;
  const first = pieces[0];
  const last = pieces[pieces.length - 1];
  const textual = (block: EngineBlock) => isTextFlow(schema, block);

  if (pieces.length === 1 && ends.openStart && ends.openEnd && textual(first)) {
    const content = contentOf(schema, first);
    insertAt(tr, caret, content);
    tr.setSelection(textSelection({ ...caret, offset: caret.offset + inlineLength(content) }));
    return;
  }

  const fresh = freshBlocks(pieces, current.indent, makeId);
  if (!textual(current) || region !== primaryRegion(schema, current)) {
    insertClosed(tr, schema, descendantsEnd(tr.doc, index), fresh);
    return;
  }

  const keepsTargetType = ends.plainText === true && ends.openStart && textual(first);
  if (regionLength(current, region) === 0 && !keepsTargetType) {
    replaceEmpty(tr, schema, index, fresh);
    return;
  }

  const atEnd = caret.offset === regionLength(current, region);
  const atStart = caret.offset === 0;
  const mergeFirst = ends.openStart && textual(first) && (atEnd || !atStart);
  const mergeLast = ends.openEnd && textual(last) && !atEnd && !(mergeFirst && pieces.length === 1);
  const middle = fresh.slice(mergeFirst ? 1 : 0, mergeLast ? fresh.length - 1 : fresh.length);
  const lastContent = mergeLast ? contentOf(schema, fresh[fresh.length - 1]) : [];

  if (atStart && !atEnd) {
    if (middle.length > 0) insertCapped(tr, index, middle);
    insertAt(tr, { ...caret, offset: 0 }, lastContent);
    tr.setSelection(textSelection({ ...caret, offset: inlineLength(lastContent) }));
    return;
  }

  const firstContent = mergeFirst ? contentOf(schema, fresh[0]) : [];
  insertAt(tr, caret, firstContent);
  const offset = caret.offset + inlineLength(firstContent);
  const tail = !atEnd && (mergeLast || middle.length > 0) ? splitStep(schema, current, region, offset, makeId()) : null;
  if (tail !== null) tr.step(tail.step);
  if (middle.length > 0) insertCapped(tr, index + 1, middle);
  if (tail !== null && mergeLast) {
    insertAt(tr, { block: tail.tail.id, region: tail.tail.region, offset: 0 }, lastContent);
    tr.setSelection(textSelection({ block: tail.tail.id, region: tail.tail.region, offset: inlineLength(lastContent) }));
  } else if (middle.length > 0) {
    tr.setSelection(endOf(tr.doc, schema, middle[middle.length - 1].id));
  } else {
    tr.setSelection(textSelection({ ...caret, offset }));
  }
}
