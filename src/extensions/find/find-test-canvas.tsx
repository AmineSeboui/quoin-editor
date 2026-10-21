import { act, fireEvent, screen } from '@testing-library/react';
import type { mountCanvas } from '../../blocks/void/test-canvas';
import type { QuoinBlock } from '../../engine';
import { mountTypingCanvas } from '../typing-test-canvas';
import { findExtension, type FindOptions } from './find-extension';

/** A canvas with the find feature and the core block types only, and the means to drive its panel. */
export function mountFind(
  blocks: QuoinBlock[],
  options: FindOptions = {},
  canvas: Parameters<typeof mountCanvas>[1] = {},
) {
  const mounted = mountTypingCanvas(blocks, { extensions: [findExtension(options)], ...canvas });
  const mod = () => (mounted.handle().controller.isMac ? { metaKey: true } : { ctrlKey: true });
  const openPanel = (target: Element = document.activeElement ?? document.body) =>
    act(() => void fireEvent.keyDown(target, { key: 'F', code: 'KeyF', shiftKey: true, ...mod() }));
  const panel = () => screen.queryByRole('search', { name: 'Find and replace' });
  const field = (name: string) => screen.getByRole('textbox', { name });
  const button = (name: string) => screen.getByRole('button', { name });
  const fill = (name: string, value: string) => act(() => void fireEvent.change(field(name), { target: { value } }));
  const keyIn = (name: string, key: string, init: KeyboardEventInit = {}) =>
    act(() => void fireEvent.keyDown(field(name), { key, ...init }));
  const matches = (id: string) =>
    Array.from(mounted.host(id).querySelectorAll('.quoin-find-match'), (match) => match.textContent);
  const current = () => document.querySelector('.quoin-find-current');
  return { ...mounted, mod, openPanel, panel, field, button, fill, keyIn, matches, current };
}
