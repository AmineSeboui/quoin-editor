'use client';

import { defineExtension, getPluginState, type Extension } from '../../engine';
import { MessageSquarePlus } from '../../icons';
import type { ViewController } from '../../view';
import type { ExtensionUI, ToolbarItem } from '../ui-types';
import { hasCommentableText, requestComment, watchCreates, type CreateThread } from './comment-create';
import { commentCommand } from './comment-open';
import type { CommentAuthor, CommentThreads, CommentUser } from './comment-threads';
import { resolveCommentsLabels, type CommentsLabels } from './comments-labels';
import { linkOf } from './comments-link';
import { CommentsOverlay } from './CommentsOverlay';
import { commentsDecorations } from './comments-decorations';
import { commentsKey, commentsPlugin } from './comments-plugin';
import { COMMENT_KEY } from './reader-comment-key';
import { watchEnded } from './watch-ended';

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
  /**
   * The layout drawn on the server and in the first render in the browser, until the canvas is measured: the threads
   * beside a canvas `'wide'` enough for them, or markers and a sheet. `'narrow'` by default.
   */
  initialLayout?: 'wide' | 'narrow';
  /** Every string comments show or speak, English by default. A key left out stays English. */
  labels?: Partial<CommentsLabels>;
  /**
   * Lets the reader of a read-only canvas comment: start a thread from the toolbar or Mod+Alt+M, reply, and resolve or
   * delete a thread whose `startedBy.id` is the `id` of `currentUser`. The comment marks reach `onChange`, or the
   * shared document, as an edit would; nothing else the reader does through the canvas changes the document. Code can
   * still change a read-only canvas, so a shared document needs its server to enforce comment-only access. `false` by
   * default.
   *
   * Read when the canvas mounts, so changing it means remounting the canvas with a new `key`. A host that keeps
   * threads in a store of its own sets `startedBy` on each thread it creates, or the reader can resolve or delete none
   * of them; with `yjsCommentThreads`, the `currentUser` it is given and this one share an `id`. A commenter's
   * `currentUser` carries no `avatarUrl`, since `quoin-collab-server` refuses one from a connection that may only
   * comment. The text of a read-only canvas takes no keyboard focus, so a reader selects it with a pointer or a long
   * press, not with the keyboard.
   */
  canCommentWhileReadOnly?: boolean;
  /**
   * A short tag shown after an author's name, such as 'Guest', or `undefined` for none. The host decides it from what
   * it knows of the author, not from the name, which a guest chooses. It is read as the comments are drawn, so to
   * change the tag of an author already shown, set the threads again with a new array.
   */
  authorTag?(author: CommentAuthor): string | undefined;
};

export type CommentsHost = Omit<CommentsOptions, 'labels'>;

const commentItem = (labels: CommentsLabels, whileReadOnly: boolean): ToolbarItem => ({
  id: 'comment',
  title: labels.comment,
  icon: MessageSquarePlus,
  shortcut: COMMENT_KEY,
  whileReadOnly,
  available: (state) => hasCommentableText(state) && getPluginState(state, commentsKey).pending.length === 0,
  // Focus goes back to the text first: the button leaves the toolbar while the thread is being asked for.
  run: (controller) => {
    controller.focus();
    controller.run(requestComment);
  },
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
  const ui: ExtensionUI = {
    bubbleItems: [commentItem(labels, host.canCommentWhileReadOnly === true)],
    overlays: [Overlay],
  };
  return defineExtension({
    name: 'comments',
    plugins: [commentsPlugin],
    decorations: commentsDecorations,
    keymap: { [COMMENT_KEY]: commentCommand(host.threads) },
    // One watcher per editor however many views mount it at once, so the host is asked once per thread.
    onMount(editor) {
      const link = linkOf(editor);
      if (link.mounts++ === 0) {
        const stops = [watchCreates(editor, host.onCreate, link), watchEnded(editor, host.threads)];
        link.stopWatching = () => stops.forEach((stop) => stop());
      }
      return () => {
        if (--link.mounts > 0) return;
        link.stopWatching?.();
        link.stopWatching = null;
      };
    },
    ui,
  });
}
