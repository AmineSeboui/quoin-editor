import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountCanvas, paragraph } from '../blocks/void/test-canvas';
import { blockRangeSelection } from '../engine';
import type { QuoinBlock } from '../types';

const divider = (id: string): QuoinBlock => ({ id, type: 'DIVIDER', data: {} });
const closedToggle = (id: string): QuoinBlock => ({ id, type: 'TOGGLE', data: { markdown: 'Summary', open: false } });
const nested = (id: string, markdown: string): QuoinBlock => ({ ...paragraph(id, markdown), indent: 1 });

const status = () => screen.getByRole('status');

const png = new File(['png'], 'cat.png', { type: 'image/png' });
const stored = async (file: File) => ({ storageKey: `key/${file.name}`, filename: file.name, size: file.size });

function type(text: string): void {
  for (const data of text) {
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
    fireEvent(document.activeElement!, event);
  }
}

function setup(blocks: QuoinBlock[], props: Parameters<typeof mountCanvas>[1] = {}) {
  const canvas = mountCanvas(blocks, props);
  const caret = (block: string, offset = 0) => act(() => canvas.handle().focus({ block, region: 'text', offset }));
  const key = (init: KeyboardEventInit) => act(() => void fireEvent.keyDown(document.activeElement!, init));
  return { ...canvas, caret, key };
}

afterEach(() => vi.restoreAllMocks());

describe('the canvas announces a block move', () => {
  it('made with Mod+Shift+ArrowDown, with the final position', () => {
    const { caret, key } = setup([paragraph('a', 'one'), paragraph('b', 'two'), paragraph('c', 'three')]);
    caret('a');
    key({ key: 'ArrowDown', ctrlKey: true, shiftKey: true });
    expect(status()).toHaveTextContent('Block moved to position 2 of 3');
  });

  it('counting only the blocks it draws', () => {
    const blocks = [paragraph('a', 'one'), closedToggle('g'), nested('h', 'hidden'), paragraph('c', 'three')];
    const { caret, key, handle } = setup(blocks);
    caret('a');
    key({ key: 'ArrowDown', ctrlKey: true, shiftKey: true });
    expect(handle().editor.getBlocks().map((block) => block.id)).toEqual(['g', 'h', 'a', 'c']);
    expect(status()).toHaveTextContent('Block moved to position 2 of 3');
  });

  it('made from the block menu', async () => {
    const user = userEvent.setup();
    const { caret, key } = setup([paragraph('a', 'one'), paragraph('b', 'two')]);
    caret('b');
    key({ key: '/', ctrlKey: true });
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Move up' }));
    expect(status()).toHaveTextContent('Block moved to position 1 of 2');
  });
});

describe('the canvas announces a block deletion with the way to undo it', () => {
  it('from the block menu', async () => {
    const user = userEvent.setup();
    const { caret, key } = setup([paragraph('a', 'one'), paragraph('b', 'two')]);
    caret('b');
    key({ key: '/', ctrlKey: true });
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Delete' }));
    expect(status()).toHaveTextContent('Block deleted. Press Ctrl+Z to undo');
  });

  it('of a node-selected block, naming the shortcut of a Mac there', () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    const { nodeSelect, key } = setup([paragraph('a', 'one'), divider('d'), paragraph('b', 'two')]);
    nodeSelect('d');
    key({ key: 'Backspace' });
    expect(status()).toHaveTextContent('Block deleted. Press \u2318Z to undo');
  });

  it('counting the drawn blocks a block range takes with it', () => {
    const blocks = [paragraph('a', 'one'), closedToggle('g'), nested('h', 'hidden'), paragraph('b', 'two'), paragraph('c', 'three')];
    const { handle, key } = setup(blocks);
    act(() => {
      const { controller } = handle();
      controller.dispatch(controller.editor.createTransaction().setSelection(blockRangeSelection('g', 'b')));
      handle().focus();
    });
    key({ key: 'Backspace' });
    expect(handle().editor.getBlocks().map((block) => block.id)).toEqual(['a', 'c']);
    expect(status()).toHaveTextContent('2 blocks deleted. Press Ctrl+Z to undo');
  });

  it('but says nothing when Backspace joins a line to the one above', () => {
    const { caret, key, handle } = setup([paragraph('a', 'one'), paragraph('b', 'two')]);
    caret('b');
    key({ key: 'Backspace' });
    expect(handle().editor.getBlocks()).toHaveLength(1);
    expect(status()).toBeEmptyDOMElement();
  });
});

describe('the canvas announces a block insert with the final position', () => {
  it('of a copy made with Mod+D', () => {
    const { caret, key } = setup([paragraph('a', 'one'), paragraph('b', 'two'), paragraph('c', 'three')]);
    caret('a');
    key({ key: 'd', ctrlKey: true });
    expect(status()).toHaveTextContent('Block inserted at position 2 of 4');
  });

  it('of a copy made from the block menu, counting only the blocks it draws', async () => {
    const user = userEvent.setup();
    const { caret, key, handle } = setup([closedToggle('g'), nested('h', 'hidden'), paragraph('a', 'one')]);
    caret('a');
    key({ key: '/', ctrlKey: true });
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Duplicate' }));
    expect(handle().editor.getBlocks()).toHaveLength(4);
    expect(status()).toHaveTextContent('Block inserted at position 3 of 3');
  });

  it('of a divider a slash command puts after the line, not of the empty line it adds for the caret', () => {
    const { caret, key, handle } = setup([paragraph('a', 'one'), paragraph('b', 'two')]);
    caret('a', 3);
    type(' /divider');
    key({ key: 'Enter' });
    const types = handle().editor.getBlocks().map((block) => block.type);
    expect(types).toEqual(['MARKDOWN', 'DIVIDER', 'MARKDOWN', 'MARKDOWN']);
    expect(status()).toHaveTextContent('Block inserted at position 2 of 4');
  });

  it('of a divider a slash command puts above the empty line it was chosen on', () => {
    const { caret, key, handle } = setup([paragraph('a', 'one'), paragraph('e', '')]);
    caret('e');
    type('/divider');
    key({ key: 'Enter' });
    expect(handle().editor.getBlocks().map((block) => block.type)).toEqual(['MARKDOWN', 'DIVIDER', 'MARKDOWN']);
    expect(status()).toHaveTextContent('Block inserted at position 2 of 3');
  });

  it('of the paragraph the gutter + adds', async () => {
    const user = userEvent.setup();
    const { caret } = setup([paragraph('a', 'one'), paragraph('b', 'two')]);
    caret('a');
    await user.click(screen.getByRole('button', { name: 'Add block below' }));
    expect(status()).toHaveTextContent('Block inserted at position 2 of 3');
  });

  it('of uploaded files', async () => {
    const { handle } = setup([paragraph('a', 'one')], { upload: stored });
    act(() => handle().controller.onFiles?.([png], { block: 'a', region: 'text', offset: 1 }));
    await waitFor(() => expect(status()).toHaveTextContent('Block inserted at position 2 of 2'));
  });

  it('but says nothing when Enter opens a line', () => {
    const { caret, key, handle } = setup([paragraph('a', 'one')]);
    caret('a');
    key({ key: 'Enter' });
    expect(handle().editor.getBlocks()).toHaveLength(2);
    expect(status()).toBeEmptyDOMElement();
  });
});
