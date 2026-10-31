import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { textSelection, type QuoinBlock } from '../../engine';
import type { ViewController } from '../controller/view-controller';
import { handleKeydown } from '../input/keydown';
import { Editor, md } from '../react/test-harness';

const at = (block: string, offset: number) => ({ block, region: 'text', offset });

afterEach(cleanup);

function mount(isMac: boolean, blocks: QuoinBlock[] = [md('a', 'hello'), md('b', 'mid'), md('c', 'world')]) {
  let controller!: ViewController;
  render(<Editor options={{ blocks, onChange: () => {} }} onController={(c) => (controller = c)} />);
  (controller as { isMac: boolean }).isMac = isMac;
  act(() => controller.focus(at('b', 1)));
  const press = (key: string, init: KeyboardEventInit) => {
    const event = new KeyboardEvent('keydown', { key, ...init, cancelable: true, bubbles: true });
    act(() => handleKeydown(controller, event));
    return event.defaultPrevented;
  };
  return { editor: controller.editor, press };
}

describe('the keys to the edges of the document', () => {
  it('are Command with a vertical arrow on a Mac', () => {
    const { editor, press } = mount(true);
    expect(press('ArrowDown', { metaKey: true })).toBe(true);
    expect(editor.state.selection).toEqual(textSelection(at('c', 5)));
    expect(press('ArrowUp', { metaKey: true })).toBe(true);
    expect(editor.state.selection).toEqual(textSelection(at('a', 0)));
    expect(press('Home', { ctrlKey: true })).toBe(false);
  });

  it('are Control with Home or End elsewhere, with Shift extending from the anchor', () => {
    const { editor, press } = mount(false);
    expect(press('ArrowUp', { ctrlKey: true })).toBe(false);
    expect(press('End', { ctrlKey: true, shiftKey: true })).toBe(true);
    expect(editor.state.selection).toEqual(textSelection(at('b', 1), at('c', 5)));
    expect(press('Home', { ctrlKey: true, shiftKey: true })).toBe(true);
    expect(editor.state.selection).toEqual(textSelection(at('b', 1), at('a', 0)));
    expect(press('End', { ctrlKey: true, altKey: true })).toBe(false);
  });

  it('pass over the blocks a closed toggle hides', () => {
    const toggle: QuoinBlock = { id: 't', type: 'TOGGLE', data: { markdown: 'T', open: false } };
    const { editor, press } = mount(false, [md('a', 'one'), md('b', 'two'), toggle, md('c', 'child', 1)]);
    press('End', { ctrlKey: true });
    expect(editor.state.selection).toMatchObject({ head: { block: 't', offset: 1 } });
  });
});
