'use client';

import { defineExtension, type Extension } from '../../engine';
import type { ViewController } from '../../view';
import type { ExtensionUI } from '../ui-types';
import type { AiStream } from './ai-actions';
import { GHOST_WIDGET, aiDecorations } from './ai-decorations';
import { renderGhost } from './ai-ghost-render';
import { aiBlockMenuItem, aiBubbleItem, aiSlashItems } from './ai-items';
import { resolveAiLabels, type AiLabels } from './ai-labels';
import { linkOf } from './ai-link';
import { aiPlugin } from './ai-plugin';
import { endRun, watchGhost } from './ai-session';
import { openOnSpace } from './ai-space';
import { AiOverlay } from './AiOverlay';

export type AiOptions = {
  /** The host's model: answers each request as markdown chunks, and stops when the signal aborts. */
  stream: AiStream;
  /** Every string AI actions show or speak, English by default. A key left out stays English. */
  labels?: Partial<AiLabels>;
};

/**
 * AI actions on the host's model: the AI menu, opened from the slash menu, the toolbar, the block menu or a Space on
 * an empty line, asks the host about the selected text, and the answer streams into the document, to be accepted in
 * one undo step or discarded.
 */
export function aiExtension(options: AiOptions): Extension {
  const { stream } = options;
  const labels = resolveAiLabels(options.labels);
  function Overlay({ controller }: { controller: ViewController }) {
    return <AiOverlay controller={controller} stream={stream} labels={labels} />;
  }
  const ui: ExtensionUI = {
    slashItems: aiSlashItems(labels, stream),
    bubbleItems: [aiBubbleItem(labels)],
    blockMenuItems: [aiBlockMenuItem(labels)],
    render: { widgets: { [GHOST_WIDGET]: renderGhost } },
    overlays: [Overlay],
  };
  return defineExtension({
    name: 'ai',
    plugins: [aiPlugin],
    decorations: aiDecorations,
    keymap: { ' ': openOnSpace },
    // One watcher per editor however many views mount it, and the stream ends with the last of them.
    onMount(editor) {
      const link = linkOf(editor);
      if (link.mounts++ === 0) link.stopWatching = watchGhost(editor, link);
      return () => {
        if (--link.mounts > 0) return;
        link.stopWatching?.();
        link.stopWatching = null;
        endRun(link);
      };
    },
    ui,
  });
}
