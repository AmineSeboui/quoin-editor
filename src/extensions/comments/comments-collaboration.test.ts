import { act, fireEvent, render } from '@testing-library/react';
import { createElement, createRef } from 'react';
import type * as Y from 'yjs';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../../canvas/canvas-props';
import {
  coreExtensions,
  createEditor,
  getPluginState,
  textSelection,
  undo,
  type Editor,
  type QuoinBlock,
} from '../../engine';
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
import { yjsCommentThreads } from './yjs-comment-threads';

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

/** A read-only canvas on `doc` whose reader may comment, keeping threads in the same document. */
function reader(doc: Y.Doc, user: { id: string; name: string }) {
  const shared = yjsCommentThreads(doc, { currentUser: user });
  const stop = shared.listen();
  const extensions = [
    collaborationExtension(yjsCollaboration({ doc, user })),
    commentsExtension({ ...shared, currentUser: user, canCommentWhileReadOnly: true }),
  ];
  const ref = createRef<QuoinEditorHandle>();
  const props = { ref, blocks: [], onChange: () => {}, readOnly: true, extensions };
  const { unmount } = render(createElement(BlockCanvas, props));
  const { controller } = ref.current!;
  const select = (block: string, from: number, to: number) =>
    act(() => {
      const [anchor, head] = [from, to].map((offset) => ({ block, region: 'text', offset }));
      controller.focus(anchor);
      controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(anchor, head)));
    });
  const mod = controller.isMac ? { metaKey: true } : { ctrlKey: true };
  const commentKey = () =>
    act(() => void fireEvent.keyDown(document.activeElement!, { key: 'm', code: 'KeyM', altKey: true, ...mod }));
  const close = () => {
    unmount();
    stop();
  };
  return { select, commentKey, close };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const anchored = (editor: Editor) => [...commentAnchors(editor.state.doc).keys()];
const attributesOf = (doc: Y.Doc) =>
  (doc.getText('quoin').toDelta() as { attributes?: Record<string, unknown> }[]).flatMap(({ attributes }) =>
    attributes === undefined ? [] : [attributes],
  );

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

  it('a thread started on a read-only canvas reaches the other client with its mark and startedBy', async () => {
    const { docs, flush } = linkedDocs();
    const bea = client(docs[1], 'bea', createCommentThreads(), [
      { id: 'p', type: 'MARKDOWN', data: { markdown: 'say a word' } },
    ]);
    flush();
    const ada = { id: 'ada', name: 'Ada' };
    const canvas = reader(docs[0], ada);
    flush();
    canvas.select('p', 4, 10);
    canvas.commentKey();
    await act(settle);
    flush();
    const [id] = anchored(bea);
    expect(id).toEqual(expect.any(String));
    expect(attributesOf(docs[1])).toContainEqual({ [`comment:${id}`]: true });
    expect(docs[1].getMap('comment-threads').get(id)).toMatchObject({ id, startedBy: ada });
    canvas.close();
  });
});
