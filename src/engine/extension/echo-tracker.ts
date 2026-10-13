import type { QuoinBlock } from '../model/quoin-block';

export type EchoTracker = {
  emitted(blocks: readonly QuoinBlock[]): void;
  classify(blocks: readonly QuoinBlock[]): 'echo' | 'foreign';
};

export function createEchoTracker(): EchoTracker {
  const sequences = new WeakMap<readonly QuoinBlock[], number>();
  let emitted = 0;
  let acknowledged = 0;
  return {
    emitted(blocks) {
      sequences.set(blocks, ++emitted);
    },
    classify(blocks) {
      const sequence = sequences.get(blocks);
      if (sequence === undefined || sequence <= acknowledged) return 'foreign';
      acknowledged = sequence;
      return 'echo';
    },
  };
}
