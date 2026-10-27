import type * as Y from 'yjs';
import { applyRemote, sharedChange } from '../engine/collab/apply-remote';
import type { CommandFactories } from '../engine/commands/chain';
import type { Editor } from '../engine/extension/editor';
import type { Transaction } from '../engine/state/transaction';
import { holdSelection, restoreSelection, type HeldSelection } from './carets';
import { writeLocalSteps } from './local-to-yjs';
import { requiredRegions } from './required-regions';
import { seedOrLoad, type Seed } from './seed';
import type { Shared } from './shared';
import type { UndoHistory } from './undo-history';
import { readRemote } from './yjs-to-steps';

export type Origins = {
  /** Changes of this client that undo can take back. */
  readonly local: object;
  /** Changes of this client kept out of undo. */
  readonly untracked: object;
};

export type Binding = {
  readonly editor: Editor<CommandFactories>;
  readonly shared: Shared;
  local(tr: Transaction): void;
  travel(direction: 'undo' | 'redo'): boolean;
  stop(): void;
};

/** Ties one editor to the shared text until `stop`: local changes are written to it and its changes are applied. */
export function bind(
  editor: Editor<CommandFactories>,
  text: Y.Text,
  options: { origins: Origins; seed: Seed; onError: (error: Error) => void; history: () => UndoHistory },
): Binding {
  const { origins, seed, onError } = options;
  const doc = text.doc!;
  const required = requiredRegions(editor.state.schema);
  const layout = seedOrLoad(editor, text, { origin: origins.local, seed, required });
  // Taken once the text is seeded, so that undo never takes the seeding back.
  const history = options.history();
  const shared: Shared = { text, layout, stale: false, required };
  const ours = (origin: unknown) => origin === origins.local || origin === origins.untracked;
  const held = new WeakMap<Y.Transaction, HeldSelection>();
  const written = new WeakSet<Transaction>();
  const hold = (transaction: Y.Transaction) => {
    if (!ours(transaction.origin)) held.set(transaction, holdSelection(text, shared.layout, editor.state.selection));
  };
  const observer = (events: Y.YEvent<Y.AbstractType<unknown>>[], transaction: Y.Transaction) => {
    if (ours(transaction.origin)) return;
    const { steps, structural, failed } = readRemote(shared, events, editor.state.doc);
    if (steps.length > 0 && transaction.origin !== history.manager) {
      applyRemote(editor, steps, structural ? restoreSelection(text, shared.layout, held.get(transaction)) : null);
    } else if (steps.length > 0) {
      const tr = sharedChange(editor, steps, history.hint(), 'history');
      written.add(tr);
      editor.dispatch(tr);
    }
    // Reported once the editor has taken the shared document, so that a handler that throws leaves no drift behind.
    if (failed) onError(failed);
  };
  // A change written over a text that is out of shape can read back as another document: the editor takes that one.
  const settle = () => {
    shared.stale = false;
    shared.layout = seedOrLoad(editor, text, { origin: origins.local, seed: false, required });
  };
  doc.on('beforeTransaction', hold);
  text.observeDeep(observer);
  return {
    editor,
    shared,
    local(tr) {
      if (written.has(tr)) return;
      history.record(tr);
      if (!tr.docChanged) return;
      const docs = [...tr.docs, tr.doc];
      const origin = tr.addToHistory ? origins.local : origins.untracked;
      doc.transact(() => writeLocalSteps(shared, tr.steps, docs), origin);
      if (shared.stale) settle();
    },
    travel: (direction) => history.travel(direction, editor),
    stop() {
      doc.off('beforeTransaction', hold);
      text.unobserveDeep(observer);
    },
  };
}
