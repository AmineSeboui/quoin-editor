import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Star } from 'lucide-react';
import { axe } from 'vitest-axe';
import { mountCanvas, paragraph } from '../blocks/void/test-canvas';
import { defineExtension, textSelection } from '../engine';
import type { ExtensionUI } from '../extensions/ui-types';
import type { QuoinBlock } from '../types';
import { md } from '../view/react/test-harness';

const callout = (id: string, data: Record<string, unknown>): QuoinBlock => ({ id, type: 'CALLOUT', data });

function setup(blocks: QuoinBlock[] = [paragraph('a', '## Title'), paragraph('b', 'para')]) {
  const onDelete = vi.fn();
  const canvas = mountCanvas(blocks, { onDelete });
  const openMenuFromText = (block: string) => {
    act(() => canvas.handle().focus({ block, region: block === 'c' ? 'body' : 'text', offset: 0 }));
    fireEvent.keyDown(document.activeElement!, { key: '/', ctrlKey: true });
  };
  return { ...canvas, onDelete, openMenuFromText };
}

const menu = () => screen.getByRole('menu');
const item = (name: string) => within(menu()).getByRole('menuitem', { name });

// Without layout, Radix reads the pointer's way from a submenu trigger to its items as leaving both and closes the
// submenu, so its items are chosen without moving the pointer.
const choose = (row: HTMLElement) => act(() => void fireEvent.click(row));

function visibleText(element: Element): string {
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('[aria-hidden="true"]').forEach((hidden) => hidden.remove());
  return copy.textContent?.trim() ?? '';
}

