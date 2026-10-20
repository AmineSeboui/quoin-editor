import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { blockRangeSelection, nodeSelection, textSelection, type EngineBlock, type QuoinBlock, type Selection } from '../../engine';
import { clipboardEvent, fakeTransfer } from '../clipboard/test-transfer';
import type { ViewController } from '../controller/view-controller';
import { Editor, hostOf, md } from '../react/test-harness';

const divider: QuoinBlock = { id: 'd', type: 'DIVIDER', data: {} };

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

function mount(blocks = [md('a', 'hello'), divider, md('c', 'world')], blockLabel?: (block: EngineBlock) => string) {
  let controller!: ViewController;
  const view = { blockLabel };
  const { container } = render(
    <Editor options={{ blocks, onChange: () => {} }} view={view} onController={(c) => (controller = c)} />,
  );
  const sink = container.querySelector<HTMLElement>('[data-quoin-sink]')!;
  const shell = (id: string) => container.querySelector<HTMLElement>(`[data-block-id="${id}"]`)!;
  const select = (selection: Selection) =>
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(selection)));
  act(() => controller.focus({ block: 'a', region: 'text', offset: 1 }));
  const types = () => controller.editor.getBlocks().map((block) => block.type);
  return { controller, container, sink, shell, select, types };
}

describe('a node selection in the sink', () => {
  it('moves focus into the sink, with something selected natively, and leaves the block drawn as selected', () => {
    const { sink, shell, select } = mount();
    select(nodeSelection('d'));
    expect(document.activeElement).toBe(sink);
    expect(document.getSelection()!.isCollapsed).toBe(false);
    expect(sink).toHaveAttribute('tabindex', '0');
    expect(shell('d')).toHaveAttribute('data-selected', 'true');
  });

  it('is copied from the sink as the editor copies the block, and cut from it', () => {
    const { sink, select, types } = mount();
    select(nodeSelection('d'));
    const copied = fakeTransfer();
    const copy = clipboardEvent('copy', copied.transfer);
    act(() => void sink.dispatchEvent(copy));
    expect(copy.defaultPrevented).toBe(true);
    expect(JSON.parse(copied.store.get('application/x-quoin+json')!)).toMatchObject({
      slice: { blocks: [{ id: 'd', type: 'DIVIDER' }] },
    });
    expect(types()).toEqual(['MARKDOWN', 'DIVIDER', 'MARKDOWN']);
    act(() => void sink.dispatchEvent(clipboardEvent('cut', fakeTransfer().transfer)));
    expect(types()).toEqual(['MARKDOWN', 'MARKDOWN']);
  });

  it.each(['insertText', 'insertReplacementText'])('ignores %s typed into the sink and keeps the block', (inputType) => {
    const { controller, sink, select, types } = mount();
    select(nodeSelection('d'));
    const event = new InputEvent('beforeinput', { inputType, data: 'X', bubbles: true, cancelable: true });
    act(() => void sink.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(types()).toEqual(['MARKDOWN', 'DIVIDER', 'MARKDOWN']);
    expect(controller.editor.state.selection).toEqual(nodeSelection('d'));
  });

  it('discards a composition over the block', async () => {
    const { controller, sink, select, types } = mount();
    select(nodeSelection('d'));
    act(() => void sink.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })));
    sink.textContent = '\u65e5\u672c';
    act(() => void sink.dispatchEvent(new CompositionEvent('compositionend', { data: '\u65e5\u672c', bubbles: true })));
    await waitFor(() => expect(controller.composingKey).toBeNull());
    expect(types()).toEqual(['MARKDOWN', 'DIVIDER', 'MARKDOWN']);
    expect(controller.editor.state.selection).toEqual(nodeSelection('d'));
  });

  it('is named by the plain text of the selected block, or else by the name the editor gives the block', () => {
    const image = (id: string, alt: string): QuoinBlock => ({ id, type: 'IMAGE', data: { storageKey: 'k', alt } });
    const blocks = [md('a', 'hello'), image('i', 'A cat'), image('j', ''), divider];
    const { sink, select } = mount(blocks, (block) => `a block of type ${block.type}`);
    select(nodeSelection('i'));
    expect(sink).toHaveAccessibleName('A cat');
    select(nodeSelection('j'));
    expect(sink).toHaveAccessibleName('a block of type IMAGE');
    select(nodeSelection('d'));
    expect(sink).toHaveAccessibleName('a block of type DIVIDER');
    select(blockRangeSelection('a', 'd'));
    expect(sink).toHaveAccessibleName('Selected content');
  });

  it('keeps its own name for a block with no text in an editor that names no blocks', () => {
    const { sink, select } = mount();
    select(nodeSelection('d'));
    expect(sink).toHaveAccessibleName('Selected content');
  });

  it('raises no virtual keyboard while it holds a node selection', () => {
    const { sink, select } = mount();
    select(nodeSelection('d'));
    expect(sink).toHaveAttribute('inputmode', 'none');
    select(blockRangeSelection('a', 'd'));
    expect(sink).not.toHaveAttribute('inputmode');
  });

  it('scrolls the selected block into view once, when the selection comes to it', () => {
    const { shell, select, controller } = mount();
    const scrolled = vi.spyOn(shell('d'), 'scrollIntoView');
    select(nodeSelection('d'));
    expect(scrolled).toHaveBeenCalledTimes(1);
    expect(scrolled).toHaveBeenCalledWith({ block: 'nearest' });
    act(() => controller.focus());
    expect(scrolled).toHaveBeenCalledTimes(1);
    select(textSelection({ block: 'c', region: 'text', offset: 1 }));
    select(nodeSelection('d'));
    expect(scrolled).toHaveBeenCalledTimes(2);
  });

  it('empties the sink and hands focus to a host when the selection becomes a caret', () => {
    const { container, sink, select } = mount();
    select(nodeSelection('d'));
    select(textSelection({ block: 'c', region: 'text', offset: 2 }));
    expect(sink.textContent).toBe('');
    expect(document.activeElement).toBe(hostOf(container, 'c'));
  });
});
