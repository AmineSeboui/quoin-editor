import type { EditorState } from '../../engine';
import { blockById } from '../../engine/model/doc';

/** Whether there are blocks with these ids and every one of them is a callout. */
export const allCallouts = (state: EditorState, blockIds: readonly string[]): boolean =>
  blockIds.length > 0 && blockIds.every((id) => blockById(state.doc, id)?.type === 'CALLOUT');
