import { coreExtensions, getPluginState, textSelection, undo, type Editor } from '../../engine';
import { md, range, startEditor } from '../../engine/test-support/editor-fixtures';
import { commentAnchors } from './comment-anchors';
import { requestComment } from './comment-create';
import { createCommentThreads } from './comment-threads';
import { commentsExtension } from './comments-extension';
import type { ExtensionUI } from '../ui-types';
import { linkOf } from './comments-link';
import { commentsKey } from './comments-plugin';

type Answer = { resolve(id: string): void; reject(error: unknown): void };

function fakeHost() {
  const answers: Answer[] = [];
  const onCreate = vi.fn(
    () => new Promise<string>((resolve, reject) => answers.push({ resolve, reject })),
  );
  const done = () => Promise.resolve();
  const extension = commentsExtension({
    threads: createCommentThreads(),
    currentUser: { id: 'u1', name: 'Ada' },
    onCreate,
    onReply: done,
    onResolve: done,
    onDelete: done,
  });
  return { answers, onCreate, extension };
}

function commenting(...lines: string[]) {
  const host = fakeHost();
  const { editor } = startEditor(
    lines.map((line, i) => md(`p${i}`, line)),
    { extensions: [...coreExtensions(), host.extension] },
  );
  const unmount = editor.mount();
  const report = vi.fn();
  linkOf(editor).report = report;
  return { ...host, editor, unmount, report };
}

const span = (id: string, inner: string) => `<span data-comment="${id}">${inner}</span>`;
const request = (editor: Editor) => requestComment(editor.state, (tr) => editor.dispatch(tr));
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const texts = (editor: Editor) => editor.getBlocks().map((block) => block.data.markdown);
const pendingClasses = (editor: Editor) =>
  editor
    .decorations()
    .flatMap((d) =>
      d.kind === 'inline' && d.attrs.class === 'quoin-comment-pending' ? [[d.block, d.from, d.to]] : [],
    );

