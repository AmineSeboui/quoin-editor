import { createRef, useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Star } from 'lucide-react';
import { axe } from 'vitest-axe';
import { mountCanvas, paragraph } from '../../blocks/void/test-canvas';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../../canvas/canvas-props';
import type * as UiStoreModule from '../../canvas/ui-store';
import type { CanvasUiStore } from '../../canvas/ui-store';
import { defineExtension, textSelection, type Pos } from '../../engine';
import type { ExtensionUI, ToolbarItem } from '../../extensions/ui-types';
import type { QuoinBlock } from '../../types';

const stores = vi.hoisted(() => [] as CanvasUiStore[]);

vi.mock('../../canvas/ui-store', async (importOriginal) => {
  const actual = await importOriginal<typeof UiStoreModule>();
  return {
    ...actual,
    createCanvasUiStore: () => {
      const store = actual.createCanvasUiStore();
      stores.push(store);
      return store;
    },
  };
});

const pos = (block: string, offset: number): Pos => ({ block, region: 'text', offset });

function selectRange(canvas: ReturnType<typeof mountCanvas>, anchor: Pos, head: Pos): void {
  act(() => {
    const { controller } = canvas.handle();
    controller.focus(anchor);
    controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(anchor, head)));
  });
}

function openToolbar(blocks: QuoinBlock[] = [paragraph('a', 'hello world')], props = {}) {
  const canvas = mountCanvas(blocks, props);
  selectRange(canvas, pos('a', 0), pos('a', 5));
  return canvas;
}

const toolbar = () => screen.getByRole('toolbar', { name: 'Text formatting' });
const control = (name: string) => within(toolbar()).getByRole('button', { name });
const markdown = (canvas: ReturnType<typeof mountCanvas>) => canvas.last()?.map((block) => block.data.markdown);
const choose = (item: HTMLElement) => act(() => void fireEvent.click(item));

const withBubbleItem = (item: ToolbarItem) => {
  const ui: ExtensionUI = { bubbleItems: [item] };
  return { extensions: [defineExtension({ name: 'extra', ui })] };
};

