import * as Y from 'yjs';
import type { CommandFactories } from '../engine/commands/chain';
import type { Editor } from '../engine/extension/editor';
import type { Selection } from '../engine/model/types';
import { HISTORY_GROUP } from '../engine/state/history';
import type { Transaction } from '../engine/state/transaction';

const GROUP_DELAY = 500;
const SELECTION = 'selection';

// The editor's own rule for which changes undo together: typing in one place, or changes named as one group.
function groupOf(tr: Transaction): string | null {
  if (tr.getMeta<boolean>('closeHistory') === true) return null;
  const named = tr.getMeta<string>(HISTORY_GROUP);
  if (named !== undefined) return named;
  const before = tr.before.selection;
  if (tr.origin !== 'input' || before?.kind !== 'text') return null;
  return JSON.stringify([before.head.block, before.head.region]);
}

export type UndoHistory = {
  readonly manager: Y.UndoManager;
  /** Sees every local transaction before its change is written, to group changes as the editor would. */
  record(tr: Transaction): void;
  travel(direction: 'undo' | 'redo', editor: Editor<CommandFactories>): boolean;
  /** The selection to restore while an undo or redo applies. */
  hint(): Selection | null;
  destroy(): void;
};

/** A `Y.UndoManager` over the shared text that tracks only `origin`, the changes of this client. */
export function undoHistory(text: Y.Text, origin: object): UndoHistory {
  const manager = new Y.UndoManager(text, { trackedOrigins: new Set([origin]), captureTimeout: Infinity });
  let group: string | null = null;
  let time = 0;
  let before: Selection | null = null;
  let hint: Selection | null = null;
  manager.on('stack-item-added', ({ stackItem }) => stackItem.meta.set(SELECTION, before));
  return {
    manager,
    record(tr) {
      if (!tr.docChanged) {
        if (tr.getMeta<boolean>('closeHistory') === true) group = null;
        return;
      }
      const next = groupOf(tr);
      if (next === null || next !== group || tr.time - time >= GROUP_DELAY) manager.stopCapturing();
      group = next;
      time = tr.time;
      before = tr.before.selection;
    },
    travel(direction, editor) {
      const stack = direction === 'undo' ? manager.undoStack : manager.redoStack;
      const item = stack.at(-1);
      if (item === undefined) return false;
      hint = (item.meta.get(SELECTION) as Selection | null | undefined) ?? null;
      before = editor.state.selection;
      group = null;
      try {
        return (direction === 'undo' ? manager.undo() : manager.redo()) !== null;
      } finally {
        hint = null;
      }
    },
    hint: () => hint,
    destroy: () => manager.destroy(),
  };
}
