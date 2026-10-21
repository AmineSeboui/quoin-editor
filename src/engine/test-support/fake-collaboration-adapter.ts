import { vi } from 'vitest';
import type { CommandFactories } from '../commands/chain';
import type { Editor } from '../extension/editor';
import type { Transaction } from '../state/transaction';
import type { CollaborationAdapter } from '../collab/adapter';

export function fakeAdapter(options: { history?: boolean } = {}) {
  const local: Transaction[] = [];
  const connected: Editor<CommandFactories>[] = [];
  const disconnect = vi.fn();
  const answer = () => true;
  const history = { undo: vi.fn(answer), redo: vi.fn(answer), canUndo: vi.fn(answer), canRedo: vi.fn(answer) };
  const adapter: CollaborationAdapter = {
    connect(editor) {
      connected.push(editor);
      return disconnect;
    },
    onLocalTransaction: (tr) => void local.push(tr),
    ...(options.history === true && { history }),
  };
  return { adapter, local, connected, disconnect, history };
}
