import type { Transaction } from '../state/transaction';
import { setIndentStep } from '../transform/attrs-steps';
import { descendantsEnd } from './block-helpers';

export function shiftSubtree(tr: Transaction, index: number, delta: number): void {
  const { doc } = tr;
  for (const block of doc.blocks.slice(index, descendantsEnd(doc, index))) {
    tr.step(setIndentStep(block.id, block.indent + delta));
  }
}
