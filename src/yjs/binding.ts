import type * as Y from 'yjs';
import { applyRemote } from '../engine/collab/apply-remote';
import type { CommandFactories } from '../engine/commands/chain';
import type { Editor } from '../engine/extension/editor';
import type { Transaction } from '../engine/state/transaction';
import type { YBlocks } from './doc-shape';
import { writeLocalSteps } from './local-to-yjs';
import { seedOrLoad, type Seed } from './seed';
import { removeCopies } from './unique-blocks';
import { undoHistory, type UndoHistory } from './undo-history';
import { stepsFromYjs } from './yjs-to-steps';

export type Origins = {
  /** Changes of this client that undo can take back. */
  readonly local: object;
  /** Changes of this client kept out of undo, such as removing a copy of a block. */
  readonly untracked: object;
};

export type Binding = {
  readonly editor: Editor<CommandFactories>;
  readonly history: UndoHistory;
  local(tr: Transaction): void;
  travel(direction: 'undo' | 'redo'): boolean;
  stop(): void;
};

/** Ties one editor to the shared array until `stop`: local changes are written to it and its changes are applied. */
export function bind(editor: Editor<CommandFactories>, blocks: YBlocks, origins: Origins, seed: Seed): Binding {
  const doc = blocks.doc!;
  seedOrLoad(editor, blocks, origins.local, seed);
  const history = undoHistory(blocks, origins.local);
  const observer = (events: Y.YEvent<Y.AbstractType<unknown>>[], transaction: Y.Transaction) => {
    if (transaction.origin === origins.local || transaction.origin === origins.untracked) return;
    const { steps, copies } = stepsFromYjs(events, blocks, editor.state.doc);
    if (copies.length > 0) doc.transact(() => removeCopies(blocks, copies), origins.untracked);
    if (steps.length > 0) applyRemote(editor, steps, transaction.origin === history.manager ? history.hint() : null);
  };
  blocks.observeDeep(observer);
  return {
    editor,
    history,
    local(tr) {
      history.record(tr);
      if (!tr.docChanged) return;
      const docs = [...tr.docs, tr.doc];
      doc.transact(() => writeLocalSteps(blocks, tr.steps, docs), tr.addToHistory ? origins.local : origins.untracked);
    },
    travel: (direction) => history.travel(direction, editor),
    stop() {
      blocks.unobserveDeep(observer);
      history.destroy();
    },
  };
}
