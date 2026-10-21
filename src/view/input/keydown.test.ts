import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { createElement } from 'react';
import type { QuoinBlock, Selection } from '../../engine';
import { createEditor } from '../../engine/extension/editor';
import { blockRangeSelection, nodeSelection, textSelection } from '../../engine/state/selection';
import { Editor, hostOf, md } from '../react/test-harness';
import { ViewController } from '../controller/view-controller';
import { handleKeydown } from './keydown';

const key = (key: string, init: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true, ...init });

function setup() {
  const editor = createEditor({ blocks: [{ id: 'a', type: 'MARKDOWN', data: { markdown: '- a' } }, { id: 'b', type: 'MARKDOWN', data: { markdown: '- b' } }], isMac: false });
  const controller = new ViewController({ editor });
  return { editor, controller };
}

describe('handleKeydown', () => {
  it('runs interceptors first and stops when one handles the key', () => {
    const { controller } = setup();
    controller.keyInterceptors.add((e) => e.key === 'Enter');
    const event = key('Enter');
    handleKeydown(controller, event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('indents with Tab in text and leaves Tab alone for a block range', () => {
    const { editor, controller } = setup();
    controller.dispatch(editor.createTransaction().setSelection(textSelection({ block: 'b', region: 'text', offset: 0 })));
    const tab = key('Tab');
    handleKeydown(controller, tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(editor.getBlocks()[1].indent).toBe(1);
    controller.dispatch(editor.createTransaction().setSelection(blockRangeSelection('a', 'b')));
    const leave = key('Tab');
    handleKeydown(controller, leave);
    expect(leave.defaultPrevented).toBe(false);
  });

  it('extends a block range with Shift and the vertical arrows, up to the last block', () => {
    const { editor, controller } = setup();
    controller.dispatch(editor.createTransaction().setSelection(blockRangeSelection('a')));
    const down = key('ArrowDown', { shiftKey: true });
    handleKeydown(controller, down);
    expect(down.defaultPrevented).toBe(true);
    expect(editor.state.selection).toEqual(blockRangeSelection('a', 'b'));
    const past = key('ArrowDown', { shiftKey: true });
    handleKeydown(controller, past);
    expect(past.defaultPrevented).toBe(false);
    handleKeydown(controller, key('ArrowUp', { shiftKey: true }));
    expect(editor.state.selection).toEqual(blockRangeSelection('a', 'a'));
    const plain = key('ArrowDown');
    handleKeydown(controller, plain);
    expect(plain.defaultPrevented).toBe(false);
    expect(editor.state.selection).toEqual(blockRangeSelection('a', 'a'));
  });

  it('ignores keys during composition', () => {
    const { controller } = setup();
    const event = key('Enter', { isComposing: true });
    handleKeydown(controller, event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('handleKeydown across blocks', () => {
  afterEach(() => vi.restoreAllMocks());
  const at = (block: string, offset: number) => ({ block, region: 'text', offset });

  const image: QuoinBlock = { id: 'i', type: 'IMAGE', data: { storageKey: 'k', alt: 'An image' } };

  function mount(blocks: QuoinBlock[] = [md('a', 'one'), { id: 'd', type: 'DIVIDER', data: {} }, md('b', 'two')]) {
    let controller!: ViewController;
    const options = { blocks, onChange: () => {} };
    const { container } = render(createElement(Editor, { options, onController: (c) => (controller = c) }));
    const { editor } = controller;
    const select = (selection: Selection) =>
      act(() => controller.dispatch(editor.createTransaction().setSelection(selection)));
    const press = (name: string, init: KeyboardEventInit = {}) => {
      const event = key(name, init);
      act(() => handleKeydown(controller, event));
      return event.defaultPrevented;
    };
    return { editor, controller, container, select, press };
  }

  it('moves Left and Right across a block edge, node-selecting a void block on the way', () => {
    const { editor, select, press } = mount();
    select(textSelection(at('a', 3)));
    expect(press('ArrowRight')).toBe(true);
    expect(editor.state.selection).toEqual(nodeSelection('d'));
    expect(press('ArrowRight')).toBe(true);
    expect(editor.state.selection).toEqual(textSelection(at('b', 0)));
    expect(press('ArrowLeft')).toBe(true);
    expect(editor.state.selection).toEqual(nodeSelection('d'));
    expect(press('ArrowLeft')).toBe(true);
    expect(editor.state.selection).toEqual(textSelection(at('a', 3)));
  });

  it('leaves Left and Right inside a region, at the document edges and over a range to the browser', () => {
    const { editor, select, press } = mount();
    select(textSelection(at('a', 1)));
    expect(press('ArrowLeft')).toBe(false);
    select(textSelection(at('a', 0)));
    expect(press('ArrowLeft')).toBe(false);
    select(textSelection(at('b', 0), at('b', 3)));
    expect(press('ArrowRight')).toBe(false);
    expect(editor.state.selection).toEqual(textSelection(at('b', 0), at('b', 3)));
  });

  it('moves Up and Down from a node selection to the neighbouring block edges', () => {
    const { editor, select, press } = mount();
    select(nodeSelection('d'));
    expect(press('ArrowDown')).toBe(true);
    expect(editor.state.selection).toEqual(textSelection(at('b', 0)));
    select(nodeSelection('d'));
    expect(press('ArrowUp')).toBe(true);
    expect(editor.state.selection).toEqual(textSelection(at('a', 3)));
  });

  it('skips the blocks a closed toggle hides', () => {
    const { editor, select, press } = mount([
      { id: 't', type: 'TOGGLE', data: { markdown: 'T', open: false } },
      md('c', 'child', 1),
      md('b', 'after'),
    ]);
    select(textSelection(at('t', 1)));
    press('ArrowRight');
    expect(editor.state.selection).toEqual(textSelection(at('b', 0)));
    press('ArrowLeft');
    expect(editor.state.selection).toEqual(textSelection(at('t', 1)));
  });

  it('moves only the head with Shift, over a void block to the next text', () => {
    const { editor, select, press } = mount();
    select(textSelection(at('a', 1), at('a', 3)));
    expect(press('ArrowRight', { shiftKey: true })).toBe(true);
    expect(editor.state.selection).toEqual(textSelection(at('a', 1), at('b', 0)));
  });

  it('forgets the goal column on a horizontal key', () => {
    const { controller, select, press } = mount();
    select(textSelection(at('a', 1)));
    controller.goalX = 40;
    press('ArrowLeft');
    expect(controller.goalX).toBeNull();
  });

  it('leaves arrows with Ctrl or Meta to the keymap', () => {
    const { editor, select, press } = mount();
    select(textSelection(at('a', 3)));
    expect(press('ArrowDown', { ctrlKey: true, shiftKey: true })).toBe(true);
    expect(editor.getBlocks().map((block) => block.id)).toEqual(['d', 'a', 'b']);
    expect(press('ArrowRight', { ctrlKey: true })).toBe(false);
    expect(editor.state.selection).toEqual(textSelection(at('a', 3)));
  });

  describe('Cmd, Ctrl and Alt arrows on a node or block selection', () => {
    const modifiers: [string, KeyboardEventInit][] = [
      ['Meta', { metaKey: true }],
      ['Ctrl', { ctrlKey: true }],
      ['Alt', { altKey: true }],
    ];
    const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

    it.each(modifiers)('%s arrows never reach the browser, which would treat them as history navigation', (_, init) => {
      const { select, press } = mount();
      for (const selection of [nodeSelection('d'), blockRangeSelection('a', 'b')]) {
        for (const name of arrows) {
          select(selection);
          expect(press(name, init), `${name} over ${selection.kind}`).toBe(true);
        }
      }
    });

    it('leaves a node selection where it was for Cmd and Ctrl arrows', () => {
      const { editor, select, press } = mount();
      for (const init of [{ metaKey: true }, { ctrlKey: true }]) {
        for (const name of arrows) {
          select(nodeSelection('d'));
          press(name, init);
          expect(editor.state.selection).toEqual(nodeSelection('d'));
        }
      }
    });

    it('leaves a block range where it was for every modifier arrow', () => {
      const { editor, select, press } = mount();
      for (const [, init] of modifiers) {
        for (const name of arrows) {
          select(blockRangeSelection('a', 'b'));
          press(name, init);
          expect(editor.state.selection).toEqual(blockRangeSelection('a', 'b'));
        }
      }
    });

    it('still moves a node selection with a plain Alt arrow', () => {
      const { editor, select, press } = mount();
      select(nodeSelection('d'));
      expect(press('ArrowRight', { altKey: true })).toBe(true);
      expect(editor.state.selection).toEqual(textSelection(at('b', 0)));
    });

    it('runs the keymap first, so Mod+Shift+Arrow still moves the selected blocks', () => {
      const { editor, select, press } = mount();
      select(nodeSelection('d'));
      expect(press('ArrowUp', { ctrlKey: true, shiftKey: true })).toBe(true);
      expect(editor.getBlocks().map((block) => block.id)).toEqual(['d', 'a', 'b']);
    });

    it('leaves the same keys in text to the browser, where they move the caret by word or line', () => {
      const { select, press } = mount();
      select(textSelection(at('a', 1)));
      for (const name of arrows) expect(press(name, { metaKey: true })).toBe(false);
      for (const name of arrows) expect(press(name, { ctrlKey: true })).toBe(false);
      for (const name of ['ArrowLeft', 'ArrowRight']) expect(press(name, { altKey: true })).toBe(false);
    });

    it('does not swallow a plain arrow, a Tab or a printable key it did not handle itself', () => {
      const { select, press } = mount([md('a', 'one'), { id: 'd', type: 'DIVIDER', data: {} }, md('b', 'two')]);
      select(blockRangeSelection('a', 'b'));
      expect(press('Tab')).toBe(false);
      expect(press('Shift')).toBe(false);
      expect(press('F5', { metaKey: true })).toBe(false);
    });
  });

  it('deletes a node-selected block with Backspace', () => {
    const { editor, select, press } = mount();
    select(nodeSelection('d'));
    expect(press('Backspace')).toBe(true);
    expect(editor.getBlocks().map((block) => block.data.markdown)).toEqual(['one', 'two']);
  });

  it('replaces a node-selected block with a paragraph holding the typed character', () => {
    const { editor, select, press } = mount();
    select(nodeSelection('d'));
    expect(press('x')).toBe(true);
    expect(editor.getBlocks().map((block) => block.data.markdown)).toEqual(['one', 'x', 'two']);
    expect(editor.state.selection).toEqual(textSelection(at(editor.state.doc.blocks[1].id, 1)));
  });

  it('inserts a paragraph after a node-selected block on Enter', () => {
    const { editor, select, press } = mount();
    select(nodeSelection('d'));
    expect(press('Enter')).toBe(true);
    expect(editor.getBlocks().map((block) => block.data.markdown ?? block.type)).toEqual(['one', 'DIVIDER', '', 'two']);
    expect(editor.state.selection).toEqual(textSelection(at(editor.state.doc.blocks[2].id, 0)));
  });

  it('leaves printable keys to beforeinput in text', () => {
    const { select, press } = mount();
    select(textSelection(at('a', 1)));
    expect(press('x')).toBe(false);
  });

  it('node-selects a block drawn without a host for its region, with Left and Right', () => {
    const { editor, container, select, press } = mount([md('a', 'one'), image, md('b', 'two')]);
    select(textSelection(at('a', 3)));
    press('ArrowRight');
    expect(editor.state.selection).toEqual(nodeSelection('i'));
    expect(container.querySelector('[data-block-id="i"]')).toHaveAttribute('data-selected', 'true');
    press('ArrowRight');
    expect(editor.state.selection).toEqual(textSelection(at('b', 0)));
    press('ArrowLeft');
    expect(editor.state.selection).toEqual(nodeSelection('i'));
    press('ArrowLeft');
    expect(editor.state.selection).toEqual(textSelection(at('a', 3)));
  });

  it('node-selects a block drawn without a host for its region, with Up and Down', () => {
    const { editor, select, press } = mount([md('a', ''), image, md('b', '')]);
    select(textSelection(at('a', 0)));
    press('ArrowDown');
    expect(editor.state.selection).toEqual(nodeSelection('i'));
    press('ArrowDown');
    expect(editor.state.selection).toEqual(textSelection(at('b', 0)));
    press('ArrowUp');
    expect(editor.state.selection).toEqual(nodeSelection('i'));
    press('ArrowUp');
    expect(editor.state.selection).toEqual(textSelection(at('a', 0)));
  });

  // jsdom moves the selection into an element it focuses; Chromium and WebKit leave it where it was.
  function keepSelectionOnFocus() {
    const focus = HTMLElement.prototype.focus;
    return vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement, options) {
      const selection = document.getSelection()!;
      const ranges = Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index));
      focus.call(this, options);
      selection.removeAllRanges();
      ranges.forEach((range) => selection.addRange(range));
    });
  }

  it('gets past such a block on the next key, whatever caret the browser kept', () => {
    const { editor, controller, container } = mount([md('a', 'one'), image, md('b', 'two')]);
    keepSelectionOnFocus();
    const sink = container.querySelector<HTMLElement>('[data-quoin-sink]')!;
    const keydown = (target: HTMLElement, name: string) => act(() => void target.dispatchEvent(key(name)));
    act(() => controller.focus(at('a', 3)));
    keydown(hostOf(container, 'a'), 'ArrowRight');
    expect(document.activeElement).toBe(sink);
    keydown(sink, 'ArrowRight');
    expect(editor.state.selection).toEqual(textSelection(at('b', 0)));
    act(() => controller.focus(at('b', 0)));
    keydown(hostOf(container, 'b'), 'ArrowLeft');
    expect(document.activeElement).toBe(sink);
    keydown(sink, 'ArrowLeft');
    expect(editor.state.selection).toEqual(textSelection(at('a', 3)));
  });
});
