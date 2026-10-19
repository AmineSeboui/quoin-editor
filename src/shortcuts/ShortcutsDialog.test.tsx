import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { mountCanvas, paragraph } from '../blocks/void/test-canvas';
import type { BlockCanvasProps } from '../canvas/canvas-props';
import { textSelection } from '../engine';

function type(text: string): void {
  for (const data of text) {
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
    fireEvent(document.activeElement!, event);
  }
}

function openCanvas(props: Partial<Omit<BlockCanvasProps, 'blocks' | 'onChange'>> = {}) {
  const canvas = mountCanvas([paragraph('a', 'Some text'), paragraph('b', '')], props);
  act(() => canvas.handle().focus({ block: 'a', region: 'text', offset: 4 }));
  const host = (id: string) => canvas.shell(id).querySelector<HTMLElement>('[data-quoin-host]')!;
  const press = (init: KeyboardEventInit) => act(() => void fireEvent.keyDown(document.activeElement!, init));
  return { ...canvas, host, press };
}

const dialog = () => screen.getByRole('dialog', { name: 'Keyboard shortcuts' });

function rows(group: string): Record<string, string> {
  const section = within(dialog()).getByRole('heading', { name: group }).closest('section')!;
  const terms = within(section).getAllByRole('term');
  return Object.fromEntries(terms.map((term) => [term.textContent, term.nextElementSibling!.textContent]));
}

afterEach(() => vi.restoreAllMocks());

describe('the keyboard shortcuts dialog', () => {
  it('opens with Mod+Shift+/ from the text and lists the way out of the editor', () => {
    const { press } = openCanvas();
    expect(screen.queryByRole('dialog')).toBeNull();
    press({ key: '/', ctrlKey: true, shiftKey: true });
    expect(rows('Navigation')).toMatchObject({ 'Leave the editor': 'Escape, then Tab' });
  });

  it('opens with the question mark a US keyboard types for Shift and the slash', () => {
    const { press } = openCanvas();
    press({ key: '?', code: 'Slash', ctrlKey: true, shiftKey: true });
    expect(dialog()).toBeInTheDocument();
  });

  it('groups the keyboard model under Text, Blocks, Selection, Navigation and Menus', () => {
    const { press } = openCanvas();
    press({ key: '/', ctrlKey: true, shiftKey: true });
    const headings = within(dialog()).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);
    expect(headings).toEqual(['Text', 'Blocks', 'Selection', 'Navigation', 'Menus']);
    expect(rows('Text')).toMatchObject({ Bold: 'Ctrl+B', 'Line break': 'Shift+Enter', Redo: 'Ctrl+Shift+Z or Ctrl+Y' });
    expect(rows('Blocks')).toMatchObject({
      'Heading 6': 'Ctrl+Alt+6',
      'Move down': 'Ctrl+Shift+\u2193',
      'Split the block': 'Enter',
      'At the start: turn into text, outdent or join the block above': 'Backspace',
      'At the end: join the next block': 'Delete',
    });
    expect(rows('Navigation')).toMatchObject({
      'At the start: end of the previous block': '\u2190',
      'At the end: start of the next block': '\u2192',
    });
    expect(rows('Menus')).toMatchObject({ Commands: '/', 'Keyboard shortcuts': 'Ctrl+Shift+/' });
  });

  it("writes the keys the way a Mac does on a Mac", () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    const { press } = openCanvas();
    press({ key: '/', metaKey: true, shiftKey: true });
    expect(rows('Text')).toMatchObject({ Bold: '\u2318B', Redo: '\u2318\u21E7Z or \u2318Y' });
  });

  it('has no accessibility violations', async () => {
    const { press } = openCanvas();
    press({ key: '/', ctrlKey: true, shiftKey: true });
    expect(await axe(dialog())).toHaveNoViolations();
  });

  it('closes with its Close button and gives focus back to the caret', async () => {
    const user = userEvent.setup();
    const { press, host, selection } = openCanvas();
    press({ key: '/', ctrlKey: true, shiftKey: true });
    await user.click(within(dialog()).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(host('a')).toHaveFocus();
    expect(selection()).toEqual(textSelection({ block: 'a', region: 'text', offset: 4 }));
  });

  it('opens from the slash menu, which takes the slash and its query away first', () => {
    const { handle, last } = openCanvas();
    act(() => handle().focus({ block: 'b', region: 'text', offset: 0 }));
    type('/keyboard');
    const option = within(screen.getByRole('listbox', { name: 'Commands' })).getByRole('option', { selected: true });
    expect(option).toHaveTextContent('Keyboard shortcuts');
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' });
    expect(dialog()).toBeInTheDocument();
    expect(last().map((block) => block.data.markdown)).toEqual(['Some text', '']);
  });

  it('takes its title, its groups, its rows and its Close button from the labels', () => {
    const labels = {
      shortcuts: 'Raccourcis clavier',
      close: 'Fermer',
      bold: 'Gras',
      keySequence: (first: string, then: string) => `${first} puis ${then}`,
      keyNames: { ctrl: 'Ctrl', alt: 'Alt', shift: 'Maj' },
      namedKeys: {
        escape: '\u00C9chap',
        tab: 'Tab',
        enter: 'Entr\u00E9e',
        space: 'Espace',
        backspace: 'Retour arri\u00E8re',
        delete: 'Suppr',
        f10: 'F10',
      },
      shortcutGroupNames: { text: 'Texte', blocks: 'Blocs', selection: 'S\u00E9lection', navigation: 'Navigation', menus: 'Menus' },
    };
    const { press } = openCanvas({ labels });
    press({ key: '/', ctrlKey: true, shiftKey: true });
    const french = screen.getByRole('dialog', { name: 'Raccourcis clavier' });
    expect(within(french).getByRole('button', { name: 'Fermer' })).toBeInTheDocument();
    const section = within(french).getByRole('heading', { name: 'Texte' }).closest('section')!;
    expect(within(section).getByText('Gras')).toBeInTheDocument();
    expect(within(french).getByText('\u00C9chap puis Tab')).toBeInTheDocument();
    expect(within(french).getByText('Line break').nextElementSibling).toHaveTextContent('Maj+Entr\u00E9e');
  });
});
