import type * as Y from 'yjs';
import { applyRemote } from '../engine/collab/apply-remote';
import type { CommandFactories } from '../engine/commands/chain';
import type { Editor } from '../engine/extension/editor';
import { sameDoc } from '../engine/model/same-doc';
import type { Transaction } from '../engine/state/transaction';
import { replaceDocStep } from '../engine/transform/replace-doc-step';
import { holdSelection, restoreSelection, type HeldSelection } from './carets';
import { writeLocalSteps } from './local-to-yjs';
import { readShared } from './read-shared';
import { requiredRegions } from './required-regions';
import { seedOrLoad, type Seed } from './seed';
import type { Shared } from './shared';
import { undoHistory, type UndoHistory } from './undo-history';
import { readRemote } from './yjs-to-steps';

export type Origins = {
  /** Changes of this client that undo can take back. */
  readonly local: object;
  /** Changes of this client kept out of undo. */
  readonly untracked: object;
};

export type Binding = {
  readonly editor: Editor<CommandFactories>;
  readonly history: UndoHistory;
  local(tr: Transaction): void;
  travel(direction: 'undo' | 'redo'): boolean;
  stop(): void;
};

/** Ties one editor to the shared text until `stop`: local changes are written to it and its changes are applied. */
export function bind(
  editor: Editor<CommandFactories>,
  text: Y.Text,
  { origins, seed }: { origins: Origins; seed: Seed },
): Binding {
  const doc = text.doc!;
  const required = requiredRegions(editor.state.schema);
  const layout = seedOrLoad(editor, text, { origin: origins.local, seed, required });
  const shared: Shared = { text, layout, stale: false, required };
  const history = undoHistory(text, origins.local);
  const ours = (origin: unknown) => origin === origins.local || origin === origins.untracked;
  let held: HeldSelection = null;
  const hold = (transaction: Y.Transaction) => {
    if (!ours(transaction.origin)) held = holdSelection(text, shared.layout, editor.state.selection);
  };
  const observer = (events: Y.YEvent<Y.AbstractType<unknown>>[], transaction: Y.Transaction) => {
    if (ours(transaction.origin)) return;
    const { steps, structural } = readRemote(shared, events, editor.state.doc);
    const undoing = transaction.origin === history.manager;
    const hint = undoing ? history.hint() : structural ? restoreSelection(text, shared.layout, held) : null;
    if (steps.length > 0) applyRemote(editor, steps, hint);
  };
  // A change written over a text that is out of shape can read back as another document: the editor takes that one.
  const settle = () => {
    shared.stale = false;
    const read = readShared(text, required);
    shared.layout = read.layout;
    if (!sameDoc(read.doc, editor.state.doc)) applyRemote(editor, [replaceDocStep(read.doc)]);
  };
  doc.on('beforeTransaction', hold);
  text.observeDeep(observer);
  return {
    editor,
    history,
    local(tr) {
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
      history.destroy();
    },
  };
}
