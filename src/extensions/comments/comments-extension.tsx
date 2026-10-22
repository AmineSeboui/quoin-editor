'use client';

import { MessageSquarePlus } from 'lucide-react';
import { defineExtension, type Extension } from '../../engine';
import type { ViewController } from '../../view';
import type { ExtensionUI, ToolbarItem } from '../ui-types';
import { hasCommentableText, requestComment, watchCreates, type CreateThread } from './comment-create';
import { commentCommand } from './comment-open';
import type { CommentThreads, CommentUser } from './comment-threads';
import { resolveCommentsLabels, type CommentsLabels } from './comments-labels';
import { linkOf } from './comments-link';
import { CommentsOverlay } from './CommentsOverlay';
import { commentsDecorations } from './comments-decorations';
import { commentsPlugin } from './comments-plugin';

export type CommentsOptions = {
  /** The host's threads, from `createCommentThreads`, which the host sets again as they change. */
  threads: CommentThreads;
  /** Who is commenting, shown beside the reply field. */
  currentUser: CommentUser;
  /** Creates an empty thread for the selected text and answers with its id. */
  onCreate: CreateThread;
  onReply(threadId: string, body: string): Promise<void>;
  onResolve(threadId: string): Promise<void>;
  onDelete(threadId: string): Promise<void>;
  /** Every string comments show or speak, English by default. A key left out stays English. */
  labels?: Partial<CommentsLabels>;
};

export type CommentsHost = Omit<CommentsOptions, 'labels'>;

const commentItem = (labels: CommentsLabels): ToolbarItem => ({
  id: 'comment',
  title: labels.comment,
  icon: MessageSquarePlus,
  shortcut: 'Mod-Alt-m',
  available: hasCommentableText,
  run: (controller) => void controller.run(requestComment),
});

/**
 * Comments anchored to text, in threads the host keeps: the toolbar's Comment and Mod+Alt+M ask the host for a thread
 * and mark the selected text with its id, a click on marked text opens its thread, and the threads are listed beside a
 * wide canvas or in a sheet over a narrow one.
 */
export function commentsExtension(options: CommentsOptions): Extension {
  const { labels: overrides, ...host } = options;
  const labels = resolveCommentsLabels(overrides);
  function Overlay({ controller }: { controller: ViewController }) {
    return <CommentsOverlay controller={controller} host={host} labels={labels} />;
  }
  const ui: ExtensionUI = { bubbleItems: [commentItem(labels)], overlays: [Overlay] };
  return defineExtension({
    name: 'comments',
    plugins: [commentsPlugin],
    decorations: commentsDecorations,
    keymap: { 'Mod-Alt-m': commentCommand(host.threads) },
    onMount(editor) {
      const link = linkOf(editor);
      link.mounts++;
      const stop = watchCreates(editor, host.onCreate, link);
      return () => {
        stop();
        link.mounts--;
      };
    },
    ui,
  });
}
