import { describe, expect, it } from 'vitest';
import type { Selection } from '../../engine';
import { createEditor } from '../../engine/extension/editor';
import { blockRangeSelection, nodeSelection, textSelection } from '../../engine/state/selection';
import { md } from '../react/test-harness';
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

  it('ignores keys during composition', () => {
    const { controller } = setup();
    const event = key('Enter', { isComposing: true });
    handleKeydown(controller, event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('handleKeydown across blocks', () => {
  const at = (block: string, offset: number) => ({ block, region: 'text', offset });

  function mount(blocks = [md('a', 'one'), { id: 'd', type: 'DIVIDER', data: {} }, md('b', 'two')]) {
    const editor = createEditor({ blocks, isMac: false });
    const controller = new ViewController({ editor });
    const select = (selection: Selection) => controller.dispatch(editor.createTransaction().setSelection(selection));
    const press = (name: string, init: KeyboardEventInit = {}) => {
      const event = key(name, init);
      handleKeydown(controller, event);
      return event.defaultPrevented;
    };
    return { editor, controller, select, press };
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
});
