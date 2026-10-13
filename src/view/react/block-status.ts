import type { EditorState } from '../../engine';
import { hidingToggle } from '../../engine/commands/collapsed-toggle';

export type BlockStatus = 'plain' | 'selected' | 'hidden';

function covers(state: EditorState, id: string, index: number): boolean {
  const { doc, selection } = state;
  if (selection === null || selection.kind === 'text') return false;
  if (selection.kind === 'node') return selection.block === id;
  const anchor = doc.index.get(selection.anchor);
  const head = doc.index.get(selection.head);
  if (anchor === undefined || head === undefined) return false;
  return index >= Math.min(anchor, head) && index <= Math.max(anchor, head);
}

export function blockStatus(state: EditorState, id: string): BlockStatus {
  const index = state.doc.index.get(id);
  if (index === undefined) return 'plain';
  if (hidingToggle(state.doc, index + 1) !== null) return 'hidden';
  return covers(state, id, index) ? 'selected' : 'plain';
}