describe('the bubble toolbar', () => {
  afterEach(() => vi.restoreAllMocks());

  it('stays away from a collapsed caret', () => {
    const canvas = mountCanvas([paragraph('a', 'hello world')]);
    act(() => canvas.handle().focus(pos('a', 3)));
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  it('offers its controls in order, with the ones extensions add last', () => {
    const run = vi.fn();
    openToolbar(undefined, withBubbleItem({ id: 'star', title: 'Star', icon: Star, run }));
    const names = within(toolbar())
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? button.textContent);
    expect(names).toEqual([
      'Turn into',
      'Bold',
      'Italic',
      'Underline',
      'Strikethrough',
      'Code',
      'Link',
      'Color',
      'Align',
      'Subscript',
      'Superscript',
      'Star',
    ]);
    fireEvent.click(control('Star'));
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ editor: expect.anything() }));
  });

  it('bolds the selected text on click, shows Bold as pressed and keeps the selection in the text', async () => {
    const user = userEvent.setup();
    const canvas = openToolbar();
    expect(control('Bold')).toHaveAttribute('aria-pressed', 'false');
    await user.click(control('Bold'));
    expect(markdown(canvas)).toEqual(['**hello** world']);
    expect(control('Bold')).toHaveAttribute('aria-pressed', 'true');
    expect(canvas.selection()).toEqual(textSelection(pos('a', 0), pos('a', 5)));
    expect(canvas.shell('a').querySelector('[data-quoin-host]')).toHaveFocus();
    await user.click(control('Bold'));
    expect(markdown(canvas)).toEqual(['hello world']);
  });

  it('formats a range across blocks', () => {
    const canvas = mountCanvas([paragraph('a', 'first'), paragraph('b', 'second')]);
    selectRange(canvas, pos('a', 2), pos('b', 3));
    fireEvent.click(control('Italic'));
    expect(markdown(canvas)).toEqual(['fi*rst*', '*sec*ond']);
  });

  it('colours the text and highlights it from the colour menu, and Default takes each away', async () => {
    const user = userEvent.setup();
    const canvas = openToolbar();
    const pick = async (group: string, name: string) => {
      await user.click(control('Color'));
      choose(within(screen.getByRole('group', { name: group })).getByRole('menuitemradio', { name }));
    };
    await pick('Text color', 'Red');
    expect(markdown(canvas)).toEqual(['<span data-color="red">hello</span> world']);
    await pick('Background color', 'Blue');
    expect(markdown(canvas)).toEqual(['<mark data-color="blue"><span data-color="red">hello</span></mark> world']);
    await user.click(control('Color'));
    expect(within(screen.getByRole('group', { name: 'Text color' })).getByRole('menuitemradio', { name: 'Red' })).toBeChecked();
    choose(within(screen.getByRole('group', { name: 'Text color' })).getByRole('menuitemradio', { name: 'Default' }));
    await pick('Background color', 'Default');
    expect(markdown(canvas)).toEqual(['hello world']);
  });

  it('turns the blocks into another type and aligns them, keeping the selection', async () => {
    const user = userEvent.setup();
    const canvas = openToolbar();
    await user.click(control('Turn into'));
    choose(screen.getByRole('menuitem', { name: 'Heading 2' }));
    expect(markdown(canvas)).toEqual(['## hello world']);
    await user.click(control('Align'));
    choose(screen.getByRole('menuitemradio', { name: 'Align center' }));
    expect(canvas.last()[0].data.align).toBe('center');
    expect(canvas.selection()).toEqual(textSelection(pos('a', 0), pos('a', 5)));
  });

  it('opens the link popover from Link', () => {
    stores.length = 0;
    openToolbar();
    const [store] = stores;
    fireEvent.click(control('Link'));
    expect(store.get().linkPopover).toEqual({ open: true });
  });

  it('is one tab stop from the moment it shows, with room above the text so it renders only once', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 300, 200, 20));
    openToolbar();
    const buttons = within(toolbar()).getAllByRole('button');
    expect(buttons.filter((button) => button.tabIndex === 0)).toEqual([buttons[0]]);
  });

  it('is one tab stop that Alt+F10 enters, the arrows walk and Escape leaves with the selection unchanged', () => {
    const canvas = openToolbar();
    const host = canvas.shell('a').querySelector<HTMLElement>('[data-quoin-host]')!;
    const buttons = within(toolbar()).getAllByRole('button');
    expect(buttons.filter((button) => button.tabIndex === 0)).toEqual([buttons[0]]);
    fireEvent.keyDown(host, { key: 'F10', altKey: true });
    expect(buttons[0]).toHaveFocus();
    fireEvent.keyDown(buttons[0], { key: 'ArrowRight' });
    expect(control('Bold')).toHaveFocus();
    expect(buttons.filter((button) => button.tabIndex === 0)).toEqual([control('Bold')]);
    fireEvent.keyDown(control('Bold'), { key: 'ArrowLeft' });
    fireEvent.keyDown(buttons[0], { key: 'ArrowLeft' });
    expect(buttons.at(-1)).toHaveFocus();
    fireEvent.keyDown(buttons.at(-1)!, { key: 'Escape' });
    expect(host).toHaveFocus();
    expect(canvas.selection()).toEqual(textSelection(pos('a', 0), pos('a', 5)));
    expect(toolbar()).toBeInTheDocument();
  });

  it('keeps the same toolbar while the canvas re-renders with new labels', () => {
    const ref = createRef<QuoinEditorHandle>();
    function InlineHost() {
      const [blocks, setBlocks] = useState([paragraph('a', 'hello world')]);
      return <BlockCanvas ref={ref} blocks={blocks} onChange={setBlocks} labels={{ formattingToolbar: 'Text formatting' }} />;
    }
    const { rerender } = render(<InlineHost />);
    act(() => {
      const { controller } = ref.current!;
      controller.focus(pos('a', 0));
      controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(pos('a', 0), pos('a', 5))));
    });
    const drawn = toolbar();
    rerender(<InlineHost />);
    expect(toolbar()).toBe(drawn);
  });

  it("leaves another canvas's toolbar hidden while focus is in this one's toolbar or its menu", async () => {
    const user = userEvent.setup();
    const other = mountCanvas([paragraph('b', 'other words')]);
    selectRange(other, pos('b', 0), pos('b', 5));
    const canvas = openToolbar();
    const host = canvas.shell('a').querySelector<HTMLElement>('[data-quoin-host]')!;
    fireEvent.keyDown(host, { key: 'F10', altKey: true });
    expect(screen.getAllByRole('toolbar', { name: 'Text formatting' })).toHaveLength(1);
    await user.click(control('Turn into'));
    expect(screen.getByRole('menu')).toContainElement(document.activeElement as HTMLElement);
    expect(screen.getAllByRole('toolbar', { hidden: true })).toHaveLength(1);
  });

  it('has no accessibility violations', async () => {
    openToolbar();
    const result = await act(() => axe(toolbar()));
    expect(result).toHaveNoViolations();
  });
});
