import { act, fireEvent, screen } from '@testing-library/react';
import { coreBlocks } from '../../blocks/core';
import { mountCanvas } from '../../blocks/void/test-canvas';
import type { QuoinBlock } from '../../engine';
import { mentionExtension, type MentionOptions } from './mention-extension';
import type { MentionResult } from './mention-feature';

type Pending = {
  readonly query: string;
  resolve(results: readonly MentionResult[]): Promise<void>;
  reject(reason: unknown): Promise<void>;
};

/** A host search that answers only when a test tells it to, keeping each query it was asked. */
export function deferredSearch() {
  const asked: Pending[] = [];
  const search = vi.fn(
    (query: string) =>
      new Promise<readonly MentionResult[]>((resolve, reject) => {
        asked.push({
          query,
          resolve: (results) => act(async () => resolve(results)),
          reject: (reason) => act(async () => reject(reason)),
        });
      }),
  );
  const queries = () => asked.map(({ query }) => query);
  const last = () => asked[asked.length - 1];
  return { search, asked, queries, last };
}

/** Lets the debounce of the search run out. */
export const waitForSearch = (ms = 120) => act(() => void vi.advanceTimersByTime(ms));

/** A canvas with the mention feature and the core block types only. */
export function mountMentions(
  blocks: QuoinBlock[],
  options: MentionOptions = {},
  canvas: Parameters<typeof mountCanvas>[1] = {},
) {
  const mounted = mountCanvas(blocks, { blockTypes: coreBlocks, extensions: [mentionExtension(options)], ...canvas });
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
  const menu = () => screen.queryByRole('listbox', { name: 'Mentions' });
  const chip = (id: string) => host(id).querySelector<HTMLElement>('[data-quoin-atom="mention"]');
  const markdown = (id: string) =>
    (mounted.last() ?? mounted.handle().editor.getBlocks()).find((block) => block.id === id)?.data.markdown;
  return { ...mounted, host, caret, type, key, undo, menu, chip, markdown };
}
