import { textSelection, Transaction, type Command } from '../../engine';
import { undoInputRule } from '../../engine/state/history';
import { atomBeforeCaret } from './atom-place';

/**
 * Backspace right after an atom of one of `types` selects the atom, so a second Backspace deletes it. Bound above the
 * core keys, it first lets Backspace undo an input rule that just ran, as the core Backspace would.
 */
export function selectAtomBackward(types: readonly string[]): Command {
  return (state, dispatch) => {
    if (undoInputRule(state, dispatch)) return true;
    const place = atomBeforeCaret(state, types);
    if (place === null) return false;
    const { block, region, offset } = place;
    const atom = textSelection({ block, region, offset }, { block, region, offset: offset + 1 });
    dispatch?.(new Transaction(state).setSelection(atom));
    return true;
  };
}
