import type { Command } from '../../engine';
import { regionLength } from '../../engine/commands/block-helpers';
import { isCollapsed } from '../../engine/state/selection';
import { aiState, aiTransaction } from './ai-plugin';

/**
 * A Space on an empty paragraph that has held no text since the caret arrived opens the AI menu about that line; any
 * other Space types.
 */
export const openOnSpace: Command = (state, dispatch) => {
  const { selection, doc } = state;
  const ai = aiState(state);
  if (selection?.kind !== 'text' || !isCollapsed(selection) || ai.menu !== null || ai.ghost !== null) return false;
  const { head } = selection;
  const block = doc.blocks[doc.index.get(head.block)!];
  const paragraph = block.type === 'MARKDOWN' && block.attrs.kind === 'paragraph';
  if (!paragraph || regionLength(block, head.region) > 0 || ai.held === block.id) return false;
  dispatch?.(aiTransaction(state, { type: 'open', target: { from: head, to: head, selected: false }, fromSpace: true }));
  return true;
};
