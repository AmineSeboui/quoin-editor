import { act, screen } from '@testing-library/react';
import type { mountCanvas } from '../../blocks/void/test-canvas';
import type { QuoinBlock } from '../../engine';
import { mountTypingCanvas } from '../typing-test-canvas';
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
  const mounted = mountTypingCanvas(blocks, { extensions: [mentionExtension(options)], ...canvas });
  const menu = () => screen.queryByRole('listbox', { name: 'Mentions' });
  const chip = (id: string) => mounted.host(id).querySelector<HTMLElement>('[data-quoin-atom="mention"]');
  return { ...mounted, menu, chip };
}
