import { act, fireEvent, screen, within } from '@testing-library/react';
import { paragraph } from '../../blocks/test-support/test-canvas';
import { textSelection, type QuoinBlock } from '../../engine';
import { clipboardEvent, dragEvent, fakeTransfer } from '../../view/clipboard/test-transfer';
import type { CommentThread } from './comment-threads';
import type { CommentsOptions } from './comments-extension';
import { mountComments, span, thread } from './comments-test-canvas';

const MAY_COMMENT: Partial<CommentsOptions> = { canCommentWhileReadOnly: true };

function readOnlyComments(blocks: QuoinBlock[], threads: CommentThread[] = [], options = MAY_COMMENT) {
  const canvas = mountComments(blocks, threads, options, { readOnly: true });
  const select = (from: number, to: number) =>
    act(() => {
      const { controller } = canvas.handle();
      const [anchor, head] = [from, to].map((offset) => ({ block: 'a', region: 'text', offset }));
      controller.focus(anchor);
      controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(anchor, head)));
    });
  const toolbar = () => screen.queryByRole('toolbar');
  return { ...canvas, select, toolbar };
}

const sentence = () => [paragraph('a', 'say a word here')];

const mine: CommentThread = { ...thread('mine', 'Mine'), startedBy: { id: 'me', name: 'Grace Hopper' } };
const theirs: CommentThread = { ...thread('theirs', 'Theirs'), startedBy: { id: 'alan', name: 'Alan Turing' } };
const twoThreads = () => [paragraph('a', `${span('mine', 'one')} and ${span('theirs', 'two')}`)];

describe('comments on a read-only canvas', () => {
  it('without the option a read-only canvas offers no Comment', async () => {
    const canvas = readOnlyComments(sentence(), [], {});
    canvas.select(4, 10);
    expect(canvas.toolbar()).toBeNull();
    expect(screen.queryByRole('button', { name: 'Comment' })).toBeNull();
    canvas.commentKey();
    await canvas.settle();
    expect(canvas.calls.onCreate).not.toHaveBeenCalled();
    expect(canvas.markdown('a')).toBe('say a word here');
  });

  it('a reader who may comment sees Comment on a text selection', () => {
    const canvas = readOnlyComments(sentence());
    canvas.select(4, 10);
    const buttons = within(canvas.toolbar()!).getAllByRole('button');
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(['Comment']);
  });

  it('Comment asks the host for a thread and marks the text', async () => {
    const onCreate = vi.fn(() => Promise.resolve('t1'));
    const canvas = readOnlyComments(sentence(), [], { ...MAY_COMMENT, onCreate });
    canvas.select(4, 10);
    canvas.click(within(canvas.toolbar()!).getByRole('button', { name: 'Comment' }));
    await canvas.settle();
    expect(onCreate).toHaveBeenCalledWith({ anchorText: 'a word', blockId: 'a' });
    expect(canvas.markdown('a')).toBe(`say ${span('t1', 'a word')} here`);
  });

  it('Mod+Alt+M starts a thread on a read-only canvas', async () => {
    const canvas = readOnlyComments(sentence());
    canvas.select(4, 10);
    canvas.commentKey();
    await canvas.settle();
    expect(canvas.calls.onCreate).toHaveBeenCalledWith({ anchorText: 'a word', blockId: 'a' });
    expect(canvas.markdown('a')).toBe(`say ${span('new', 'a word')} here`);
  });

  it('typing, paste and drop still change nothing', () => {
    const canvas = readOnlyComments(sentence());
    canvas.caret('a', 3);
    const unchanged = () => {
      expect(canvas.markdown('a')).toBe('say a word here');
      expect(canvas.changes).toEqual([]);
    };
    canvas.type('x');
    unchanged();
    const pasted = fakeTransfer({ 'text/plain': 'pasted' }).transfer;
    act(() => void fireEvent(canvas.host('a'), clipboardEvent('paste', pasted)));
    unchanged();
    const dropped = fakeTransfer({ 'text/plain': 'dropped' }).transfer;
    act(() => void fireEvent(canvas.host('a'), dragEvent('drop', dropped)));
    unchanged();
  });

  it('formatting shortcuts and the block menu still do nothing', () => {
    const canvas = readOnlyComments(sentence());
    canvas.select(4, 10);
    canvas.key('b', canvas.mod());
    canvas.key('/', canvas.mod());
    expect(screen.queryByRole('menu')).toBeNull();
    expect(canvas.markdown('a')).toBe('say a word here');
    expect(canvas.changes).toEqual([]);
  });

  it("Resolve and Delete show only on the reader's own threads", () => {
    const canvas = readOnlyComments(twoThreads(), [mine, theirs]);
    canvas.caret('a', 1);
    canvas.click(canvas.anchor('mine'));
    const own = canvas.popover('Comment on "one"')!;
    for (const name of ['Resolve', 'Delete']) expect(within(own).getByRole('button', { name })).toBeInTheDocument();
    expect(within(own).getByRole('textbox', { name: 'Reply' })).toBeInTheDocument();

    canvas.caret('a', 9);
    canvas.click(canvas.anchor('theirs'));
    const other = canvas.popover('Comment on "two"')!;
    for (const name of ['Resolve', 'Delete']) expect(within(other).queryByRole('button', { name })).toBeNull();
    expect(within(other).getByRole('textbox', { name: 'Reply' })).toBeInTheDocument();
  });

  it("deleting the reader's own thread removes its marks", async () => {
    const canvas = readOnlyComments(twoThreads(), [mine, theirs]);
    canvas.caret('a', 1);
    canvas.click(canvas.anchor('mine'));
    canvas.click(within(canvas.popover('Comment on "one"')!).getByRole('button', { name: 'Delete' }));
    await canvas.settle();
    expect(canvas.calls.onDelete).toHaveBeenCalledWith('mine');
    expect(canvas.markdown('a')).toBe(`one and ${span('theirs', 'two')}`);
  });

  describe('on a touch screen', () => {
    const mobileToolbar = () => screen.queryByRole('toolbar', { name: 'Editing tools' });
    beforeEach(() =>
      vi.stubGlobal('matchMedia', (media: string) => ({
        media,
        matches: media === '(pointer: coarse)',
        addEventListener: () => {},
        removeEventListener: () => {},
      })),
    );
    afterEach(() => vi.unstubAllGlobals());

    it('a reader who may comment starts a thread from the mobile toolbar', async () => {
      const canvas = readOnlyComments(sentence());
      canvas.select(4, 10);
      const buttons = within(mobileToolbar()!).getAllByRole('button');
      expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(['Comment']);
      canvas.click(buttons[0]);
      await canvas.settle();
      expect(canvas.calls.onCreate).toHaveBeenCalledWith({ anchorText: 'a word', blockId: 'a' });
      expect(canvas.markdown('a')).toBe(`say ${span('new', 'a word')} here`);
    });

    it('without the option a read-only canvas shows no mobile toolbar', () => {
      const canvas = readOnlyComments(sentence(), [], {});
      canvas.select(4, 10);
      expect(mobileToolbar()).toBeNull();
    });
  });
});
