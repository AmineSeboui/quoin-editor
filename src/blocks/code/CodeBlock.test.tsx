import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { nodeSelection } from '../../engine';
import type { QuoinBlock } from '../../types';
import { mountCanvas, paragraph } from '../void/test-canvas';
import type { CodeHighlighter } from './code-highlighter';

const code = (id: string, value: string, language = 'ts'): QuoinBlock => ({ id, type: 'CODE', data: { language, code: value } });
const area = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Code' });

function caret(start: number, end = start) {
  act(() => {
    area().focus();
    area().setSelectionRange(start, end);
  });
}

const keywords: CodeHighlighter = (text) =>
  text.split('\n').map((line) => line.split(/(let)/).filter(Boolean).map((part) => (part === 'let' ? { text: part, color: 'rgb(0, 0, 255)' } : { text: part })));

describe('the code block', () => {
  it('draws its code in a text area, in a group named after the block, with no editor to open', () => {
    mountCanvas([code('k', 'let a = 1;')]);
    const group = screen.getByRole('group', { name: 'Code' });
    expect(within(group).getByRole('textbox', { name: 'Code' })).toHaveValue('let a = 1;');
    expect(within(group).queryByRole('button', { name: /^Edit/ })).toBeNull();
    expect(group.querySelector('pre')).toHaveAttribute('aria-hidden', 'true');
  });

  it('writes what is typed to data.code and keeps the data to its language and its code', () => {
    const { last } = mountCanvas([code('k', 'let a = 1;')]);
    fireEvent.change(area(), { target: { value: 'let b = 2;' } });
    expect(last()).toEqual([code('k', 'let b = 2;')]);
    expect(area()).toHaveValue('let b = 2;');
  });

  it('takes the block as the selected one when the code takes focus', () => {
    const { selection } = mountCanvas([paragraph('a', 'above'), code('k', 'x')]);
    caret(1);
    expect(selection()).toEqual(nodeSelection('k'));
  });

  it('indents the selected lines on Tab and outdents them on Shift+Tab, keeping the selection on the same text', () => {
    const { last } = mountCanvas([code('k', 'a\nb')]);
    caret(0, 3);
    expect(fireEvent.keyDown(area(), { key: 'Tab' })).toBe(false);
    expect(last()[0].data).toEqual({ language: 'ts', code: '  a\n  b' });
    expect([area().selectionStart, area().selectionEnd]).toEqual([0, 7]);
    fireEvent.keyDown(area(), { key: 'Tab', shiftKey: true });
    expect(last()[0].data).toEqual({ language: 'ts', code: 'a\nb' });
  });

  it('puts two spaces at the caret on Tab, and starts a new line at the indentation of the last on Enter', () => {
    const { last } = mountCanvas([code('k', 'if (a) {')]);
    caret(8);
    fireEvent.keyDown(area(), { key: 'Enter' });
    fireEvent.keyDown(area(), { key: 'Tab' });
    fireEvent.keyDown(area(), { key: 'Enter' });
    expect(last()[0].data.code).toBe('if (a) {\n  \n  ');
    expect(area().selectionStart).toBe(14);
  });

  it('scrolls the caret into view after the keys it handles, which the browser leaves where it was', () => {
    const scrolled = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    try {
      mountCanvas([code('k', 'a')]);
      caret(1);
      fireEvent.keyDown(area(), { key: 'Enter' });
      fireEvent.keyDown(area(), { key: 'Tab' });
      const marks = scrolled.mock.contexts as HTMLElement[];
      expect(marks).toHaveLength(2);
      expect(marks.every((mark) => mark.getAttribute('aria-hidden') === 'true' && area().parentElement!.contains(mark))).toBe(true);
      expect(scrolled).toHaveBeenLastCalledWith({ block: 'nearest', inline: 'nearest' });
    } finally {
      scrolled.mockRestore();
    }
  });

  it('draws the tokens of the host highlighter in their colours under the text', () => {
    mountCanvas([code('k', 'let a;\nlet b;')], { highlight: keywords });
    const tokens = screen.getByRole('group', { name: 'Code' }).querySelectorAll('pre span');
    expect([...tokens].map((token) => [token.textContent, (token as HTMLElement).style.color])).toEqual([
      ['let', 'rgb(0, 0, 255)'],
      [' a;', ''],
      ['let', 'rgb(0, 0, 255)'],
      [' b;', ''],
    ]);
  });

  it('copies its code from the copy button and says it did', async () => {
    const user = userEvent.setup();
    mountCanvas([code('k', 'let a = 1;\nlet b = 2;')]);
    await user.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(await navigator.clipboard.readText()).toBe('let a = 1;\nlet b = 2;');
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('shows a check on the copy button for a moment once the code is copied', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
    vi.useFakeTimers();
    try {
      mountCanvas([code('k', 'let a;')]);
      const copy = screen.getByRole('button', { name: 'Copy code' });
      await act(async () => void fireEvent.click(copy));
      expect(copy.querySelector('.lucide-check')).not.toBeNull();
      act(() => void vi.advanceTimersByTime(1500));
      expect(copy.querySelector('.lucide-check')).toBeNull();
      expect(copy.querySelector('.lucide-copy')).not.toBeNull();
    } finally {
      vi.useRealTimers();
      Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('draws only the highlighted code, its language and the copy button on a read-only canvas', () => {
    mountCanvas([code('k', 'let a;')], { readOnly: true, highlight: keywords });
    const group = screen.getByRole('group', { name: 'Code' });
    expect(within(group).queryByRole('textbox')).toBeNull();
    expect(within(group).queryByRole('combobox')).toBeNull();
    expect(group.querySelector('pre')).not.toHaveAttribute('aria-hidden');
    expect(group.querySelector('pre span')).toHaveStyle({ color: 'rgb(0, 0, 255)' });
    expect(group).toHaveTextContent('TypeScript');
    expect(within(group).getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
  });

  it('lets a keyboard scroll the code and reach the copy button on a read-only canvas', () => {
    mountCanvas([code('k', 'let a;'), code('p', 'x', '')], { readOnly: true });
    const [named, plain] = screen.getAllByRole('region');
    expect(named).toHaveAccessibleName('TypeScript');
    expect(plain).toHaveAccessibleName('Code');
    expect(named).toHaveAttribute('tabindex', '0');
    expect(named.querySelector('pre')).toHaveTextContent('let a;');
    for (const copy of screen.getAllByRole('button', { name: 'Copy code' })) expect(copy).not.toHaveAttribute('tabindex');
  });

  it('keeps the editor its one tab stop on an editable canvas', () => {
    mountCanvas([code('k', 'let a;')]);
    expect(screen.queryByRole('region')).toBeNull();
    expect(area()).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('button', { name: 'Copy code' })).toHaveAttribute('tabindex', '-1');
  });

  it('opens on Enter when node-selected, with focus in its code', () => {
    const { nodeSelect, press } = mountCanvas([paragraph('a', 'above'), code('k', 'x')]);
    nodeSelect('k');
    press('Enter');
    expect(document.activeElement).toBe(area());
  });

  it('moves focus to its language on Alt+F10', () => {
    mountCanvas([code('k', 'x')]);
    caret(1);
    fireEvent.keyDown(area(), { key: 'F10', altKey: true });
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Language' }));
  });

  it('has no accessibility violations, at rest or with its code focused', async () => {
    const { container } = mountCanvas([paragraph('a', 'above'), code('k', 'let a;'), code('e', '', '')]);
    expect(await axe(container)).toHaveNoViolations();
    act(() => screen.getAllByRole('textbox', { name: 'Code' })[0].focus());
    expect(await axe(container)).toHaveNoViolations();
  });
});
