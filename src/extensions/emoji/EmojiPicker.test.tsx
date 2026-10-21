import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { coreBlocks } from '../../blocks/core';
import { QuoinProvider } from '../../context';
import { searchEmoji } from '../../emoji/index';
import { loadEmojiData } from './emoji-data';
import { englishEmojiLabels } from './emoji-labels';
import { heldEmojiData } from './emoji-test-canvas';
import { EmojiPicker } from './EmojiPicker';

const GRINNING = '\u{1F600}';
const SMILEY = '\u{1F603}';
const PARTY_POPPER = '\u{1F389}';
const COLUMNS = 8;

function renderPicker({ strict = false, onError = vi.fn() } = {}) {
  const onPick = vi.fn();
  const picker = (
    <QuoinProvider value={{ blockTypes: coreBlocks, onError }}>
      <EmojiPicker labels={englishEmojiLabels} onPick={onPick} />
    </QuoinProvider>
  );
  render(strict ? <StrictMode>{picker}</StrictMode> : picker);
  const field = screen.getByRole('textbox', { name: 'Search emoji' });
  act(() => field.focus());
  return { onPick, onError, field, user: userEvent.setup() };
}

const grids = () => screen.queryAllByRole('grid');
const focusedName = () => document.activeElement?.getAttribute('aria-label');
const nthEmoji = (index: number) => searchEmoji('')[index];

describe('the emoji picker', () => {
  beforeAll(() => loadEmojiData());
  afterEach(() => vi.restoreAllMocks());

  it('shows a grid of every emoji for each group, named after it, and names each cell by its shortcode or first tag', () => {
    renderPicker();
    expect(grids()).toHaveLength(9);
    expect(grids()[0]).toHaveAccessibleName('Smileys and emotion');
    expect(grids()[8]).toHaveAccessibleName('Flags');
    const cells = screen.getAllByRole('gridcell');
    expect(cells).toHaveLength(searchEmoji('').length);
    expect(within(grids()[0]).getAllByRole('row')[0].children).toHaveLength(COLUMNS);
    const party = screen.getByRole('gridcell', { name: 'tada' });
    expect(party).toHaveTextContent(PARTY_POPPER);
    expect(within(grids()[5]).getByRole('gridcell', { name: 'tada' })).toBe(party);
    const unnamed = searchEmoji('').find(({ shortcodes }) => shortcodes.length === 0)!;
    const byTag = screen.getAllByRole('gridcell', { name: unnamed.tags[0] });
    expect(byTag.some((cell) => cell.textContent === unnamed.emoji)).toBe(true);
  });

  it('narrows to one grid of the emoji the search finds, best first, and says when none match', async () => {
    const { user, field } = renderPicker();
    await user.type(field, 'tada');
    expect(grids()).toHaveLength(1);
    expect(grids()[0]).toHaveAccessibleName('Search results');
    expect(within(grids()[0]).getAllByRole('gridcell')[0]).toHaveAccessibleName('tada');
    await user.type(field, 'zzz');
    expect(grids()).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent('No emoji found');
  });

  it('walks the grid with the arrows, Home and End, and picks the emoji of the cell with Enter', async () => {
    const { user, onPick } = renderPicker();
    await user.tab();
    expect(focusedName()).toBe('grinning');
    expect(document.activeElement).toHaveAttribute('tabindex', '0');
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toHaveTextContent(SMILEY);
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toHaveTextContent(nthEmoji(COLUMNS + 1).emoji);
    await user.keyboard('{End}');
    expect(document.activeElement).toHaveTextContent(nthEmoji(2 * COLUMNS - 1).emoji);
    await user.keyboard('{Home}');
    expect(document.activeElement).toHaveTextContent(nthEmoji(COLUMNS).emoji);
    await user.keyboard('{ArrowUp}{ArrowLeft}');
    expect(focusedName()).toBe('grinning');
    expect(screen.getAllByRole('gridcell').filter((cell) => cell.tabIndex === 0)).toHaveLength(1);
    await user.keyboard('{ArrowRight}{Enter}');
    expect(onPick.mock.calls).toEqual([[SMILEY]]);
  });

  it('moves from the last row of a group to the first of the next, and from the end of a row to the next row', async () => {
    const { user } = renderPicker();
    await user.tab();
    await user.keyboard('{End}');
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toHaveTextContent(nthEmoji(COLUMNS).emoji);
    const smileys = searchEmoji('').filter(({ group }) => group === 'smileys').length;
    const lastRow = Math.ceil(smileys / COLUMNS) - 1;
    for (let row = 1; row < lastRow; row++) await user.keyboard('{ArrowDown}');
    expect(within(grids()[0]).getAllByRole('row').at(-1)).toContainElement(document.activeElement as HTMLElement);
    await user.keyboard('{ArrowDown}');
    expect(within(grids()[1]).getAllByRole('gridcell')[0]).toHaveFocus();
  });

  it('keeps the active cell in the grid when a search narrows it, and picks the first match with Enter in the field', async () => {
    const { user, field, onPick } = renderPicker();
    await user.tab();
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    await user.tab();
    expect(field).toHaveFocus();
    await user.type(field, 'tada');
    await user.tab();
    expect(focusedName()).toBe('tada');
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(field).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(focusedName()).toBe('tada');
    act(() => field.focus());
    await user.keyboard('{Enter}');
    expect(onPick.mock.calls).toEqual([[PARTY_POPPER]]);
  });

  it('picks the emoji of a cell clicked, and nothing for Enter in an empty field', async () => {
    const { user, onPick } = renderPicker();
    await user.keyboard('{Enter}');
    expect(onPick).not.toHaveBeenCalled();
    await user.click(screen.getByRole('gridcell', { name: 'tada' }));
    expect(onPick.mock.calls).toEqual([[PARTY_POPPER]]);
  });

  it('picks nothing on an Enter that belongs to a composition', async () => {
    const { user, field, onPick } = renderPicker();
    await user.type(field, 'tada');
    fireEvent.keyDown(field, { key: 'Enter', keyCode: 229 });
    fireEvent.keyDown(field, { key: 'Enter', isComposing: true });
    await user.tab();
    fireEvent.keyDown(document.activeElement!, { key: 'Enter', isComposing: true });
    expect(onPick).not.toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    const { user, field } = renderPicker();
    await user.type(field, 'smi');
    expect(await axe(document.body.firstElementChild!)).toHaveNoViolations();
  });
});

