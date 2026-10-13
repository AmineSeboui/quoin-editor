import type { BlockCodec } from '../blocks/codec';
import type { QuoinBlock } from '../model/quoin-block';
import { sameDoc } from '../model/same-doc';
import type { EngineDoc } from '../model/types';
import type { EditorState } from '../state/editor-state';
import { Transaction } from '../state/transaction';
import { replaceDocStep } from '../transform/replace-doc-step';
import { createEchoTracker } from './echo-tracker';
import { sameBlocks } from './same-blocks';

export type ControlledBlocks = {
  getBlocks(): QuoinBlock[];
  setBlocks(incoming: readonly QuoinBlock[]): boolean;
  committed(tr: Transaction): void;
};

/**
 * The host's side of the document: what it last supplied, what was emitted to it, and how an incoming array is told
 * apart as an echo, a load of the current content or a foreign document to reconcile.
 */
export function createControlledBlocks(config: {
  codec: BlockCodec;
  initial: readonly QuoinBlock[];
  state: () => EditorState;
  dispatch: (tr: Transaction) => void;
  onChange?: (blocks: QuoinBlock[]) => void;
}): ControlledBlocks {
  const { codec, state, dispatch, onChange } = config;
  const tracker = createEchoTracker();
  const quiet = new WeakSet<Transaction>();
  let supplied = config.initial;
  let converted: { doc: EngineDoc; blocks: QuoinBlock[] } | null = null;

  function getBlocks(): QuoinBlock[] {
    const { doc } = state();
    if (converted?.doc !== doc) converted = { doc, blocks: codec.blocksFromDoc(doc) };
    return converted.blocks;
  }

  function reconcile(incoming: readonly QuoinBlock[]): boolean {
    const doc = codec.docFromBlocks(incoming);
    if (sameDoc(doc, state().doc)) return false;
    tracker.forgetAll();
    const tr = new Transaction(state()).setOrigin('reconcile').setMeta('addToHistory', false);
    if (sameBlocks(codec.blocksFromDoc(doc), incoming)) quiet.add(tr);
    dispatch(tr.step(replaceDocStep(doc)));
    return true;
  }

  return {
    getBlocks,
    setBlocks(incoming) {
      const previous = supplied;
      supplied = incoming;
      if (incoming === previous || tracker.classify(incoming) === 'echo') return false;
      if (sameBlocks(incoming, previous) || sameBlocks(incoming, getBlocks())) return false;
      return reconcile(incoming);
    },
    committed(tr) {
      if (!tr.docChanged || quiet.has(tr)) return;
      const blocks = getBlocks();
      tracker.emitted(blocks);
      onChange?.(blocks);
    },
  };
}
