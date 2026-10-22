import { fromMarkdown, type CommandFactories, type Editor, type EngineBlock, type Pos } from '../../engine';
import { pasteAtCaret } from '../../engine/clipboard/paste-at-caret';
import { regionLength } from '../../engine/commands/block-helpers';
import { deleteRange } from '../../engine/commands/delete-range';
import type { InternalEditor } from '../../engine/extension/editor';
import { parseLine } from '../../engine/markdown/line-kind';
import type { QuoinBlock } from '../../engine/model/quoin-block';
import { AI, aiState, type AiAct } from './ai-plugin';
import { targetGone } from './ai-target';

const isParagraph = (block: QuoinBlock | undefined) =>
  block?.type === 'MARKDOWN' && parseLine(String(block.data.markdown ?? '')).kind === 'paragraph';

const DISCARD: AiAct = { type: 'discard' };

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
  const gone = targetGone(state.doc, target) || ghost.lost;
  if (pieces.length > 0) {
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
