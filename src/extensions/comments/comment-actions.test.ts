import { coreExtensions, getPluginState, undo, type Editor } from '../../engine';
import { md, startEditor } from '../../engine/test-support/editor-fixtures';
import { endThread, sendReply } from './comment-actions';
import { createCommentThreads } from './comment-threads';
import { commentsExtension } from './comments-extension';
import { linkOf } from './comments-link';
import { commentsKey } from './comments-plugin';
import { commentsTransaction, openIds } from './comment-open';

const span = (id: string, inner: string) => `<span data-comment="${id}">${inner}</span>`;
const texts = (editor: Editor) => editor.getBlocks().map((block) => block.data.markdown);

function mounted(threads = createCommentThreads()) {
  const extension = commentsExtension({
    threads,
    currentUser: { id: 'u1', name: 'Ada' },
    onCreate: () => Promise.resolve('t9'),
    onReply: () => Promise.resolve(),
    onResolve: () => Promise.resolve(),
    onDelete: () => Promise.resolve(),
  });
  const { editor } = startEditor([md('a', `x ${span('t1', `ab${span('t2', 'c')}`)}`), md('b', span('t1', 'y'))], {
    extensions: [...coreExtensions(), extension],
  });
  const unmount = editor.mount();
  const link = linkOf(editor);
  link.report = vi.fn();
  editor.dispatch(commentsTransaction(editor.state, { type: 'open', open: { ids: ['t1'], focus: true } }));
  return { editor, link, unmount };
}

describe('ending a thread', () => {
  it('keeps an ended thread out of the list until the store of the host catches up', async () => {
    const { editor, link } = mounted();
    const seen = { id: 't1', resolved: false, comments: [] };
    await endThread(editor, link, () => Promise.resolve(), 't1', createCommentThreads([seen]));
    expect(getPluginState(editor.state, commentsKey).ended).toEqual([{ id: 't1', seen }]);
  });

  it('follows the host once its store has caught up, as when it reopens the thread', async () => {
    const seen = { id: 't1', resolved: false, comments: [] };
    const store = createCommentThreads([seen]);
    const { editor, link } = mounted(store);
    await endThread(editor, link, () => Promise.resolve(), 't1', store);
    store.set([{ ...seen }]);
    expect(openIds(editor.state, store, ['t1'])).toEqual([]);
    store.set([{ ...seen, resolved: true }]);
    store.set([{ ...seen }]);
    expect(openIds(editor.state, store, ['t1'])).toEqual(['t1']);
    expect(getPluginState(editor.state, commentsKey).ended).toEqual([]);
  });

  it('tells the host, then takes its marks off in one undo step and closes it', async () => {
    const { editor, link } = mounted();
    const onResolve = vi.fn(() => Promise.resolve());
    await expect(endThread(editor, link, onResolve, 't1')).resolves.toBe(true);
    expect(onResolve).toHaveBeenCalledWith('t1');
    expect(texts(editor)).toEqual([`x ab${span('t2', 'c')}`, 'y']);
    expect(getPluginState(editor.state, commentsKey)).toMatchObject({ active: null, open: null });
    undo(editor.state, (tr) => editor.dispatch(tr));
    expect(texts(editor)).toEqual([`x ${span('t1', `ab${span('t2', 'c')}`)}`, span('t1', 'y')]);
  });

  it('leaves the document as it was and reports why when the host fails', async () => {
    const { editor, link } = mounted();
    await expect(endThread(editor, link, () => Promise.reject(new Error('denied')), 't1')).resolves.toBe(false);
    expect(link.report).toHaveBeenCalledWith(new Error('denied'));
    expect(texts(editor)[1]).toBe(span('t1', 'y'));
    expect(getPluginState(editor.state, commentsKey).open).not.toBeNull();
  });

  it('closes a thread with no text left without changing the document', async () => {
    const { editor, link } = mounted();
    const before = editor.state.doc;
    await expect(endThread(editor, link, () => Promise.resolve(), 'gone')).resolves.toBe(true);
    expect(editor.state.doc).toBe(before);
  });

  it('changes nothing once the editor is unmounted', async () => {
    const { editor, link, unmount } = mounted();
    let answer = () => {};
    const pending = endThread(editor, link, () => new Promise<void>((resolve) => (answer = resolve)), 't1');
    unmount();
    answer();
    await expect(pending).resolves.toBe(false);
    expect(texts(editor)[1]).toBe(span('t1', 'y'));
  });
});

describe('an open thread', () => {
  it('stays open once none of its text is left, until the writer closes it', () => {
    const { editor } = mounted();
    editor.commands.setSelection({
      kind: 'text',
      anchor: { block: 'a', region: 'text', offset: 0 },
      head: { block: 'b', region: 'text', offset: 1 },
    });
    editor.commands.deleteSelection();
    expect(getPluginState(editor.state, commentsKey).open).toEqual({ ids: ['t1'], focus: true });
  });

  it('stays open while some of its text is', () => {
    const { editor } = mounted();
    editor.commands.setSelection({
      kind: 'text',
      anchor: { block: 'b', region: 'text', offset: 0 },
      head: { block: 'b', region: 'text', offset: 1 },
    });
    editor.commands.deleteSelection();
    expect(getPluginState(editor.state, commentsKey).open).toEqual({ ids: ['t1'], focus: true });
  });
});

describe('replying', () => {
  it('sends the body as written', async () => {
    const { link } = mounted();
    const onReply = vi.fn(() => Promise.resolve());
    await expect(sendReply(link, onReply, 't1', 'one\ntwo')).resolves.toBe(true);
    expect(onReply).toHaveBeenCalledWith('t1', 'one\ntwo');
  });

  it('reports a failure, including a host that throws', async () => {
    const { link } = mounted();
    const throws = () => {
      throw new Error('nope');
    };
    await expect(sendReply(link, throws, 't1', 'hi')).resolves.toBe(false);
    expect(link.report).toHaveBeenCalledWith(new Error('nope'));
  });
});
