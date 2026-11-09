import { afterEach, describe, expect, it, onTestFinished } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { textSelection, type QuoinBlock } from '../../engine';
import type { ViewController } from '../controller/view-controller';
import { Editor, md } from '../react/test-harness';
import { handleKeydown } from './keydown';

const at = (block: string, offset: number) => ({ block, region: 'text', offset });

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('dir');
});

// jsdom has no Range.getClientRects, so no caret has a box and no line is found to move along.
function withoutLayout() {
  Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
  onTestFinished(() => void delete (Range.prototype as Partial<Range>).getClientRects);
}

function mountRightToLeft(blocks: QuoinBlock[] = [md('a', 'hello'), md('b', 'mid'), md('c', 'world')]) {
  document.documentElement.setAttribute('dir', 'rtl');
  let controller!: ViewController;
  render(<Editor options={{ blocks, onChange: () => {} }} onController={(c) => (controller = c)} />);
  const { editor } = controller;
  act(() => controller.focus(at('a', 0)));
  const caretAt = (block: string, offset: number) =>
    act(() => controller.dispatch(editor.createTransaction().setSelection(textSelection(at(block, offset)))));
  const press = (key: string, shiftKey = false) =>
    act(() => void handleKeydown(controller, new KeyboardEvent('keydown', { key, shiftKey, cancelable: true, bubbles: true })));
  return { editor, controller, caretAt, press, head: () => editor.state.selection };
}

/**
 * On a right to left page the text begins at the right edge, so the left arrow walks forward through the document and
 * the right arrow walks back. Both arrows name a side of the screen; only the page says what that side means.
 */
describe('a horizontal arrow at the edge of a block on a right to left page', () => {
  it('leaves the block backwards on the right arrow, towards the text before it', () => {
    withoutLayout();
    const { caretAt, press, head } = mountRightToLeft();
    caretAt('b', 0);
    press('ArrowRight');
    expect(head()).toEqual(textSelection(at('a', 'hello'.length)));
  });

  it('leaves the block forwards on the left arrow, towards the text after it', () => {
    withoutLayout();
    const { caretAt, press, head } = mountRightToLeft();
    caretAt('b', 'mid'.length);
    press('ArrowLeft');
    expect(head()).toEqual(textSelection(at('c', 0)));
  });

  it('stays inside the block where the arrow points into the text rather than out of it', () => {
    withoutLayout();
    const { caretAt, press, head } = mountRightToLeft();
    caretAt('b', 1);
    press('ArrowLeft');
    expect(head()).toEqual(textSelection(at('b', 1)));
  });
});
