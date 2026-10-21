import { defineExtension } from '../extension/define-extension';
import type { Extension } from '../extension/types';
import { HISTORY_PROVIDER, type HistoryProvider } from '../state/history';
import { createPluginKey, type PluginSpec } from '../state/plugin';
import { foreignOrigins } from '../state/transaction';
import type { CollaborationAdapter, CollaborationHistory } from './adapter';
import { warnHostBlocks } from './warn-host-blocks';

const providerKey = createPluginKey<HistoryProvider>(HISTORY_PROVIDER);

function providing(history: CollaborationHistory): PluginSpec<HistoryProvider> {
  const provider: HistoryProvider = {
    undo: (dryRun) => (dryRun ? history.canUndo() : history.undo()),
    redo: (dryRun) => (dryRun ? history.canRedo() : history.redo()),
  };
  return { key: providerKey, init: () => provider, apply: (_tr, value) => value };
}

/**
 * Ties the editor to a shared document through `adapter`. The shared document is the source of truth: blocks the host
 * supplies afterwards are ignored, so a collaborative editor is fed its starting blocks once and then left to emit.
 */
export function collaborationExtension(adapter: CollaborationAdapter): Extension {
  const { history } = adapter;
  let warned = false;
  return defineExtension({
    name: 'collaboration',
    plugins: history === undefined ? [] : [providing(history)],
    onCreate: (editor) => adapter.connect(editor),
    onTransaction(tr, state) {
      if (!foreignOrigins.includes(tr.origin)) adapter.onLocalTransaction(tr, state);
    },
    filterHostBlocks() {
      if (!warned) warnHostBlocks();
      warned = true;
      return false;
    },
  });
}