describe('commenting on the selected text', () => {
  it('asks the host for a thread and shows the text as pending meanwhile, without a mark', () => {
    const { editor, onCreate } = commenting('say a word here');
    editor.commands.setSelection(range('p0', 4, 10));
    expect(request(editor)).toBe(true);
    expect(onCreate).toHaveBeenCalledWith({ anchorText: 'a word', blockId: 'p0' });
    expect(pendingClasses(editor)).toEqual([['p0', 4, 10]]);
    expect(texts(editor)).toEqual(['say a word here']);
    expect(editor.can().undo()).toBe(false);
  });

  it('marks the text with the id the host answers, in one undo step, and opens the new thread', async () => {
    const { editor, answers } = commenting('say a word here');
    editor.commands.setSelection(range('p0', 4, 10));
    request(editor);
    answers[0].resolve('t1');
    await settle();
    expect(texts(editor)).toEqual(['say <span data-comment="t1">a word</span> here']);
    expect(pendingClasses(editor)).toEqual([]);
    expect(getPluginState(editor.state, commentsKey)).toMatchObject({ active: 't1', open: { ids: ['t1'] } });
    undo(editor.state, (tr) => editor.dispatch(tr));
    expect(texts(editor)).toEqual(['say a word here']);
  });

  it('marks the text where edits made meanwhile moved it, leaving out what was typed at its edges', async () => {
    const { editor, answers } = commenting('say a word here');
    editor.commands.setSelection(range('p0', 4, 10));
    request(editor);
    editor.commands.setSelection(range('p0', 0, 0));
    editor.insertText('so ');
    editor.commands.setSelection(range('p0', 13, 13));
    editor.insertText('!');
    editor.commands.setSelection(range('p0', 7, 7));
    editor.insertText('(');
    expect(pendingClasses(editor)).toEqual([['p0', 8, 14]]);
    answers[0].resolve('t1');
    await settle();
    expect(texts(editor)).toEqual(['so say (<span data-comment="t1">a word</span>! here']);
    expect(getPluginState(editor.state, commentsKey).open).toBeNull();
  });

  it('marks each block of a selection across blocks, named by the first block', async () => {
    const { editor, answers, onCreate } = commenting('one two', 'three four');
    const [from, to] = [{ block: 'p0', region: 'text', offset: 4 }, { block: 'p1', region: 'text', offset: 5 }];
    editor.commands.setSelection(textSelection(from, to));
    request(editor);
    expect(onCreate).toHaveBeenCalledWith({ anchorText: 'two three', blockId: 'p0' });
    answers[0].resolve('t1');
    await settle();
    expect(commentAnchors(editor.state.doc).get('t1')).toEqual([
      { block: 'p0', region: 'text', from: 4, to: 7 },
      { block: 'p1', region: 'text', from: 0, to: 5 },
    ]);
    undo(editor.state, (tr) => editor.dispatch(tr));
    expect(texts(editor)).toEqual(['one two', 'three four']);
  });

  it('drops the pending text and reports why when the host refuses, leaving the document as it was', async () => {
    const { editor, answers, report } = commenting('say a word here');
    editor.commands.setSelection(range('p0', 4, 10));
    request(editor);
    answers[0].reject(new Error('offline'));
    await settle();
    expect(pendingClasses(editor)).toEqual([]);
    expect(texts(editor)).toEqual(['say a word here']);
    expect(report).toHaveBeenCalledWith(new Error('offline'));
  });

  it('reports a host that throws, or answers with no id', async () => {
    const { editor, answers, onCreate, report } = commenting('say a word here');
    onCreate.mockImplementationOnce(() => {
      throw new Error('broken');
    });
    editor.commands.setSelection(range('p0', 4, 10));
    request(editor);
    await settle();
    expect(report).toHaveBeenLastCalledWith(new Error('broken'));
    request(editor);
    answers[0].resolve('');
    await settle();
    expect(report).toHaveBeenCalledTimes(2);
    expect(texts(editor)).toEqual(['say a word here']);
    expect(pendingClasses(editor)).toEqual([]);
  });

  it('tells onError of a thread whose text was all deleted meanwhile, so the host can delete it', async () => {
    const { editor, answers, report } = commenting('say a word here');
    editor.commands.setSelection(range('p0', 3, 11));
    request(editor);
    editor.commands.deleteSelection();
    answers[0].resolve('t1');
    await settle();
    expect(texts(editor)).toEqual(['sayhere']);
    expect(pendingClasses(editor)).toEqual([]);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report.mock.calls[0][0].message).toContain('t1');
  });

  it('marks each part of a pending text that Enter split into two blocks', async () => {
    const { editor, answers, report } = commenting('plain words here');
    editor.commands.setSelection(range('p0', 0, 11));
    request(editor);
    editor.commands.setSelection(range('p0', 3, 3));
    editor.commands.splitBlock();
    answers[0].resolve('t1');
    await settle();
    expect(texts(editor)).toEqual([span('t1', 'pla'), `${span('t1', 'in words')} here`]);
    expect(report).not.toHaveBeenCalled();
  });

  it('asks the host once for an editor mounted twice at a time', async () => {
    const { editor, onCreate } = commenting('say a word here');
    const second = editor.mount();
    editor.commands.setSelection(range('p0', 4, 10));
    request(editor);
    await settle();
    expect(onCreate).toHaveBeenCalledTimes(1);
    second();
  });

  it('takes the toolbar button away while a thread is being asked for', () => {
    const { editor, extension } = commenting('say a word here');
    const [item] = (extension.ui as ExtensionUI).bubbleItems ?? [];
    editor.commands.setSelection(range('p0', 4, 10));
    expect(item.available?.(editor.state)).toBe(true);
    request(editor);
    expect(item.available?.(editor.state)).toBe(false);
  });

  it('does nothing once the editor is unmounted', async () => {
    const { editor, answers, unmount, report } = commenting('say a word here');
    editor.commands.setSelection(range('p0', 4, 10));
    request(editor);
    unmount();
    editor.destroy();
    answers[0].resolve('t1');
    await settle();
    expect(report).not.toHaveBeenCalled();
  });

  it('asks for one thread at a time, so a second press while the host answers adds none', async () => {
    const { editor, onCreate, answers } = commenting('say a word here');
    editor.commands.setSelection(range('p0', 4, 10));
    expect(request(editor)).toBe(true);
    expect(request(editor)).toBe(false);
    expect(onCreate).toHaveBeenCalledTimes(1);
    answers[0].resolve('t1');
    await settle();
    editor.commands.setSelection(range('p0', 0, 3));
    expect(request(editor)).toBe(true);
  });

  it('needs selected text', () => {
    const { editor, onCreate } = commenting('say a word here');
    editor.commands.setSelection(range('p0', 4, 4));
    expect(request(editor)).toBe(false);
    expect(onCreate).not.toHaveBeenCalled();
  });
});
