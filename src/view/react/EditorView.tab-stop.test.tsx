import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { blockRangeSelection, nodeSelection, textSelection, type QuoinBlock, type Selection } from '../../engine';
import type { ViewController } from '../controller/view-controller';
import { Editor, hostOf, md } from './test-harness';

const toggle = (open: boolean): QuoinBlock => ({ id: 't', type: 'TOGGLE', data: { markdown: 'T', open } });

function mount(blocks: QuoinBlock[]) {
  let controller!: ViewController;
  const { container } = render(<Editor options={{ blocks, onChange: () => {} }} onController={(c) => (controller = c)} />);
  const select = (selection: Selection) =>
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(selection)));
  const tabStops = () =>
    Array.from(container.querySelectorAll<HTMLElement>('[tabindex="0"]'), (element) =>
      element.hasAttribute('data-quoin-host')
        ? `host ${element.closest<HTMLElement>('[data-block-id]')!.dataset.blockId}`
        : element.hasAttribute('data-quoin-sink')
          ? 'sink'
          : element.dataset.blockId,
    );
  const shell = (id: string) => container.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
  return { controller, container, select, tabStops, shell };
}

describe('EditorView tab stop', () => {
  it('keeps one tab stop: the host of the caret, the shell a node selection focuses, or the sink for a block range', () => {
    const { container, select, tabStops } = mount([md('a', 'one'), { id: 'd', type: 'DIVIDER', data: {} }, md('c', 'three')]);
    expect(tabStops()).toEqual(['host a']);
    expect(hostOf(container, 'c')).toHaveAttribute('tabindex', '-1');
    select(textSelection({ block: 'c', region: 'text', offset: 1 }));
    expect(tabStops()).toEqual(['host c']);
    select(nodeSelection('d'));
    expect(tabStops()).toEqual(['d']);
    select(blockRangeSelection('a', 'c'));
    expect(tabStops()).toEqual(['sink']);
    expect(hostOf(container, 'c')).toHaveAttribute('tabindex', '-1');
  });

  it('keeps a block range whose head a closed toggle hides in the sink, and lands a caret on the toggle', () => {
    const { controller, container, select, tabStops, shell } = mount([md('a', 'one'), toggle(false), md('c', 'child', 1)]);
    act(() => controller.focus({ block: 'a', region: 'text', offset: 1 }));
    select(blockRangeSelection('a', 'c'));
    expect(shell('c')).toBeNull();
    expect(tabStops()).toEqual(['sink']);
    expect(document.activeElement).toBe(container.querySelector('[data-quoin-sink]'));
    select(textSelection({ block: 'c', region: 'text', offset: 1 }));
    expect(controller.editor.state.selection).toEqual(textSelection({ block: 't', region: 'text', offset: 1 }));
    expect(tabStops()).toEqual(['host t']);
  });

  it('moves the caret, the tab stop and focus to the end of a toggle closed over the caret', () => {
    const { controller, container, tabStops } = mount([toggle(true), md('c', 'child', 1), md('b', 'after')]);
    act(() => controller.focus({ block: 'c', region: 'text', offset: 2 }));
    expect(document.activeElement).toBe(hostOf(container, 'c'));
    act(() => screen.getByRole('button', { name: 'Toggle' }).click());
    expect(controller.editor.state.selection).toEqual(textSelection({ block: 't', region: 'text', offset: 1 }));
    expect(tabStops()).toEqual(['host t']);
    expect(document.activeElement).toBe(hostOf(container, 't'));
  });

  it('falls back to the block shell for a head in a region drawn without a host', () => {
    const image: QuoinBlock = { id: 'i', type: 'IMAGE', data: { storageKey: 'k', alt: '' } };
    const { select, tabStops } = mount([md('a', 'one'), image]);
    select(textSelection({ block: 'i', region: 'caption', offset: 0 }));
    expect(tabStops()).toEqual(['i']);
  });
});
