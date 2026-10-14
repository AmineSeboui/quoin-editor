import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { textSelection, type QuoinBlock } from '../../engine';
import type { ViewController } from '../controller/view-controller';
import { handleKeydown } from '../input/keydown';
import { Editor, hostOf, md } from '../react/test-harness';

const at = (block: string, offset: number) => ({ block, region: 'text', offset });

afterEach(cleanup);

function mount(blocks: QuoinBlock[] = [md('a', 'hello'), md('b', 'mid'), md('c', 'world')]) {
  let controller!: ViewController;
  const { container } = render(<Editor options={{ blocks, onChange: () => {} }} onController={(c) => (controller = c)} />);
  const { editor } = controller;
  act(() => controller.focus(at('a', 0)));
  const select = (anchor: ReturnType<typeof at>, head: ReturnType<typeof at>) =>
    act(() => controller.dispatch(editor.createTransaction().setSelection(textSelection(anchor, head))));
  const press = (key: string, shiftKey = false) => {
    const event = new KeyboardEvent('keydown', { key, shiftKey, cancelable: true, bubbles: true });
    act(() => handleKeydown(controller, event));
    return event.defaultPrevented;
  };
  return { editor, container, select, press };
}

describe('arrows on a selection across hosts', () => {
  it('collapse to the start with Left and Up, to the end with Right and Down, and give focus back to that host', () => {
    const { editor, container, select, press } = mount();
    const cases = [
      ['ArrowLeft', at('a', 2)],
      ['ArrowUp', at('a', 2)],
      ['ArrowRight', at('c', 3)],
      ['ArrowDown', at('c', 3)],
    ] as const;
    for (const [key, caret] of cases) {
      select(at('c', 3), at('a', 2));
      expect(press(key)).toBe(true);
      expect(editor.state.selection).toEqual(textSelection(caret));
      expect(document.activeElement).toBe(hostOf(container, caret.block));
    }
  });

  it('move the head one grapheme with Shift+Left and Shift+Right, crossing host edges', () => {
    const { editor, select, press } = mount([md('a', 'hello'), md('b', 'e\u0301x')]);
    select(at('a', 4), at('b', 0));
    press('ArrowRight', true);
    expect(editor.state.selection).toEqual(textSelection(at('a', 4), at('b', 2)));
    press('ArrowLeft', true);
    press('ArrowLeft', true);
    expect(editor.state.selection).toEqual(textSelection(at('a', 4), at('a', 5)));
  });

  it('move the head one host at a time with Shift+Up and Shift+Down, keeping its offset where it fits', () => {
    const { editor, select, press } = mount();
    select(at('a', 4), at('b', 1));
    press('ArrowDown', true);
    expect(editor.state.selection).toEqual(textSelection(at('a', 4), at('c', 1)));
    press('ArrowDown', true);
    expect(editor.state.selection).toEqual(textSelection(at('a', 4), at('c', 5)));
    select(at('a', 4), at('c', 5));
    press('ArrowUp', true);
    expect(editor.state.selection).toEqual(textSelection(at('a', 4), at('b', 3)));
    press('ArrowUp', true);
    expect(editor.state.selection).toEqual(textSelection(at('a', 4), at('a', 3)));
  });
});
