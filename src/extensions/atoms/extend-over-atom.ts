import { textSelection, Transaction, type Command } from '../../engine';
import { atomAt } from './atom-place';

/**
 * Shift and an arrow with the head of a text selection beside an atom of one of `types` moves the head over that atom
 * alone. Firefox's own Shift+ArrowLeft from right after an atom at the end of a line takes the space before it too.
 */
export function extendOverAtom(types: readonly string[], direction: -1 | 1): Command {
  return (state, dispatch) => {
    const { selection } = state;
    if (selection?.kind !== 'text') return false;
    const { anchor, head } = selection;
    if (atomAt(state, { ...head, offset: direction < 0 ? head.offset - 1 : head.offset }, types) === null) return false;
    dispatch?.(new Transaction(state).setSelection(textSelection(anchor, { ...head, offset: head.offset + direction })));
    return true;
  };
}
