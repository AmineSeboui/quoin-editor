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
 * Ties the editor to a shared document through `adapter` while it is mounted: a canvas mounts it from a layout effect,
 * and a host without one calls `editor.mount()`. While connected the shared document is the source of truth: blocks
 * the host supplies are ignored, so a collaborative editor is fed its starting blocks once and then left to emit.
 */
export function collaborationExtension(adapter: CollaborationAdapter): Extension {
  const { history } = adapter;
  let connections = 0;
  let warned = false;
  return defineExtension({
    name: 'collaboration',
    plugins: history === undefined ? [] : [providing(history)],
    onMount(editor) {
      const disconnect = adapter.connect(editor);
      connections += 1;
      return () => {
        connections -= 1;
        disconnect();
      };
    },
    onTransaction(tr, state) {
      if (connections > 0 && !foreignOrigins.includes(tr.origin)) adapter.onLocalTransaction(tr, state);
    },
    filterHostBlocks() {
      if (connections === 0) return true;
      if (!warned) warnHostBlocks();
      warned = true;
      return false;
    },
  });
}
