import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { blockRangeSelection, nodeSelection, textSelection, type Selection } from '../../engine';
import { clipboardEvent, fakeTransfer } from '../clipboard/test-transfer';
import type { ViewController } from '../controller/view-controller';
import { Editor, hostOf, md } from '../react/test-harness';

const at = (block: string, offset: number) => ({ block, region: 'text', offset });

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

function mount(blocks = [md('a', 'hello'), md('b', 'mid'), md('c', 'world')]) {
  let controller!: ViewController;
  const { container } = render(<Editor options={{ blocks, onChange: () => {} }} onController={(c) => (controller = c)} />);
  const sink = container.querySelector<HTMLElement>('[data-quoin-sink]')!;
  const select = (selection: Selection) =>
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(selection)));
  act(() => controller.focus(at('a', 1)));
  return { controller, container, sink, select };
}

describe('a block range in the sink', () => {
  it('moves focus into the sink, which holds the blocks text and has it selected natively', () => {
    const { sink, select } = mount();
    select(blockRangeSelection('a', 'c'));
    expect(document.activeElement).toBe(sink);
    expect(sink.textContent).toBe('hello\nmid\nworld');
    const selection = document.getSelection()!;
    expect(selection.isCollapsed).toBe(false);
    expect(selection.toString()).toBe('hello\nmid\nworld');
    expect(sink).toHaveAttribute('tabindex', '0');
  });

  it('keeps the text and its selection in step as the range changes', () => {
    const { sink, select } = mount();
    select(blockRangeSelection('a', 'c'));
    document.getSelection()!.collapseToStart();
    select(blockRangeSelection('b', 'c'));
    expect(sink.textContent).toBe('mid\nworld');
    expect(document.getSelection()!.toString()).toBe('mid\nworld');
  });

  it('still selects something natively when the blocks have no text', () => {
    const { sink, select } = mount([md('a', 'hello'), { id: 'd', type: 'DIVIDER', data: {} }]);
    select(blockRangeSelection('d'));
    expect(document.activeElement).toBe(sink);
    expect(document.getSelection()!.isCollapsed).toBe(false);
  });

  it('is copied from the sink as the editor copies the blocks', () => {
    const { sink, select } = mount();
    select(blockRangeSelection('a', 'b'));
    const { transfer, store } = fakeTransfer();
    const event = clipboardEvent('copy', transfer);
    act(() => void sink.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(store.get('text/plain')).toBe('hello\n\nmid');
  });

  it('replaces the blocks with a paragraph holding the text typed into the sink', () => {
    const { controller, sink, select } = mount();
    select(blockRangeSelection('a', 'c'));
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data: 'X', bubbles: true, cancelable: true });
    act(() => void sink.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(controller.editor.getBlocks().map((block) => block.data.markdown)).toEqual(['X']);
  });

  it('empties the sink and hands focus back to a host when the range becomes a caret', () => {
    const { sink, container, select } = mount();
    select(blockRangeSelection('a', 'c'));
    select(textSelection(at('b', 1)));
    expect(sink.textContent).toBe('');
    expect(document.activeElement).toBe(hostOf(container, 'b'));
    expect(hostOf(container, 'b').contains(document.getSelection()!.anchorNode)).toBe(true);
  });

  it('leaves the sink empty for a node selection, which stays on its shell', () => {
    const { sink, container, select } = mount([md('a', 'hello'), { id: 'd', type: 'DIVIDER', data: {} }]);
    select(blockRangeSelection('a', 'd'));
    select(nodeSelection('d'));
    expect(sink.textContent).toBe('');
    expect(document.activeElement).toBe(container.querySelector('[data-block-id="d"]'));
  });
});
