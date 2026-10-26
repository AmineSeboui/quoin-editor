---
title: Comments
description: Comment threads anchored to text, kept in your own store and reached through your callbacks, with a list beside the text or a sheet on a narrow page.
---

# Comments

`quoin-editor/comments` anchors comment threads to text. The threads are yours: Quoin stores only the anchor, a `comment` mark whose `id` is the thread's (`<span data-comment="t1">` in markdown), and asks your callbacks for everything else. Keep the threads in a store from `createCommentThreads(initial)` and call its `set(threads)` whenever your copy changes, after a reply is saved or when a collaborator resolves a thread; the canvas follows without a remount.

```tsx
import { BlockCanvas, type QuoinBlock } from 'quoin-editor';
import { commentsExtension, createCommentThreads, type CommentThread } from 'quoin-editor/comments';
import { useState } from 'react';

type Props = {
  blocks: QuoinBlock[];
  onChange: (next: QuoinBlock[]) => void;
  initial: CommentThread[];
  saveReply: (threadId: string, body: string) => Promise<CommentThread[]>;
};

export function ReviewedEditor({ blocks, onChange, initial, saveReply }: Props) {
  const [threads] = useState(() => createCommentThreads(initial));
  const [extensions] = useState(() => [
    commentsExtension({
      threads,
      currentUser: { id: 'u1', name: 'Ada Lovelace' },
      onCreate: async () => {
        const thread: CommentThread = { id: crypto.randomUUID(), resolved: false, comments: [] };
        threads.set([...threads.get(), thread]);
        return thread.id;
      },
      onReply: async (threadId, body) => threads.set(await saveReply(threadId, body)),
      onResolve: async (threadId) => {
        threads.set(threads.get().map((t) => (t.id === threadId ? { ...t, resolved: true } : t)));
      },
      onDelete: async (threadId) => {
        threads.set(threads.get().filter((t) => t.id !== threadId));
      },
    }),
  ]);
  return <BlockCanvas blocks={blocks} onChange={onChange} extensions={extensions} />;
}
```

The bubble toolbar's Comment button, or Mod+Alt+M, calls `onCreate({ anchorText, blockId })` for the selected text (`blockId` is the first block of a selection across blocks). While it is pending the text is drawn as a pending anchor, which follows any edits made meanwhile; when it resolves with an id, the `comment` mark is added over that text in one undo step, a part in each block of a selection across blocks, and, if the selection has not moved since, the new thread opens with focus in its field for the first comment, which goes to `onReply`. When it rejects, the pending anchor goes and the canvas's `onError` hears why. An edit that splits the text meanwhile, such as Enter inside it, leaves a part in each block, and when all of the text was deleted before your host answered, `onError` hears so with the thread's id, so you can delete the empty thread.

Anchors are tinted with `--quoin-comment`, translucent so that overlapping threads stack deeper, and underlined with `--quoin-comment-edge`, a double line where threads overlap; the anchor of the open thread takes `--quoin-comment-active` and a thicker rule. Body and palette text read at 4.5:1 or more on every tint in the light and dark themes, so the tints stay pale and the rule carries the difference. Clicking an anchor opens its thread in a popover beside it, or a list to choose from where several threads overlap, without taking focus from the text, so typing goes on where the click put the caret. Mod+Alt+M with the caret in an anchor opens it with focus in its reply field, and moves focus into a thread a click already opened. The popover is a dialog that leaves the canvas editable; Escape closes it and, when focus was inside, gives focus back to the text. An anchor whose thread your store does not know, or has resolved, is drawn as a plain tint and opens nothing. A thread a click opened, while you kept typing in the text, closes once you move the caret out of its text, or out of every thread a list there offers, by a click, the arrow keys, typing or Backspace; Enter, Tab, a paste, and a caret a collaborator or your code moves, such as a command or an AI answer, leave it open until your next such move. When the text of an open thread is deleted, by you or a collaborator, the popover stays open as "Text removed" with what you were writing, until you close it; one a click opened closes when you next move the caret yourself.

On a canvas 800 px wide or more the open threads are listed beside the text, each level with the block its text starts in and pushed down when they would overlap; positions follow edits, resizes and loading images, and nothing scrolls the page. A thread opens in place in the list, and Escape folds it back. On a narrower canvas a small button beside each block with threads, and one after them, opens a sheet over the foot of the page that lists them. The room is reserved at the end of every line whenever comments are on, so the threads never cover the text, and the canvas grows as tall as the list beside it, so the list never runs over the page below; the list is left out of a selection or a copy of the page: 272 px on a wide canvas, 36 px on a narrow one, and presence's 24 px gutter sits inside it. Threads whose text has all been deleted are listed after the others as "Text removed", and can still be resolved or deleted.

The canvas is measured once it is in the page. Until then, on the server and in the first render in the browser, comments draw the narrow layout, so a server-rendered canvas that turns out wide moves its text by 236 px when it hydrates. A host that knows its layout passes `initialLayout: 'wide'` (or `'narrow'`, the default) to `commentsExtension`, and the server draws that layout from the start; the canvas still takes the layout its measured width calls for when the two disagree.

Resolve and Delete call `onResolve` or `onDelete`, then take the thread's marks off in one undo step. Undo puts the marks back, and the thread stays as your host left it: a resolved thread's anchor comes back as a plain tint. A thread resolved or deleted here leaves the lists at once, before your store says so, and stays out while your store holds it as it was, open, even as copies your store rebuilds; once your store has resolved or removed it, the canvas follows your store again, so reopening it brings it back. A failed call goes to `onError` and leaves the document unchanged. A read-only canvas shows threads and takes replies but has no Resolve or Delete, since those change the document. Bodies are drawn as plain text with their line breaks, never as markdown or HTML; Mod+Enter or Send sends a reply. With `quoin-editor/yjs`, anchors reach collaborators like any other mark, and their threads come from each client's own store. Strings come from `CommentsLabels` (English in `englishCommentsLabels`), overridden through `commentsExtension({ labels })`.
