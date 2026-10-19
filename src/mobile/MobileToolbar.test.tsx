import { createRef, useState } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { mountCanvas, paragraph, testBlockTypes } from '../blocks/void/test-canvas';
import { BlockCanvas } from '../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../canvas/canvas-props';
import { textSelection, type Pos } from '../engine';
import { defineBlock } from '../registry';

class FakeViewport extends EventTarget {
  offsetTop = 0;
  height = 800;
  width = 400;
}

function stubPointer(coarse: boolean): void {
  vi.stubGlobal('matchMedia', (media: string) => ({
    media,
    matches: (media === '(pointer: coarse)' && coarse) || (media === '(pointer: fine)' && !coarse),
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

const pos = (block: string, offset: number): Pos => ({ block, region: 'text', offset });
const toolbar = () => screen.getByRole('toolbar', { name: 'Editing tools' });
const queryToolbar = () => screen.queryByRole('toolbar', { name: 'Editing tools' });
const control = (name: string) => within(toolbar()).getByRole('button', { name });
const hostOf = (shell: HTMLElement) => shell.querySelector<HTMLElement>('[data-quoin-host]')!;

function editAt(at: Pos, blocks = [paragraph('a', 'hello world')]) {
  const canvas = mountCanvas(blocks);
  act(() => canvas.handle().focus(at));
  return canvas;
}

beforeEach(() => stubPointer(true));
afterEach(() => vi.unstubAllGlobals());

describe('the mobile toolbar', () => {
  it('shows while the editor has focus, with its tools in order and no bubble toolbar', () => {
    const canvas = mountCanvas([paragraph('a', 'hello world')]);
    expect(queryToolbar()).toBeNull();
    act(() => {
      const { controller } = canvas.handle();
      controller.focus(pos('a', 0));
      controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(pos('a', 0), pos('a', 5))));
    });
    const names = within(toolbar())
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? button.textContent);
    expect(names).toEqual([
      'Add block below',
      'Turn into',
      'Bold',
      'Italic',
      'Strikethrough',
      'Code',
      'Link',
      'Indent',
      'Outdent',
      'Undo',
      'Redo',
    ]);
    expect(screen.queryByRole('toolbar', { name: 'Text formatting' })).toBeNull();
  });

  it('goes once focus leaves the editor', () => {
    editAt(pos('a', 0));
    const outside = document.body.appendChild(document.createElement('button'));
    act(() => outside.focus());
    expect(queryToolbar()).toBeNull();
    outside.remove();
  });

  it('is not drawn on a fine pointer, where the bubble toolbar formats', () => {
    stubPointer(false);
    editAt(pos('a', 0));
    expect(queryToolbar()).toBeNull();
  });

  it('is not drawn while read-only', () => {
    const canvas = mountCanvas([paragraph('a', 'hello world')], { readOnly: true });
    act(() => canvas.handle().focus(pos('a', 0)));
    expect(queryToolbar()).toBeNull();
  });

  it('toggles Bold on the selected text and at the caret, keeping focus in the text', async () => {
    const user = userEvent.setup();
    const canvas = editAt(pos('a', 11));
    await user.click(control('Bold'));
    expect(control('Bold')).toHaveAttribute('aria-pressed', 'true');
    expect(hostOf(canvas.shell('a'))).toHaveFocus();
    act(() => {
      const { controller } = canvas.handle();
      controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(pos('a', 0), pos('a', 5))));
    });
    await user.click(control('Bold'));
    expect(canvas.last().map((block) => block.data.markdown)).toEqual(['**hello** world']);
    expect(canvas.selection()).toEqual(textSelection(pos('a', 0), pos('a', 5)));
    expect(hostOf(canvas.shell('a'))).toHaveFocus();
  });

  it('adds a block below the caret and opens the slash menu in it', async () => {
    const user = userEvent.setup();
    const canvas = editAt(pos('a', 3));
    await user.click(control('Add block below'));
    const added = canvas.last()[1];
    expect(added).toMatchObject({ type: 'MARKDOWN', data: { markdown: '/' } });
    expect(canvas.selection()).toEqual(textSelection(pos(added.id, 1)));
    expect(screen.getByRole('listbox', { name: 'Commands' })).toBeInTheDocument();
  });

  it('indents and outdents the block holding the caret, and undoes and redoes', async () => {
    const user = userEvent.setup();
    const canvas = editAt(pos('b', 0), [paragraph('a', 'one'), paragraph('b', 'two')]);
    const indentOfB = () => canvas.last()[1].indent ?? 0;
    await user.click(control('Indent'));
    expect(indentOfB()).toBe(1);
    await user.click(control('Undo'));
    expect(indentOfB()).toBe(0);
    await user.click(control('Redo'));
    expect(indentOfB()).toBe(1);
    await user.click(control('Outdent'));
    expect(indentOfB()).toBe(0);
  });

  it('turns the block into another type', async () => {
    const user = userEvent.setup();
    const canvas = editAt(pos('a', 3));
    await user.click(control('Turn into'));
    act(() => void fireEvent.click(screen.getByRole('menuitem', { name: 'Heading 2' })));
    expect(canvas.last().map((block) => block.data.markdown)).toEqual(['## hello world']);
  });

  it('opens the link popover from Link', async () => {
    const user = userEvent.setup();
    editAt(pos('a', 3));
    await user.click(control('Link'));
    expect(screen.getByRole('textbox', { name: 'Link address' })).toBeInTheDocument();
  });

  it('sits on the bottom edge of the visual viewport, above the keyboard, as it moves', () => {
    const viewport = new FakeViewport();
    vi.stubGlobal('visualViewport', viewport);
    editAt(pos('a', 0));
    expect(toolbar().style).toMatchObject({ top: '800px', width: '400px', transform: 'translateY(-100%)' });
    act(() => {
      viewport.offsetTop = 120;
      viewport.height = 460;
      viewport.dispatchEvent(new Event('resize'));
    });
    expect(toolbar().style).toMatchObject({ top: '580px', width: '400px' });
  });

  it('does not draw the blocks again as the visual viewport moves', () => {
    let drawn = 0;
    const counted = defineBlock<{ n: number }>({
      type: 'COUNTED',
      label: 'Counted',
      icon: () => null,
      preview: () => {
        drawn += 1;
        return <p>counted</p>;
      },
    });
    const viewport = new FakeViewport();
    vi.stubGlobal('visualViewport', viewport);
    const canvas = mountCanvas([paragraph('a', 'one'), { id: 'k', type: 'COUNTED', data: { n: 1 } }], {
      blockTypes: [...testBlockTypes, counted],
    });
    act(() => canvas.handle().focus(pos('a', 0)));
    const before = drawn;
    act(() => {
      viewport.height = 300;
      viewport.dispatchEvent(new Event('resize'));
    });
    expect(toolbar().style.top).toBe('300px');
    expect(drawn).toBe(before);
  });

  it('is one tab stop the arrows walk, and Escape gives focus back to the text', () => {
    const canvas = editAt(pos('a', 3));
    const buttons = within(toolbar()).getAllByRole('button');
    expect(buttons.filter((button) => button.tabIndex === 0)).toEqual([buttons[0]]);
    act(() => buttons[0].focus());
    fireEvent.keyDown(buttons[0], { key: 'ArrowRight' });
    expect(control('Turn into')).toHaveFocus();
    fireEvent.keyDown(control('Turn into'), { key: 'Escape' });
    expect(hostOf(canvas.shell('a'))).toHaveFocus();
    expect(canvas.selection()).toEqual(textSelection(pos('a', 3)));
  });

  it('keeps the same toolbar while the canvas re-renders with new labels', () => {
    const ref = createRef<QuoinEditorHandle>();
    function InlineHost() {
      const [blocks, setBlocks] = useState([paragraph('a', 'hello world')]);
      return <BlockCanvas ref={ref} blocks={blocks} onChange={setBlocks} labels={{ mobileToolbar: 'Editing tools' }} />;
    }
    const { rerender } = render(<InlineHost />);
    act(() => ref.current!.focus(pos('a', 0)));
    const drawn = toolbar();
    rerender(<InlineHost />);
    expect(toolbar()).toBe(drawn);
  });

  it("leaves another canvas's toolbar hidden while focus is in this one's toolbar or its menu", async () => {
    const user = userEvent.setup();
    const other = mountCanvas([paragraph('b', 'other words')]);
    act(() => other.handle().focus(pos('b', 0)));
    editAt(pos('a', 3));
    expect(screen.getAllByRole('toolbar', { name: 'Editing tools' })).toHaveLength(1);
    act(() => control('Bold').focus());
    expect(screen.getAllByRole('toolbar', { name: 'Editing tools' })).toHaveLength(1);
    await user.click(control('Turn into'));
    expect(screen.getByRole('menu')).toContainElement(document.activeElement as HTMLElement);
    expect(screen.getAllByRole('toolbar', { hidden: true })).toHaveLength(1);
  });

  it('has no accessibility violations', async () => {
    editAt(pos('a', 0));
    const result = await act(() => axe(toolbar()));
    expect(result).toHaveNoViolations();
  });
});
