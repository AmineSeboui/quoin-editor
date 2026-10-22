import type * as Y from 'yjs';
import { coreExtensions, createEditor, getPluginState, undo, type Editor, type QuoinBlock } from '../../engine';
import { collaborationExtension } from '../../engine/collab/collaboration-extension';
import { range } from '../../engine/test-support/editor-fixtures';
import { yjsCollaboration } from '../../yjs/index';
import { linkedDocs } from '../../yjs/test-support/peers';
import { endThread } from './comment-actions';
import { commentAnchors } from './comment-anchors';
import { requestComment } from './comment-create';
import { createCommentThreads, type CommentThreads } from './comment-threads';
import { commentsExtension } from './comments-extension';
import { linkOf } from './comments-link';
import { commentsKey } from './comments-plugin';
import { railEntries } from './rail-entries';

function client(doc: Y.Doc, name: string, threads: CommentThreads, blocks: QuoinBlock[] = []) {
  const comments = commentsExtension({
    threads,
    currentUser: { id: name, name },
    onCreate: () => Promise.resolve('t1'),
    onReply: () => Promise.resolve(),
    onResolve: () => Promise.resolve(),
    onDelete: () => Promise.resolve(),
  });
  const collaboration = yjsCollaboration({ doc, user: { name } });
  const editor = createEditor({
    blocks,
    isMac: true,
    extensions: [...coreExtensions(), collaborationExtension(collaboration), comments],
  });
  editor.mount();
  return editor;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const anchored = (editor: Editor) => [...commentAnchors(editor.state.doc).keys()];

describe('comments between collaborators', () => {
  it('reach the other client as marks, listed once its host knows the thread, opening nothing there', async () => {
    const { docs, flush } = linkedDocs();
    const [mine, theirs] = [createCommentThreads(), createCommentThreads()];
    const ada = client(docs[0], 'ada', mine, [{ id: 'p', type: 'MARKDOWN', data: { markdown: 'say a word' } }]);
    flush();
    const bea = client(docs[1], 'bea', theirs);
    flush();
    ada.commands.setSelection(range('p', 4, 10));
    requestComment(ada.state, (tr) => ada.dispatch(tr));
    await settle();
    flush();
    expect(anchored(bea)).toEqual(['t1']);
    expect(getPluginState(bea.state, commentsKey)).toMatchObject({ active: null, open: null, pending: [] });
    expect(railEntries(bea.state.doc, theirs.get())).toEqual([]);
    theirs.set([{ id: 't1', resolved: false, comments: [] }]);
    expect(railEntries(bea.state.doc, theirs.get()).map(({ anchorText }) => anchorText)).toEqual(['a word']);

    await endThread(ada, linkOf(ada), () => Promise.resolve(), 't1');
    flush();
    expect(anchored(bea)).toEqual([]);
    undo(ada.state, (tr) => ada.dispatch(tr));
    flush();
    expect(anchored(ada)).toEqual(['t1']);
    expect(anchored(bea)).toEqual(['t1']);
  });
});
