import { requireBlockIndex } from '../model/doc';
import { inlineLength } from '../model/inline';
import type { Selection } from '../model/types';
import { blockRangeSelection, textSelection } from '../state/selection';
import { Transaction } from '../state/transaction';
import { headBlockId } from './block-helpers';
import type { Command } from './command';

export const selectAll: Command = (state, dispatch) => {
  const { doc, selection } = state;
  if (doc.blocks.length === 0) return false;
  let next: Selection = blockRangeSelection(doc.blocks[0].id, doc.blocks[doc.blocks.length - 1].id);
  if (selection?.kind === 'text') {
    const { anchor, head } = selection;
    const length = inlineLength(doc.blocks[requireBlockIndex(doc, head.block)].regions[head.region] ?? []);
    const withinRegion = anchor.block === head.block && anchor.region === head.region;
    const covers = Math.min(anchor.offset, head.offset) === 0 && Math.max(anchor.offset, head.offset) === length;
    if (withinRegion && !covers) next = textSelection({ ...head, offset: 0 }, { ...head, offset: length });
  }
  dispatch?.(new Transaction(state).setSelection(next));
  return true;
};

export const selectBlock: Command = (state, dispatch) => {
  const id = headBlockId(state.selection);
  if (id === null) return false;
  dispatch?.(new Transaction(state).setSelection(blockRangeSelection(id)));
  return true;
};

export function setSelection(selection: Selection | null): Command {
  return (state, dispatch) => {
    dispatch?.(new Transaction(state).setSelection(selection));
    return true;
  };
}
