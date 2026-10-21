import type { Decoration, EditorState } from '../../engine';
import { selectedAtom } from './atom-place';

/** The attribute of the decoration around an atom a text selection covers exactly, which the stylesheet highlights. */
export const SELECTED_ATOM = 'data-quoin-selected-atom';

/** Marks the atom of one of `types` that the selection covers exactly, so it is drawn selected. */
export function selectedAtomDecorations(types: readonly string[]): (state: EditorState) => readonly Decoration[] {
  return (state) => {
    const place = selectedAtom(state, types);
    if (place === null) return [];
    const { block, region, offset } = place;
    return [{ kind: 'inline', block, region, from: offset, to: offset + 1, attrs: { [SELECTED_ATOM]: '' } }];
  };
}
