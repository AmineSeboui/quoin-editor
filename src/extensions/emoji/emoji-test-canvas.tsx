import { act, screen } from '@testing-library/react';
import type { mountCanvas } from '../../blocks/void/test-canvas';
import type { QuoinBlock } from '../../engine';
import { mountTypingCanvas } from '../typing-test-canvas';
import type { EmojiData } from './emoji-data';
import { emojiData } from './emoji-data';
import { emojiExtension, type EmojiOptions } from './emoji-extension';

/** A canvas with the emoji feature and the core block types only. */
export function mountEmoji(blocks: QuoinBlock[], options: EmojiOptions = {}, canvas: Parameters<typeof mountCanvas>[1] = {}) {
  const mounted = mountTypingCanvas(blocks, { extensions: [emojiExtension(options)], ...canvas });
  const menu = () => screen.queryByRole('listbox', { name: 'Emoji' });
  return { ...mounted, menu };
}

/**
 * Holds the dataset back as though it had not loaded yet, until the test answers the load it waits for. The dataset of
 * the real chunk is the answer unless the test fails the load.
 */
export function heldEmojiData() {
  const answers: { resolve(): Promise<void>; reject(reason: unknown): Promise<void> }[] = [];
  const loaded = vi.spyOn(emojiData, 'loaded').mockReturnValue(undefined);
  const load = vi.spyOn(emojiData, 'load').mockImplementation(
    () =>
      new Promise<EmojiData>((resolve, reject) => {
        answers.push({
          resolve: () =>
            act(async () => {
              const data = await import('../../emoji/index');
              loaded.mockReturnValue(data);
              resolve(data);
            }),
          reject: (reason) => act(async () => reject(reason)),
        });
      }),
  );
  return { load, answers, last: () => answers[answers.length - 1] };
}
