import {
  fromMarkdown,
  insertBlocksStep,
  type CommandFactories,
  type Editor,
  type EngineBlock,
  type Pos,
  type Schema,
  type Transaction,
} from '../../engine';
import { pasteAtCaret } from '../../engine/clipboard/paste-at-caret';
import { freshBlocks } from '../../engine/clipboard/slice-blocks';
import { capIndents } from '../../engine/commands/cap-indents';
import { descendantsEnd, regionLength } from '../../engine/commands/block-helpers';
import { endOf } from '../../engine/state/selection';
import { deleteRange } from '../../engine/commands/delete-range';
import type { InternalEditor } from '../../engine/extension/editor';
import { parseLine } from '../../engine/markdown/line-kind';
import type { QuoinBlock } from '../../engine/model/quoin-block';
import { AI, aiState, type AiAct } from './ai-plugin';
import { targetGone, type AiTarget } from './ai-target';

const isParagraph = (block: QuoinBlock | undefined) =>
  block?.type === 'MARKDOWN' && parseLine(String(block.data.markdown ?? '')).kind === 'paragraph';

const DISCARD: AiAct = { type: 'discard' };

// The answer to a target whose block was deleted goes as blocks of their own beside the block left at its edge.
function insertBeside(tr: Transaction, schema: Schema, target: AiTarget, pieces: EngineBlock[], makeId: () => string) {
  const index = tr.doc.index.get(target.to.block)!;
  const at = target.lost?.after ? descendantsEnd(tr.doc, index) : index;
  const fresh = freshBlocks(pieces, tr.doc.blocks[index].indent, makeId);
  tr.step(insertBlocksStep(at, fresh));
  capIndents(tr, at, at + fresh.length);
  tr.setSelection(endOf(tr.doc, schema, fresh[fresh.length - 1].id));
}

/**
 * Applies the answer shown, read with the engine's markdown parser as a paste is, in one transaction from `ai`: in
 * place of its target, or below it for an action that writes more. A target whose text was deleted meanwhile gets the
 * answer where that text was, and `gone` says so. Null while the answer streams or when there is none.
 */
export function acceptAnswer(editor: Editor<CommandFactories>): { gone: boolean } | null {
  const { state } = editor;
  const { target, ghost } = aiState(state);
  if (target === null || ghost === null || ghost.phase === 'streaming' || ghost.phase === 'error') return null;
  const { codec } = editor as InternalEditor<CommandFactories>;
  const makeId = codec.context.newId;
  const blocks = fromMarkdown(ghost.output, { newId: makeId });
  const pieces: EngineBlock[] = blocks.flatMap((block) => codec.toEngineBlocks(block));
  const tr = editor.createTransaction().setOrigin('ai').setMeta(AI, DISCARD);
  const gone = targetGone(state.doc, target);
  if (pieces.length > 0 && target.lost !== undefined) {
    insertBeside(tr, state.schema, target, pieces, makeId);
  } else if (pieces.length > 0) {
    const { schema } = state;
    const open = { openStart: isParagraph(blocks[0]), openEnd: isParagraph(blocks[blocks.length - 1]) };
    if (ghost.replace || gone) {
      const caret = ghost.replace && !gone ? deleteRange(tr, schema, target.from, target.to, makeId) : target.to;
      pasteAtCaret(tr, schema, caret, open, pieces, makeId);
    } else {
      const block = tr.doc.blocks[tr.doc.index.get(target.to.block)!];
      const end: Pos = { ...target.to, offset: regionLength(block, target.to.region) };
      pasteAtCaret(tr, schema, end, { openStart: false, openEnd: false }, pieces, makeId);
    }
  }
  editor.dispatch(tr);
  return { gone };
}
