import * as Y from 'yjs';
import type { CommandFactories } from '../engine/commands/chain';
import type { Editor } from '../engine/extension/editor';
import type { Pos, Selection } from '../engine/model/types';
import { continuesEdit, editEnd } from '../engine/state/history-adjacent';
import { groupOf, HISTORY_GROUP } from '../engine/state/history';
import type { Transaction } from '../engine/state/transaction';

const GROUP_DELAY = 500;
const SELECTION = 'selection';

export type UndoHistory = {
  readonly manager: Y.UndoManager;
  /** Sees every local transaction before its change is written, to group changes as the editor would. */
  record(tr: Transaction): void;
  travel(direction: 'undo' | 'redo', editor: Editor<CommandFactories>): boolean;
  /** The selection to restore while an undo or redo applies. */
  hint(): Selection | null;
};

/** A `Y.UndoManager` over the shared text that tracks only `origin`, the changes of this client, across connections. */
export function undoHistory(text: Y.Text, origin: object): UndoHistory {
  const manager = new Y.UndoManager(text, { trackedOrigins: new Set([origin]), captureTimeout: Infinity });
  let group: string | null = null;
  let time = 0;
  let end: Pos | null = null;
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
      const continues = tr.getMeta<string>(HISTORY_GROUP) !== undefined || continuesEdit(tr, end);
      const captured = next !== null && next === group && tr.time - time < GROUP_DELAY && continues;
      if (!captured) manager.stopCapturing();
      group = next;
      end = editEnd(tr) ?? (captured ? end : null);
      time = tr.time;
      before = tr.before.selection;
    },
    travel(direction, editor) {
      const item = manager[`${direction}Stack`].at(-1);
      if (item === undefined) return false;
      hint = (item.meta.get(SELECTION) as Selection | null | undefined) ?? null;
      before = editor.state.selection;
      group = null;
      end = null;
      try {
        return manager[direction]() !== null;
      } finally {
        hint = null;
      }
    },
    hint: () => hint,
  };
}
