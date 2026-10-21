import { defineExtension } from '../extension/define-extension';
import type { Extension } from '../extension/types';
import { HISTORY_PROVIDER, type HistoryProvider } from '../state/history';
import { createPluginKey, type PluginSpec } from '../state/plugin';
import type { CollaborationAdapter, CollaborationHistory } from './adapter';
import { linkOf, linkPlugin } from './collaboration-link';
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
 * and a host without one calls `editor.mount()`. Each editor connects once however many times it is mounted, so one
 * value may serve several editors when its adapter can (a Yjs collaboration connects one). While connected the shared document is the source of truth: blocks the host
 * supplies are ignored, so a collaborative editor is fed its starting blocks once and then left to emit.
 */
export function collaborationExtension(adapter: CollaborationAdapter): Extension {
  const { history } = adapter;
  return defineExtension({
    name: 'collaboration',
    plugins: history === undefined ? [linkPlugin] : [linkPlugin, providing(history)],
    onMount(editor) {
      const link = linkOf(editor.state);
      link.mounts += 1;
      if (link.mounts === 1) {
        try {
          link.disconnect = adapter.connect(editor);
        } catch (error) {
          link.mounts = 0;
          throw error;
        }
      }
      return () => {
        link.mounts -= 1;
        if (link.mounts === 0) link.disconnect?.();
      };
    },
    onTransaction(tr, state) {
      const local = tr.origin !== 'remote' && tr.origin !== 'reconcile';
      if (local && linkOf(state).mounts > 0) adapter.onLocalTransaction(tr, state);
    },
    filterHostBlocks(_blocks, state) {
      const link = linkOf(state);
      if (link.mounts === 0) return true;
      if (!link.warned) warnHostBlocks();
      link.warned = true;
      return false;
    },
  });
}