describe('the block menu', () => {
  it('opens with Mod+/ on the block holding the caret, headed by its type', () => {
    const { openMenuFromText } = setup([paragraph('x', 'intro'), paragraph('y', '## Title')]);
    expect(screen.queryByRole('menu')).toBeNull();
    openMenuFromText('y');
    expect(menu()).toHaveAccessibleName('Heading 2 block menu');
    expect(within(menu()).getByText('Heading 2')).toBeInTheDocument();
  });

  it('turns the block into another type', async () => {
    const user = userEvent.setup();
    const { last, openMenuFromText } = setup();
    openMenuFromText('a');
    await user.click(item('Turn into'));
    choose(screen.getByRole('menuitem', { name: 'Heading 3' }));
    expect(last()[0].data.markdown).toBe('### Title');
  });

  it('offers to turn a block into code only on a canvas that draws code blocks', async () => {
    const user = userEvent.setup();
    setup().openMenuFromText('a');
    await user.click(item('Turn into'));
    expect(screen.getByRole('menuitem', { name: 'Code' })).toBeInTheDocument();
    cleanup();
    const canvas = mountCanvas([paragraph('a', 'Title')], { blockTypes: [] });
    act(() => canvas.handle().focus({ block: 'a', region: 'text', offset: 0 }));
    fireEvent.keyDown(document.activeElement!, { key: '/', ctrlKey: true });
    await user.click(item('Turn into'));
    expect(screen.getByRole('menuitem', { name: 'Quote' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Code' })).toBeNull();
  });

  it('duplicates the block', async () => {
    const user = userEvent.setup();
    const { last, openMenuFromText } = setup();
    openMenuFromText('a');
    await user.click(item('Duplicate'));
    expect(last().map((block) => block.data.markdown)).toEqual(['## Title', '## Title', 'para']);
  });

  it('offers the items extensions add before Delete, and runs them on the menu blocks', async () => {
    const user = userEvent.setup();
    const run = vi.fn();
    const ui: ExtensionUI = { blockMenuItems: [{ id: 'star', label: 'Star', icon: Star, run }] };
    const canvas = mountCanvas([paragraph('a', 'one')], { extensions: [defineExtension({ name: 'stars', ui })] });
    act(() => canvas.handle().focus('start'));
    fireEvent.keyDown(document.activeElement!, { key: '/', ctrlKey: true });
    const names = within(menu()).getAllByRole('menuitem').map(visibleText);
    expect(names.slice(-3)).toEqual(['Copy link to block', 'Star', 'Delete']);
    await user.click(item('Star'));
    expect(run).toHaveBeenCalledWith(canvas.handle().controller, ['a']);
  });

  it('colours the text of the block, with a check on the current colour', async () => {
    const user = userEvent.setup();
    const { last, openMenuFromText } = setup();
    openMenuFromText('a');
    await user.click(item('Color'));
    const textColors = screen.getByRole('group', { name: 'Text color' });
    expect(within(textColors).getByRole('menuitemradio', { name: 'Default' })).toHaveAttribute('aria-checked', 'true');
    choose(within(textColors).getByRole('menuitemradio', { name: 'Red' }));
    expect(last()[0].data.color).toBe('red');
    openMenuFromText('a');
    await user.click(item('Color'));
    const checked = within(screen.getByRole('group', { name: 'Text color' })).getByRole('menuitemradio', { name: 'Red' });
    expect(checked).toHaveAttribute('aria-checked', 'true');
  });

  it('deletes the block and reports it', async () => {
    const user = userEvent.setup();
    const { last, onDelete, openMenuFromText } = setup();
    openMenuFromText('a');
    await user.click(item('Delete'));
    expect(last().map((block) => block.id)).toEqual(['b']);
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(paragraph('a', '## Title'), 0));
  });

  it('names every item starting with the text it shows', () => {
    const { openMenuFromText } = setup();
    openMenuFromText('a');
    const items = within(menu()).getAllByRole('menuitem');
    expect(items.length).toBeGreaterThan(5);
    for (const entry of items) {
      const shown = visibleText(entry);
      expect(shown).not.toBe('');
      expect(entry).toHaveAccessibleName(new RegExp(`^${shown.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    }
  });

  it('has no accessibility violations while open', async () => {
    const { openMenuFromText } = setup();
    openMenuFromText('a');
    await act(async () => {});
    expect(await axe(menu())).toHaveNoViolations();
  });

  it('gives focus back to the text once an action ran', async () => {
    const user = userEvent.setup();
    const { last, openMenuFromText, selection } = setup();
    openMenuFromText('b');
    await user.click(item('Move up'));
    expect(last().map((block) => block.id)).toEqual(['b', 'a']);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Paragraph' })).toHaveFocus();
    expect(selection()).toEqual(textSelection({ block: 'b', region: 'text', offset: 0 }));
  });
});

describe('the style rows of the block menu', () => {
  it('turn the block into another type and leave the blocks nested under it as they were', async () => {
    const user = userEvent.setup();
    const toggle: QuoinBlock = { id: 't', type: 'TOGGLE', data: { markdown: 'Summary', open: true } };
    const { last, handle } = setup([toggle, md('h', '## Child', 1)]);
    act(() => handle().focus({ block: 't', region: 'text', offset: 0 }));
    fireEvent.keyDown(document.activeElement!, { key: '/', ctrlKey: true });
    await user.click(item('Turn into'));
    choose(screen.getByRole('menuitem', { name: 'Text' }));
    expect(last().map((block) => block.data.markdown)).toEqual(['Summary', '## Child']);
  });

  it('colour the block and leave the blocks nested under it uncoloured', async () => {
    const user = userEvent.setup();
    const { last, openMenuFromText } = setup([md('p', '- parent'), md('c', '- child', 1)]);
    openMenuFromText('p');
    await user.click(item('Color'));
    choose(within(screen.getByRole('group', { name: 'Text color' })).getByRole('menuitemradio', { name: 'Red' }));
    expect(last().map((block) => block.data.color)).toEqual(['red', undefined]);
  });
});

describe('the block menu of a callout', () => {
  it('offers its Tone and Icon submenus when blocks are nested under it', () => {
    const { openMenuFromText } = setup([callout('c', { tone: 'info', body: 'Note' }), md('n', 'nested', 1)]);
    openMenuFromText('c');
    expect(item('Tone')).toBeInTheDocument();
    expect(item('Icon')).toBeInTheDocument();
  });

  it('sets the tone from the keyboard alone, then gives the caret back to the callout', async () => {
    const user = userEvent.setup();
    const { last, openMenuFromText } = setup([callout('c', { tone: 'info', body: 'Note' })]);
    openMenuFromText('c');
    expect(item('Turn into')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(item('Tone')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(screen.getByRole('menuitemradio', { name: 'info' })).toHaveFocus());
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
    expect(last()[0].data).toMatchObject({ tone: 'danger', body: 'Note' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Callout, danger' })).toHaveFocus();
  });

  it('picks an icon from its Icon submenu', async () => {
    const user = userEvent.setup();
    const { last, openMenuFromText } = setup([callout('c', { tone: 'warning', body: 'Careful' })]);
    openMenuFromText('c');
    await user.click(item('Icon'));
    choose(screen.getByRole('menuitem', { name: '\u{1F4CC}' }));
    expect(last()[0].data).toMatchObject({ tone: 'warning', icon: '\u{1F4CC}' });
  });

  it('offers no Tone or Icon submenu once a target is not a callout', () => {
    const { openMenuFromText } = setup();
    openMenuFromText('a');
    expect(within(menu()).queryByRole('menuitem', { name: 'Tone' })).toBeNull();
    expect(within(menu()).queryByRole('menuitem', { name: 'Icon' })).toBeNull();
  });
});
