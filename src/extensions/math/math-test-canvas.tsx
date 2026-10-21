import { act, fireEvent, screen } from '@testing-library/react';
import { coreBlocks } from '../../blocks/core';
import { mountCanvas } from '../../blocks/void/test-canvas';
import type { QuoinBlock } from '../../engine';
import { mathExtension, type MathOptions } from './math-extension';
import type { RenderMath } from './math-feature';

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Stands in for a host's renderer, such as KaTeX, drawing the LaTeX as markup. */
export const fakeRenderMath: RenderMath = (latex, { displayMode }) =>
  `<span class="fake-math" data-display="${displayMode}">${escapeHtml(latex)}</span>`;

export const mathBlock = (latex: string, id = 'm'): QuoinBlock => ({ id, type: 'MATH', data: { latex } });

/** A canvas with the math feature and the core block types only. */
export function mountMath(
  blocks: QuoinBlock[],
  options: MathOptions = {},
  canvas: Parameters<typeof mountCanvas>[1] = {},
) {
  const mounted = mountCanvas(blocks, { blockTypes: coreBlocks, extensions: [mathExtension(options)], ...canvas });
  const host = (id: string) => mounted.shell(id).querySelector<HTMLElement>('[data-quoin-host]')!;
  const caret = (block: string, offset: number) =>
    act(() => mounted.handle().focus({ block, region: 'text', offset }));
  const type = (typed: string) => {
    for (const data of typed) {
      const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
      act(() => void fireEvent(document.activeElement!, event));
    }
  };
  const key = (name: string, init: KeyboardEventInit = {}, target: Element = document.activeElement ?? document.body) =>
    act(() => void fireEvent.keyDown(target, { key: name, ...init }));
  const mod = () => (mounted.handle().controller.isMac ? { metaKey: true } : { ctrlKey: true });
  const popover = () => screen.queryByRole('dialog', { name: 'Edit equation' });
  const field = () => screen.queryByRole<HTMLTextAreaElement>('textbox', { name: 'LaTeX' });
  const markdown = (id: string) => mounted.last()?.find((block) => block.id === id)?.data.markdown;
  return { ...mounted, host, caret, type, key, mod, popover, field, markdown };
}