describe('the emoji picker, while the dataset loads', () => {
  afterEach(() => vi.restoreAllMocks());

  it('says it loads the emoji until they come, then shows them, once under StrictMode', async () => {
    const held = heldEmojiData();
    renderPicker({ strict: true });
    expect(screen.getByRole('status')).toHaveTextContent('Loading emoji\u2026');
    expect(grids()).toHaveLength(0);
    expect(await axe(document.body.firstElementChild!)).toHaveNoViolations();
    for (const answer of held.answers) await answer.resolve();
    expect(screen.getByRole('status')).toHaveTextContent('');
    expect(grids()).toHaveLength(9);
    expect(screen.getByRole('gridcell', { name: 'grinning' })).toHaveTextContent(GRINNING);
  });

  it('says the emoji could not be loaded when the load fails, reports it, and loads again when opened again', async () => {
    const held = heldEmojiData();
    const { onError } = renderPicker();
    await held.last().reject(new Error('offline'));
    expect(screen.getByRole('status')).toHaveTextContent('Emoji could not be loaded');
    expect(onError.mock.calls).toEqual([[new Error('offline')]]);
    expect(await axe(document.body.firstElementChild!)).toHaveNoViolations();
    cleanup();
    renderPicker();
    expect(held.load).toHaveBeenCalledTimes(2);
    await held.last().resolve();
    expect(grids()).toHaveLength(9);
  });
});
