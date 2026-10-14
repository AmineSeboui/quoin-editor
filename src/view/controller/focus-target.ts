import type { EditorState, Pos, Selection } from '../../engine';
import { endOf, startOf, textSelection } from '../../engine/state/selection';

export type FocusTarget = Pos | 'start' | 'end';

export function focusTarget(state: EditorState, target: FocusTarget | undefined): Selection | null {
  const { doc, schema, selection } = state;
  if (doc.blocks.length === 0) return null;
  if (target === 'end') return endOf(doc, schema, doc.blocks[doc.blocks.length - 1].id);
  if (target === 'start' || (target === undefined && selection === null)) return startOf(doc, schema, doc.blocks[0].id);
  return target === undefined ? selection : textSelection(target);
}
