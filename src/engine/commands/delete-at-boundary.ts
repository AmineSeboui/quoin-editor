import { requireBlockIndex } from '../model/doc';
import type { EngineBlock, Pos } from '../model/types';
import type { Schema } from '../schema/types';
import type { EditorState } from '../state/editor-state';
import { isCollapsed, nodeSelection, primaryRegion, startOf, textSelection } from '../state/selection';
import { Transaction } from '../state/transaction';
import { removeBlocksStep } from '../transform/block-steps';
import { joinBlocksStep } from '../transform/split-join-steps';
import { isParagraph, isTextFlow, regionLength } from './block-helpers';
import { capIndents } from './cap-indents';
import type { Command } from './command';
import { paragraphStep } from './paragraph-step';
import { shiftSubtree } from './shift-subtree';

type Caret = { block: EngineBlock; index: number; pos: Pos };

function textCaret(state: EditorState): Caret | null {
  const { doc, schema, selection } = state;
  if (selection?.kind !== 'text' || !isCollapsed(selection)) return null;
  const pos = selection.head;
  const index = requireBlockIndex(doc, pos.block);
  const block = doc.blocks[index];
  const inFlow = isTextFlow(schema, block) && pos.region === primaryRegion(schema, block);
  return inFlow ? { block, index, pos } : null;
}

function joinInto(tr: Transaction, schema: Schema, target: EngineBlock, source: EngineBlock): void {
  const targetRegion = primaryRegion(schema, target) ?? '';
  tr.step(joinBlocksStep(target.id, targetRegion, source.id, primaryRegion(schema, source) ?? ''));
  capIndents(tr, requireBlockIndex(tr.doc, target.id) + 1);
  const offset = regionLength(target, targetRegion);
  tr.setSelection(textSelection({ block: target.id, region: targetRegion, offset }));
}

export const deleteAtStart: Command = (state, dispatch) => {
  const caret = textCaret(state);
  if (caret === null || caret.pos.offset !== 0) return false;
  const { doc, schema } = state;
  const { block, index, pos } = caret;
  const previous = doc.blocks[index - 1];
  const tr = new Transaction(state);
  if (!isParagraph(block)) {
    tr.step(paragraphStep(schema, block, pos.region));
    tr.setSelection(startOf(tr.doc, schema, block.id));
  } else if (block.indent > 0) {
    shiftSubtree(tr, index, -1);
  } else if (previous === undefined) {
    return false;
  } else if (isTextFlow(schema, previous)) {
    joinInto(tr, schema, previous, block);
  } else {
    if (regionLength(block, pos.region) === 0) tr.step(removeBlocksStep(index, 1));
    tr.setSelection(nodeSelection(previous.id));
  }
  dispatch?.(tr);
  return true;
};

export const deleteAtEnd: Command = (state, dispatch) => {
  const caret = textCaret(state);
  if (caret === null || caret.pos.offset !== regionLength(caret.block, caret.pos.region)) return false;
  const { doc, schema } = state;
  const { block, index, pos } = caret;
  const next = doc.blocks[index + 1];
  if (next === undefined) return false;
  const tr = new Transaction(state);
  if (isTextFlow(schema, next)) {
    joinInto(tr, schema, block, next);
  } else {
    if (isParagraph(block) && pos.offset === 0) {
      tr.step(removeBlocksStep(index, 1));
      capIndents(tr, index);
    }
    tr.setSelection(nodeSelection(next.id));
  }
  dispatch?.(tr);
  return true;
};
