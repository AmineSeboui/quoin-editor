import { act, fireEvent, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { paragraph } from '../../blocks/void/test-canvas';
import { mountComments, span, thread } from './comments-test-canvas';
import { WIDE_CANVAS } from './use-canvas-wide';

const blocks = () => [paragraph('a', `First ${span('t2', 'early')}`), paragraph('b', `Then ${span('t1', 'late')}`)];
const threads = () => [thread('gone', 'Its text was deleted'), thread('t1', 'On late'), thread('t2', 'On early')];

const OFFSET_WIDTH = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')!;

// jsdom lays nothing out, so the canvas is given the width under test.
function canvasWidth(width: number) {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('quoin-editor') ? width : 0;
    },
  });
}

afterEach(() => Object.defineProperty(HTMLElement.prototype, 'offsetWidth', OFFSET_WIDTH));

describe('the rail of a wide canvas', () => {
  beforeEach(() => canvasWidth(WIDE_CANVAS));

  it('lists open threads by where their text is, then those whose text is gone, and reserves its room', async () => {
    const canvas = mountComments(blocks(), threads());
    const rail = screen.getByRole('list', { name: 'Comments' });
    const cards = within(rail).getAllByRole('button');
    expect(cards.map((card) => card.textContent)).toEqual([
      'earlyAda Lovelace On early1 comment',
      'lateAda Lovelace On late1 comment',
      'Text removedAda Lovelace Its text was deleted1 comment',
    ]);
    expect(canvas.container.querySelector('.quoin-editor > .quoin-comments-rail')).not.toBeNull();
    const items = Array.from(rail.children) as HTMLElement[];
    expect(items.every((item) => item.style.transform.startsWith('translateY('))).toBe(true);
    expect(await act(() => axe(rail))).toHaveNoViolations();
  });

  it('opens a thread in place, which Escape folds back onto its card', async () => {
    mountComments(blocks(), threads());
    const card = screen.getByRole('button', { name: /^Text removed/ });
    act(() => void fireEvent.click(card));
    expect(card).toHaveAttribute('aria-expanded', 'true');
    const opened = screen.getByRole('group', { name: 'Text removed' });
    expect(await act(() => axe(opened))).toHaveNoViolations();
    const field = within(opened).getByRole('textbox', { name: 'Reply' });
    field.focus();
    act(() => void fireEvent.keyDown(field, { key: 'Escape' }));
    expect(card).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(card);
  });

  it('marks the text of the thread opened in it more strongly', () => {
    const canvas = mountComments(blocks(), threads());
    act(() => void fireEvent.click(screen.getByRole('button', { name: /^late/ })));
    expect(canvas.host('b').querySelector('.quoin-comment-active')?.textContent).toBe('late');
  });

  it('resolves a thread whose text is gone through the host, with no change to the document', async () => {
    const canvas = mountComments(blocks(), threads());
    act(() => void fireEvent.click(screen.getByRole('button', { name: /^Text removed/ })));
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Resolve' })));
    await canvas.settle();
    expect(canvas.calls.onResolve).toHaveBeenCalledWith('gone');
    expect(canvas.changes).toEqual([]);
  });

  it('drops a resolved thread at once, before the store of the host says so, never as text removed', async () => {
    const canvas = mountComments(blocks(), threads());
    act(() => void fireEvent.click(screen.getByRole('button', { name: /^late/ })));
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Resolve' })));
    await canvas.settle();
    const cards = within(screen.getByRole('list', { name: 'Comments' })).getAllByRole('button');
    expect(cards.map((card) => card.textContent)).toEqual([
      'earlyAda Lovelace On early1 comment',
      'Text removedAda Lovelace Its text was deleted1 comment',
    ]);
  });

  it('lists a resolved thread again, and opens it, once the host reopens it after an undo', async () => {
    const canvas = mountComments(blocks(), threads());
    act(() => void fireEvent.click(screen.getByRole('button', { name: /^late/ })));
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Resolve' })));
    await canvas.settle();
    const gone = thread('gone', 'Its text was deleted');
    act(() => canvas.store.set([gone, { ...thread('t1', 'On late'), resolved: true }]));
    canvas.undo();
    expect(canvas.markdown('b')).toBe(`Then ${span('t1', 'late')}`);
    act(() => canvas.store.set([gone, thread('t1', 'On late')]));
    const rail = screen.getByRole('list', { name: 'Comments' });
    expect(within(rail).getByRole('button', { name: /^late/ })).toBeInTheDocument();
    canvas.caret('b', 6);
    canvas.commentKey();
    expect(canvas.popover('Comment on "late"')).not.toBeNull();
  });

  it('follows the threads the host sets, without a remount', () => {
    const canvas = mountComments(blocks(), threads());
    act(() => canvas.store.set([{ ...thread('t1', 'On late'), resolved: true }, thread('t2', 'On early', 'Agreed')]));
    const cards = within(screen.getByRole('list', { name: 'Comments' })).getAllByRole('button');
    expect(cards.map((card) => card.textContent)).toEqual(['earlyAda Lovelace On early2 comments']);
  });

  it('takes its strings from the labels given', () => {
    mountComments(blocks(), threads(), { labels: { comments: 'Remarques', textRemoved: 'Texte supprim\u00e9' } });
    const rail = screen.getByRole('list', { name: 'Remarques' });
    expect(within(rail).getByText('Texte supprim\u00e9')).toBeInTheDocument();
  });
});

describe('a narrow canvas', () => {
  beforeEach(() => canvasWidth(WIDE_CANVAS - 1));

  it('shows a marker beside each block with threads, and one for threads whose text is gone', () => {
    const canvas = mountComments(blocks(), threads());
    expect(screen.queryByRole('list', { name: 'Comments' })).toBeNull();
    const markers = Array.from(canvas.container.querySelectorAll('.quoin-comments-marker'));
    expect(markers.map((marker) => [marker.getAttribute('data-block'), marker.getAttribute('aria-label')])).toEqual([
      ['a', 'Comments (1)'],
      ['b', 'Comments (1)'],
      ['', 'Comments (1)'],
    ]);
    expect(markers.every((marker) => (marker as HTMLElement).style.transform.startsWith('translateY('))).toBe(true);
  });

  it('opens the sheet of threads from a marker with its thread unfolded, and Escape gives focus back', async () => {
    const canvas = mountComments(blocks(), threads());
    const marker = canvas.container.querySelector<HTMLElement>('.quoin-comments-marker[data-block="b"]')!;
    marker.focus();
    act(() => void fireEvent.click(marker));
    await canvas.settle();
    const sheet = screen.getByRole('dialog', { name: 'Comments' });
    const opened = within(sheet).getByRole('button', { name: /^late/ });
    expect(opened).toHaveAttribute('aria-expanded', 'true');
    expect(document.activeElement).toBe(opened);
    expect(await act(() => axe(sheet))).toHaveNoViolations();
    act(() => void fireEvent.keyDown(opened, { key: 'Escape' }));
    await canvas.settle();
    expect(screen.queryByRole('dialog', { name: 'Comments' })).toBeNull();
    expect(document.activeElement).toBe(marker);
  });
});
