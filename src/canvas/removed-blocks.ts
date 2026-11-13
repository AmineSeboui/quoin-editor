import type { Transaction } from '../engine';

export type BlockRemoval = { readonly step: number; readonly index: number; readonly count: number };

/** Each run of whole blocks the transaction removed: its step, and where in the document before that step it lay. */
export function blockRemovals(tr: Transaction): BlockRemoval[] {
  return tr.steps.flatMap((step, at) => {
    if (step.stepType !== 'removeBlocks') return [];
    const { index, count } = step.toJSON();
    return typeof index === 'number' && typeof count === 'number' ? [{ step: at, index, count }] : [];
  });
}
