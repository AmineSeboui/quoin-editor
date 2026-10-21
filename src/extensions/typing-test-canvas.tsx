import { act, fireEvent } from '@testing-library/react';
import { coreBlocks } from '../blocks/core';
import { mountCanvas } from '../blocks/void/test-canvas';
import type { QuoinBlock } from '../engine';

/** A canvas with the core block types, and the means to place the caret, type and press keys as a writer would. */
export function mountTypingCanvas(blocks: QuoinBlock[], canvas: Parameters<typeof mountCanvas>[1] = {}) {
  const mounted = mountCanvas(blocks, { blockTypes: coreBlocks, ...canvas });
  const host = (id: string) => mounted.shell(id).querySelector<HTMLElement>('[data-quoin-host]')!;
  const caret = (block: string, offset: number) =>
    act(() => mounted.handle().focus({ block, region: 'text', offset }));
  const type = (typed: string) => {
    for (const data of typed) {
      const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
      act(() => void fireEvent(document.activeElement!, event));
    }
  };
  const key = (name: string, init: KeyboardEventInit = {}) =>
    act(() => void fireEvent.keyDown(document.activeElement ?? document.body, { key: name, ...init }));
  const undo = () => key('z', mounted.handle().controller.isMac ? { metaKey: true } : { ctrlKey: true });
  const markdown = (id: string) =>
    (mounted.last() ?? mounted.handle().editor.getBlocks()).find((block) => block.id === id)?.data.markdown;
  return { ...mounted, host, caret, type, key, undo, markdown };
}
