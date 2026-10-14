import { describe, expect, it } from 'vitest';
import type { Extension, QuoinBlock } from '../../engine';
import { coreExtensions } from '../../engine/extension/core-extensions';
import { createEditor } from '../../engine/extension/editor';
import { textSelection } from '../../engine/state/selection';
import { ViewController } from '../controller/view-controller';
import { handleKeydown } from './keydown';

const blocks: QuoinBlock[] = [
  { id: 'p', type: 'MARKDOWN', data: { markdown: 'plain' } },
  { id: 't', type: 'MARKDOWN', data: { markdown: '- [ ] job' } },
  { id: 'g', type: 'TOGGLE', data: { markdown: 'Summary', open: true } },
  { id: 'c', type: 'MARKDOWN', data: { markdown: 'child' }, indent: 1 },
];

function setup(isMac = false, extensions?: readonly Extension[]) {
  const editor = createEditor({ blocks, isMac, extensions });
  const controller = new ViewController({ editor, isMac });
  const caret = (block: string, offset = 1) =>
    controller.dispatch(editor.createTransaction().setSelection(textSelection({ block, region: 'text', offset })));
  const press = (init: KeyboardEventInit) => {
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true, ...init });
    handleKeydown(controller, event);
    return event.defaultPrevented;
  };
  const markdown = () => editor.getBlocks().map((block) => block.data.markdown);
  const open = () => editor.state.doc.blocks[2].attrs.open;
  return { editor, controller, caret, press, markdown, open };
}

describe('Mod+Enter', () => {
  it('checks and unchecks the task that holds the caret', () => {
    const { caret, press, markdown } = setup();
    caret('t');
    expect(press({ ctrlKey: true })).toBe(true);
    expect(markdown()[1]).toBe('- [x] job');
    expect(press({ ctrlKey: true })).toBe(true);
    expect(markdown()[1]).toBe('- [ ] job');
  });

  it('closes and opens the toggle that holds the caret', () => {
    const { caret, press, open } = setup();
    caret('g');
    expect(press({ ctrlKey: true })).toBe(true);
    expect(open()).toBe(false);
    expect(press({ ctrlKey: true })).toBe(true);
    expect(open()).toBe(true);
  });

  it('is Cmd+Enter on a Mac, where Ctrl+Enter is left alone', () => {
    const { caret, press, markdown } = setup(true);
    caret('t');
    expect(press({ ctrlKey: true })).toBe(false);
    expect(markdown()[1]).toBe('- [ ] job');
    expect(press({ metaKey: true })).toBe(true);
    expect(markdown()[1]).toBe('- [x] job');
  });

  it('is Ctrl+Enter elsewhere, where Meta+Enter is left alone', () => {
    const { caret, press, markdown } = setup(false);
    caret('t');
    expect(press({ metaKey: true })).toBe(false);
    expect(markdown()[1]).toBe('- [ ] job');
  });

  it('does nothing in a paragraph, and keeps the browser from adding a line there', () => {
    const { editor, caret, press } = setup();
    caret('p');
    const state = editor.state;
    expect(press({ ctrlKey: true })).toBe(true);
    expect(editor.state).toBe(state);
  });

  it('does nothing in a block under a toggle, which is not the toggle itself', () => {
    const { caret, press, open } = setup();
    caret('c');
    expect(press({ ctrlKey: true })).toBe(true);
    expect(open()).toBe(true);
  });

  it('leaves Shift and Alt chords to the keymap and the browser', () => {
    const { caret, press, markdown } = setup();
    caret('t');
    expect(press({ ctrlKey: true, altKey: true })).toBe(false);
    expect(press({ ctrlKey: true, shiftKey: true })).toBe(false);
    expect(markdown()[1]).toBe('- [ ] job');
  });

  it('does not run while composing', () => {
    const { caret, press, controller, markdown } = setup();
    caret('t');
    expect(press({ ctrlKey: true, isComposing: true })).toBe(false);
    expect(press({ ctrlKey: true, keyCode: 229 })).toBe(false);
    controller.composingKey = 'a\u0000text';
    expect(press({ ctrlKey: true })).toBe(false);
    expect(markdown()[1]).toBe('- [ ] job');
  });

  it('yields to a key an extension binds to Mod-Enter', () => {
    let ran = 0;
    const bound: Extension = {
      name: 'send',
      keymap: {
        'Mod-Enter': () => {
          ran += 1;
          return true;
        },
      },
    };
    const { caret, press, markdown } = setup(false, [...coreExtensions(), bound]);
    caret('t');
    expect(press({ ctrlKey: true })).toBe(true);
    expect(ran).toBe(1);
    expect(markdown()[1]).toBe('- [ ] job');
  });
});
