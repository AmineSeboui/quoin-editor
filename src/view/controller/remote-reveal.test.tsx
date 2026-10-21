import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { nodeSelection, removeBlocksStep, type QuoinBlock, type Selection, type TransactionOrigin } from '../../engine';
import { Editor, md } from '../react/test-harness';
import type { ViewController } from './view-controller';

const divider = (id: string): QuoinBlock => ({ id, type: 'DIVIDER', data: {} });
const blocks = [md('a', 'hello'), divider('d1'), divider('d2'), md('c', 'world'), md('e', 'end')];
const SCROLLED = 500;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

// jsdom neither lays out nor scrolls, so revealing an element or focusing a host scrolls the page's scroller to the top
// here, as a browser would to bring them into view.
function mountScrolled() {
  const scroller = document.createElement('div');
  const scrollTo = (options: ScrollToOptions) => void (scroller.scrollTop = options.top ?? 0);
  scroller.scrollTo = scrollTo as typeof scroller.scrollTo;
  document.body.appendChild(scroller);
  let controller!: ViewController;
  render(<Editor options={{ blocks, onChange: () => {} }} onController={(c) => (controller = c)} />, {
    container: scroller.appendChild(document.createElement('div')),
  });
  const focus = HTMLElement.prototype.focus;
  vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => void (scroller.scrollTop = 0));
  vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement, options) {
    focus.call(this, options);
    if (options?.preventScroll !== true) scroller.scrollTop = 0;
  });
  const select = (selection: Selection) => {
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(selection)));
    scroller.scrollTop = SCROLLED;
  };
  const remove = (id: string, origin: TransactionOrigin) => {
    const { editor } = controller;
    const tr = editor.createTransaction().setOrigin(origin).setMeta('addToHistory', false);
    act(() => editor.dispatch(tr.step(removeBlocksStep(editor.state.doc.index.get(id)!, 1))));
  };
  return { controller, scroller, select, remove };
}

describe('a change from outside that removes the selected block', () => {
  it.each([
    ['remote', SCROLLED],
    ['command', 0],
  ] as const)('selects its neighbour, which a %s change leaves scrolled to %i', (origin, scrolled) => {
    const { controller, scroller, select, remove } = mountScrolled();
    act(() => controller.focus());
    select(nodeSelection('d1'));
    remove('d1', origin);
    expect(controller.editor.state.selection).toEqual(nodeSelection('d2'));
    expect(scroller.scrollTop).toBe(scrolled);
  });

  it.each([
    ['remote', SCROLLED],
    ['command', 0],
  ] as const)('moves the caret and focus to the next block, which a %s change leaves at %i', (origin, scrolled) => {
    const { controller, scroller, remove } = mountScrolled();
    act(() => controller.focus({ block: 'c', region: 'text', offset: 2 }));
    scroller.scrollTop = SCROLLED;
    remove('c', origin);
    expect(controller.editor.state.selection).toMatchObject({ kind: 'text', head: { block: 'e' } });
    expect(document.activeElement?.closest('[data-block-id="e"]')).not.toBeNull();
    expect(scroller.scrollTop).toBe(scrolled);
  });
});
