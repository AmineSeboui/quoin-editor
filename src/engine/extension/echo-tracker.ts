import type { QuoinBlock } from '../model/quoin-block';
import { copiedSequence, type Emission } from './structural-echo';

export const STRUCTURAL_ECHO_WINDOW = 256;

export type EchoTracker = {
  emitted(blocks: readonly QuoinBlock[]): void;
  classify(blocks: readonly QuoinBlock[]): 'echo' | 'foreign';
  forgetAll(): void;
};

/**
 * Emissions are numbered in order, and handing one back, as the same array or a deep copy, acknowledges it and
 * every older one. The oldest matching copy wins, so a document that returns to an earlier content cannot skip the
 * emissions in between. Arrays are recognised weakly with no limit; copies are compared with the newest outstanding
 * emissions only, which bounds what a host that never echoes keeps alive.
 */
export function createEchoTracker(): EchoTracker {
  const sequences = new WeakMap<readonly QuoinBlock[], number>();
  let emitted = 0;
  let acknowledged = 0;
  let outstanding: Emission[] = [];
  return {
    emitted(blocks) {
      sequences.set(blocks, ++emitted);
      outstanding.push({ blocks, sequence: emitted });
      if (outstanding.length > STRUCTURAL_ECHO_WINDOW) outstanding.shift();
    },
    classify(blocks) {
      const sequence = sequences.get(blocks) ?? copiedSequence(outstanding, blocks);
      if (sequence === undefined || sequence <= acknowledged) return 'foreign';
      acknowledged = sequence;
      outstanding = outstanding.filter((emission) => emission.sequence > sequence);
      return 'echo';
    },
    forgetAll() {
      acknowledged = emitted;
      outstanding = [];
    },
  };
}
