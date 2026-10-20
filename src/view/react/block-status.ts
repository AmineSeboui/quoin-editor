import type { EditorState } from '../../engine';
import { isTextFlow } from '../../engine/commands/block-helpers';
import { NO_CHOICES, type ReaderChoices } from '../controller/reader-toggles';
import { isHiddenAt } from '../navigation/visible-blocks';
import { isCrossSelection } from '../selection/selection-decorations';

export type BlockStatus = 'plain' | 'selected' | 'hidden';

function within(state: EditorState, index: number, ends: readonly [string, string]): boolean {
  const [anchor, head] = ends.map((id) => state.doc.index.get(id));
  if (anchor === undefined || head === undefined) return false;
  return index >= Math.min(anchor, head) && index <= Math.max(anchor, head);
}

// The highlight only reaches text, so a block without a text flow inside a selection across blocks is marked as a
// whole, the way a block range marks it.
function covers(state: EditorState, id: string, index: number): boolean {
  const { doc, schema, selection } = state;
  if (selection === null) return false;
  if (selection.kind === 'node') return selection.block === id;
  if (selection.kind === 'blocks') return within(state, index, [selection.anchor, selection.head]);
  if (!isCrossSelection(selection) || isTextFlow(schema, doc.blocks[index])) return false;
  return within(state, index, [selection.anchor.block, selection.head.block]);
}

export function blockStatus(state: EditorState, id: string, choices: ReaderChoices = NO_CHOICES): BlockStatus {
  const index = state.doc.index.get(id);
  if (index === undefined) return 'plain';
  if (isHiddenAt(state.doc, index, choices)) return 'hidden';
  return covers(state, id, index) ? 'selected' : 'plain';
}
