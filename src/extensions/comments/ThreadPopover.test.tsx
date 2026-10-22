import { act, fireEvent, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { paragraph } from '../../blocks/void/test-canvas';
import { textSelection } from '../../engine';
import { mountComments, span, thread } from './comments-test-canvas';

const blocks = () => [paragraph('a', `Say ${span('t1', 'hello')} to ${span('t2', `the ${span('t3', 'world')}`)}`)];
const threads = () => [
  thread('t1', '<b>not bold</b>\nsecond line', 'A reply'),
  thread('t2', 'Outer'),
  thread('t3', 'Inner'),
];

const wordOne = textSelection({ block: 'p', region: 'text', offset: 0 }, { block: 'p', region: 'text', offset: 5 });

describe('the thread popover', () => {
  it('opens on a click on an anchor, drawing bodies as plain text, and leaves focus in the text', async () => {
    const canvas = mountComments(blocks(), threads());
    canvas.caret('a', 6);
    canvas.click(canvas.anchor('t1'));
    const popover = canvas.popover('Comment on "hello"')!;
    expect(popover).not.toBeNull();
    expect(within(popover).getByText(/not bold/).textContent).toBe('<b>not bold</b>\nsecond line');
    expect(popover.querySelector('b')).toBeNull();
    expect(within(popover).getByText('A reply')).toBeInTheDocument();
    expect(document.activeElement).toBe(canvas.host('a'));
    expect(canvas.anchor('t1').closest('.quoin-comment-active, :has(.quoin-comment-active)')).not.toBeNull();
    expect(await act(() => axe(popover))).toHaveNoViolations();
  });

  it('opens from the keyboard at a caret in an anchor, focus in its reply field, and Escape gives focus back', () => {
    const canvas = mountComments(blocks(), threads());
    canvas.caret('a', 6);
    canvas.commentKey();
    const field = screen.getByRole('textbox', { name: 'Reply' });
    expect(document.activeElement).toBe(field);
    act(() => void fireEvent.keyDown(field, { key: 'Escape' }));
    expect(canvas.popover('Comment on "hello"')).toBeNull();
    expect(document.activeElement).toBe(canvas.host('a'));
    expect(canvas.handle().editor.state.selection).toMatchObject({ head: { block: 'a', offset: 6 } });
  });

  it('lists the threads of overlapping anchors to choose from', async () => {
    const canvas = mountComments(blocks(), threads());
    canvas.caret('a', 20);
    canvas.commentKey();
    const list = canvas.popover('Comments on this text')!;
    expect(await act(() => axe(list))).toHaveNoViolations();
    const choices = within(list).getAllByRole('button');
    expect(choices.map((choice) => choice.textContent)).toEqual(['the worldOuter', 'worldInner']);
    expect(document.activeElement).toBe(choices[0]);
    canvas.click(choices[1]);
    expect(canvas.popover('Comment on "world"')).not.toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Reply' }));
  });

  it('leaves an anchor whose thread the host does not know, or has resolved, as a plain highlight', () => {
    const canvas = mountComments(blocks(), [{ ...thread('t1', 'Done'), resolved: true }]);
    canvas.caret('a', 6);
    canvas.click(canvas.anchor('t1'));
    canvas.click(canvas.anchor('t3'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('sends a reply on Mod+Enter as written, and empties the field once the host has it', async () => {
    const canvas = mountComments(blocks(), threads());
    canvas.caret('a', 6);
    canvas.commentKey();
    const field = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Reply' });
    act(() => void fireEvent.change(field, { target: { value: 'One\ntwo ' } }));
    act(() => void fireEvent.keyDown(field, { key: 'Enter' }));
    expect(canvas.calls.onReply).not.toHaveBeenCalled();
    act(() => void fireEvent.keyDown(field, { key: 'Enter', ...canvas.mod() }));
    await canvas.settle();
    expect(canvas.calls.onReply).toHaveBeenCalledWith('t1', 'One\ntwo');
    expect(field.value).toBe('');
  });

  it('keeps a reply the host failed to take, and tells onError why', async () => {
    const canvas = mountComments(blocks(), threads(), { onReply: () => Promise.reject(new Error('offline')) });
    canvas.caret('a', 6);
    canvas.commentKey();
    const field = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Reply' });
    act(() => void fireEvent.change(field, { target: { value: 'Kept' } }));
    canvas.click(screen.getByRole('button', { name: 'Send' }));
    await canvas.settle();
    expect(canvas.onError).toHaveBeenCalledWith(new Error('offline'));
    expect(field.value).toBe('Kept');
  });

  it('resolves through the host, then takes the anchor off and gives focus back to the text', async () => {
    const canvas = mountComments(blocks(), threads());
    canvas.caret('a', 6);
    canvas.commentKey();
    canvas.click(screen.getByRole('button', { name: 'Resolve' }));
    await canvas.settle();
    expect(canvas.calls.onResolve).toHaveBeenCalledWith('t1');
    expect(canvas.markdown('a')).toBe(`Say hello to ${span('t2', `the ${span('t3', 'world')}`)}`);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(canvas.host('a'));
  });

  it('opens a new thread without taking focus from a control of the page focused while the host answered', async () => {
    let answer = (_: string) => {};
    const onCreate = () => new Promise<string>((resolve) => (answer = resolve));
    const canvas = mountComments([paragraph('p', 'plain words')], [], { onCreate });
    canvas.caret('p', 0);
    act(() => canvas.handle().controller.dispatch(canvas.handle().editor.createTransaction().setSelection(wordOne)));
    canvas.commentKey();
    const elsewhere = document.body.appendChild(document.createElement('button'));
    elsewhere.focus();
    answer('new');
    await canvas.settle();
    expect(canvas.markdown('p')).toBe(`${span('new', 'plain')} words`);
    expect(screen.getByRole('dialog', { name: 'Comment on "plain"' })).toBeInTheDocument();
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });

  it('keeps the anchor when the host fails to delete', async () => {
    const canvas = mountComments(blocks(), threads(), { onDelete: () => Promise.reject(new Error('denied')) });
    canvas.caret('a', 6);
    canvas.commentKey();
    canvas.click(screen.getByRole('button', { name: 'Delete' }));
    await canvas.settle();
    expect(canvas.onError).toHaveBeenCalledWith(new Error('denied'));
    expect(canvas.markdown('a')).toContain(span('t1', 'hello'));
    expect(canvas.popover('Comment on "hello"')).not.toBeNull();
  });
});
