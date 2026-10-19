import { removeMarkStep, Transaction, type Command } from '../../engine';
import type { MarkRange } from '../../engine/commands/selection-marks';

/** Takes the link off a range of text, leaving the selection where it is. */
export function unlinkRange({ block, region, from, to }: MarkRange): Command {
  return (state, dispatch) => {
    const tr = new Transaction(state).step(removeMarkStep(block, region, from, to, 'link'));
    if (!tr.docChanged) return false;
    dispatch?.(tr);
    return true;
  };
}
