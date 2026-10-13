import { isParagraph, regionLength } from '../commands/block-helpers';
import type { Command } from '../commands/command';
import { splitBlock } from '../commands/split-block';
import { setBlockType } from '../commands/turn-into';
import { blockById } from '../model/doc';
import { inlineText } from '../model/inline';
import type { EditorState } from '../state/editor-state';
import { isCollapsed } from '../state/selection';
import type { Transaction } from '../state/transaction';
import { convertPrefix } from './convert-prefix';

const FENCE = /^```([\w+#.-]*)$/;

function fenceTransaction(state: EditorState): Transaction | null {
  const { selection, doc } = state;
  if (selection?.kind !== 'text' || !isCollapsed(selection)) return null;
  const { block: id, region, offset } = selection.head;
  const block = blockById(doc, id);
  if (block === undefined || !isParagraph(block) || offset !== regionLength(block, region)) return null;
  const fence = FENCE.exec(inlineText(block.regions[region]));
  if (fence === null) return null;
  return convertPrefix(state, { block: id, region, from: 0, to: offset }, setBlockType('CODE', { language: fence[1] }));
}

export function splitBlockWithRules(options: { newId?: () => string } = {}): Command {
  const split = splitBlock(options);
  return (state, dispatch) => {
    const tr = fenceTransaction(state);
    if (tr === null) return split(state, dispatch);
    dispatch?.(tr);
    return true;
  };
}
