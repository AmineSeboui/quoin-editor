import { act, fireEvent, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { paragraph } from '../../blocks/void/test-canvas';
import { textSelection } from '../../engine';
import { mountFind } from './find-test-canvas';

const DOC = [paragraph('a', 'A cat sat on a cat mat'), paragraph('b', 'The cat')];

function openOn(blocks = DOC, ...rest: Parameters<typeof mountFind> extends [unknown, ...infer R] ? R : never) {
  const mounted = mountFind(blocks, ...rest);
  mounted.caret('a', 0);
  mounted.openPanel();
  return mounted;
}

const status = () => document.querySelector('[data-quoin-find-status]');
const announced = () => document.querySelector('[aria-live="polite"][data-quoin-find-announcer]')?.textContent;

describe('the find panel', () => {
  afterEach(() => vi.useRealTimers());

  it('opens on Mod+Shift+F from the editor as a named search region with the query field focused', () => {
    const { panel, field } = openOn();
    expect(panel()).not.toBeNull();
    expect(field('Find')).toHaveFocus();
    for (const name of ['Match case', 'Whole word', 'Regular expression']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
    }
    expect(field('Replace with')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replace all' })).toBeInTheDocument();
  });

  it('starts with the text selected in one line', () => {
    const { handle, openPanel, field } = mountFind(DOC);
    act(() => handle().focus());
    act(() =>
      handle().controller.dispatch(
        handle()
          .editor.createTransaction()
          .setSelection(
            textSelection({ block: 'a', region: 'text', offset: 2 }, { block: 'a', region: 'text', offset: 5 }),
          ),
      ),
    );
    openPanel();
    expect(field('Find')).toHaveValue('cat');
    expect(status()).toHaveTextContent('1 of 3');
  });

  it('marks the matches as the query is typed, counts them, and steps with Enter and Shift+Enter, wrapping', () => {
    const { fill, keyIn, matches, current, handle } = openOn();
    fill('Find', 'cat');
    expect(matches('a')).toEqual(['cat', 'cat']);
    expect(matches('b')).toEqual(['cat']);
    expect(status()).toHaveTextContent('1 of 3');
    expect(current()?.closest('[data-block-id]')).toHaveAttribute('data-block-id', 'a');
    keyIn('Find', 'Enter');
    keyIn('Find', 'Enter');
    expect(status()).toHaveTextContent('3 of 3');
    expect(current()?.closest('[data-block-id]')).toHaveAttribute('data-block-id', 'b');
    keyIn('Find', 'Enter');
    expect(status()).toHaveTextContent('1 of 3');
    keyIn('Find', 'Enter', { shiftKey: true });
    expect(status()).toHaveTextContent('3 of 3');
    expect(handle().editor.state.selection).toEqual(textSelection({ block: 'a', region: 'text', offset: 0 }));
  });

  it('steps with the previous and next buttons', () => {
    const { fill, button } = openOn();
    fill('Find', 'cat');
    act(() => button('Next match').click());
    expect(status()).toHaveTextContent('2 of 3');
    act(() => button('Previous match').click());
    act(() => button('Previous match').click());
    expect(status()).toHaveTextContent('3 of 3');
  });

  it('presses an option toggle, which searches again', () => {
    const { fill, button, matches } = openOn([paragraph('a', 'Cat cat category')]);
    fill('Find', 'cat');
    expect(matches('a')).toHaveLength(3);
    act(() => button('Match case').click());
    expect(button('Match case')).toHaveAttribute('aria-pressed', 'true');
    expect(matches('a')).toEqual(['cat', 'cat']);
    act(() => button('Whole word').click());
    expect(matches('a')).toEqual(['cat']);
  });

  it('says when nothing matches and when a pattern cannot be read', () => {
    const { fill, button } = openOn();
    fill('Find', 'dog');
    expect(status()).toHaveTextContent('No results');
    act(() => button('Regular expression').click());
    fill('Find', 'ca(');
    expect(status()).toHaveTextContent('Invalid regular expression');
    expect(document.querySelectorAll('.quoin-find-match')).toHaveLength(0);
  });

  it('replaces the current match on Enter in the replace field and moves on, then replaces the rest in one step', () => {
    const { fill, keyIn, button, last, undo, handle, panel } = openOn();
    fill('Find', 'cat');
    fill('Replace with', 'dog');
    keyIn('Replace with', 'Enter');
    expect(last()?.[0].data.markdown).toBe('A dog sat on a cat mat');
    expect(status()).toHaveTextContent('1 of 2');
    act(() => button('Replace all').click());
    expect(last()?.map((block) => block.data.markdown)).toEqual(['A dog sat on a dog mat', 'The dog']);
    expect(status()).toHaveTextContent('No results');
    expect(panel()).toContainElement(document.activeElement as HTMLElement);
    act(() => handle().focus());
    undo();
    expect(last()?.map((block) => block.data.markdown)).toEqual(['A dog sat on a cat mat', 'The cat']);
  });

  it('closes on Escape, clearing the marks and selecting the current match in the editor', () => {
    const { fill, keyIn, panel, handle, host } = openOn();
    fill('Find', 'cat');
    keyIn('Find', 'Enter');
    keyIn('Find', 'Escape');
    expect(panel()).toBeNull();
    expect(document.querySelectorAll('.quoin-find-match')).toHaveLength(0);
    expect(handle().editor.state.selection).toEqual(
      textSelection({ block: 'a', region: 'text', offset: 15 }, { block: 'a', region: 'text', offset: 18 }),
    );
    expect(host('a')).toHaveFocus();
  });

  it('closes from its close button, putting the caret back where it was when nothing matches', () => {
    const { fill, button, panel, handle, host } = openOn();
    fill('Find', 'dog');
    act(() => button('Close').click());
    expect(panel()).toBeNull();
    expect(handle().editor.state.selection).toEqual(textSelection({ block: 'a', region: 'text', offset: 0 }));
    expect(host('a')).toHaveFocus();
  });

  it('stays open on a press outside, and follows edits made in the editor', () => {
    const { fill, panel, matches, caret, type } = openOn();
    fill('Find', 'cat');
    act(() => void fireEvent.pointerDown(document.body));
    expect(panel()).not.toBeNull();
    caret('b', 7);
    type('s cat');
    expect(matches('b')).toEqual(['cat', 'cat']);
    expect(status()).toHaveTextContent('1 of 4');
  });

  it('announces the count once typing rests', () => {
    vi.useFakeTimers();
    const { fill } = openOn();
    fill('Find', 'c');
    fill('Find', 'ca');
    fill('Find', 'cat');
    expect(announced()).toBe('');
    act(() => void vi.advanceTimersByTime(600));
    expect(announced()).toBe('1 of 3');
  });

  it('finds without replacing on a read-only canvas', () => {
    const { fill, panel, matches } = openOn(DOC, {}, { readOnly: true });
    expect(panel()).not.toBeNull();
    fill('Find', 'cat');
    expect(matches('a')).toHaveLength(2);
    expect(screen.queryByRole('textbox', { name: 'Replace with' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Replace' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Replace all' })).toBeNull();
  });

  it('takes host labels', () => {
    openOn(DOC, { labels: { findAndReplace: 'Rechercher', find: 'Texte' } });
    expect(screen.getByRole('search', { name: 'Rechercher' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Texte' })).toBeInTheDocument();
  });

  it('has no axe violations with results, without, and with an invalid pattern', async () => {
    const { fill, button, panel } = openOn();
    fill('Find', 'cat');
    expect(await axe(panel()!)).toHaveNoViolations();
    fill('Find', 'dog');
    expect(await axe(panel()!)).toHaveNoViolations();
    act(() => button('Regular expression').click());
    fill('Find', '(');
    expect(await axe(panel()!)).toHaveNoViolations();
  });

  it('has no axe violations read-only', async () => {
    const { fill, panel } = openOn(DOC, {}, { readOnly: true });
    fill('Find', 'cat');
    expect(await axe(panel()!)).toHaveNoViolations();
  });
});
