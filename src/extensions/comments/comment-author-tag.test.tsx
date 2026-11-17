import { act, fireEvent, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { paragraph } from '../../blocks/test-support/test-canvas';
import type { CommentAuthor, CommentThread } from './comment-threads';
import { mountComments, span } from './comments-test-canvas';
import { WIDE_CANVAS } from './use-canvas-wide';

const OFFSET_WIDTH = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')!;

function canvasWidth(width: number) {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains('quoin-editor') ? width : 0;
    },
  });
}

afterEach(() => Object.defineProperty(HTMLElement.prototype, 'offsetWidth', OFFSET_WIDTH));

const comment = (id: string, author: CommentAuthor & { id: string }) => ({
  id,
  author,
  body: `Body of ${id}`,
  createdAt: '2026-10-22T09:05:00Z',
});

const threads = (): CommentThread[] => [
  {
    id: 't1',
    resolved: false,
    comments: [comment('c1', { id: 'guest', name: 'Ada' }), comment('c2', { id: 'member', name: 'Alan' })],
  },
];

const blocks = () => [paragraph('a', `Some ${span('t1', 'marked')} text`)];

const tagGuests = (author: CommentAuthor) => ('id' in author && author.id === 'guest' ? 'Guest' : undefined);

const thread = (scope: HTMLElement = document.body) =>
  Array.from(scope.querySelectorAll<HTMLElement>('ol > li'));

function openThread() {
  const card = within(screen.getByRole('list', { name: 'Comments' })).getByRole('button', { name: /^marked/ });
  act(() => void fireEvent.click(card));
}

describe('a tag beside an author name', () => {
  beforeEach(() => canvasWidth(WIDE_CANVAS));

  it("a tag the host gives shows after the author's name", () => {
    mountComments(blocks(), threads(), { authorTag: tagGuests });
    openThread();
    const items = thread();
    expect(within(items[0]!).getByText('Guest')).toBeInTheDocument();
    expect(within(items[1]!).queryByText('Guest')).toBeNull();
    expect(items[0]!.textContent).toMatch(/^AAda\s*Guest/);
  });

  it('the tag is read with the name', async () => {
    mountComments(blocks(), threads(), { authorTag: tagGuests });
    openThread();
    const [first, second] = thread();
    expect(within(first!).getByRole('group', { name: 'Ada, Guest' })).toBeInTheDocument();
    expect(within(second!).queryByRole('group')).toBeNull();
    expect(await act(() => axe(screen.getByRole('list', { name: 'Comments' })))).toHaveNoViolations();
  });

  it('no option, no tag', () => {
    mountComments(blocks(), threads());
    openThread();
    expect(screen.queryByText('Guest')).toBeNull();
    expect(screen.queryByRole('group', { name: /Ada,/ })).toBeNull();
  });

  it('the tag shows on the card of a thread whose first comment it tags', () => {
    mountComments(blocks(), threads(), { authorTag: tagGuests });
    const card = within(screen.getByRole('list', { name: 'Comments' })).getByRole('button', { name: /^marked/ });
    expect(within(card).getByText('Guest')).toBeInTheDocument();
  });

  it('the tag shows in the sheet on a narrow canvas too', async () => {
    canvasWidth(WIDE_CANVAS - 1);
    const canvas = mountComments(blocks(), threads(), { authorTag: tagGuests });
    act(() => void fireEvent.click(canvas.container.querySelector('.quoin-comments-marker')!));
    await canvas.settle();
    const sheet = screen.getByRole('dialog', { name: 'Comments' });
    expect(within(sheet).getAllByText('Guest').length).toBeGreaterThan(0);
    expect(within(sheet).getAllByRole('group', { name: 'Ada, Guest' })[0]).toBeInTheDocument();
    expect(await act(() => axe(sheet))).toHaveNoViolations();
  });
});
