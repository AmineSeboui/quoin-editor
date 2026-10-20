import { act, fireEvent } from '@testing-library/react';
import { coreBlocks } from '../../blocks/core';
import { mountCanvas, paragraph } from '../../blocks/void/test-canvas';
import type { QuoinBlock } from '../../engine';
import { clipboardEvent, fakeTransfer } from '../../view/clipboard/test-transfer';
import { embedExtension, type EmbedOptions } from './embed-extension';

export const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
export const YOUTUBE_FRAME = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';

export const embedBlock = (url: string, id = 'e'): QuoinBlock => ({ id, type: 'EMBED', data: { url, provider: '' } });

/** A canvas with the embed feature between a paragraph above and one below, with the core block types only. */
export function mountEmbeds(
  blocks: QuoinBlock[],
  options: EmbedOptions = {},
  canvas: Parameters<typeof mountCanvas>[1] = {},
) {
  const mounted = mountCanvas([paragraph('p', 'Above'), ...blocks, paragraph('q', 'Below')], {
    blockTypes: coreBlocks,
    extensions: [embedExtension(options)],
    ...canvas,
  });
  const caret = (block: string, offset = 0) => act(() => mounted.handle().focus({ block, region: 'text', offset }));
  const paste = (text: string) => {
    const { transfer } = fakeTransfer({ 'text/plain': text });
    act(() => void document.activeElement!.dispatchEvent(clipboardEvent('paste', transfer)));
  };
  const key = (key: string, init: KeyboardEventInit = {}, target: Element = document.activeElement ?? document.body) =>
    act(() => void fireEvent.keyDown(target, { key, ...init }));
  return { ...mounted, caret, paste, key };
}
