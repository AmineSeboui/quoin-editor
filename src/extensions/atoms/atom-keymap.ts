import type { Command } from '../../engine';
import { extendOverAtom } from './extend-over-atom';
import { selectAtomBackward } from './select-atom-backward';

/**
 * The keys that take an atom of one of `types` whole: Backspace right after it selects it, and Shift with an arrow
 * steps a selection over it. Bound above the core keys.
 */
export function atomKeymap(types: readonly string[]): Readonly<Record<string, Command>> {
  return {
    Backspace: selectAtomBackward(types),
    'Shift-ArrowLeft': extendOverAtom(types, -1),
    'Shift-ArrowRight': extendOverAtom(types, 1),
  };
}
