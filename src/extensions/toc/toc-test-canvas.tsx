import { act, fireEvent, screen, within } from '@testing-library/react';
import { coreBlocks } from '../../blocks/core';
import { mountCanvas, paragraph } from '../../blocks/void/test-canvas';
import type { QuoinBlock } from '../../engine';
import { tocExtension, type TocOptions } from './toc-extension';

export const tocBlock = (id = 'toc'): QuoinBlock => ({ id, type: 'TOC', data: {} });

export const heading = (id: string, level: number, text: string): QuoinBlock =>
  paragraph(id, `${'#'.repeat(level)} ${text}`);

/** A table of contents over headings nested three deep, with a paragraph between two of them. */
export const outline = (): QuoinBlock[] => [
  tocBlock(),
  heading('a', 1, 'Intro'),
  heading('b', 2, 'Setup'),
  heading('c', 3, 'Deep'),
  heading('d', 2, 'Usage'),
  paragraph('p', 'Some text'),
  heading('e', 1, 'End'),
];

/** A canvas with the table of contents feature and the core block types only. */
export function mountToc(
  blocks: QuoinBlock[],
  options: TocOptions = {},
  canvas: Parameters<typeof mountCanvas>[1] = {},
) {
  const mounted = mountCanvas(blocks, { blockTypes: coreBlocks, extensions: [tocExtension(options)], ...canvas });
  const nav = () => screen.getByRole('navigation', { name: 'Table of contents' });
  const entry = (name: string) => within(nav()).getByRole('link', { name });
  const host = (id: string) => mounted.shell(id).querySelector<HTMLElement>('[data-quoin-host]')!;
  const caret = (block: string, offset: number) => act(() => mounted.handle().focus({ block, region: 'text', offset }));
  const type = (typed: string) => {
    for (const data of typed) {
      const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
      act(() => void fireEvent(document.activeElement!, event));
    }
  };
  const key = (name: string, init: KeyboardEventInit = {}, target: Element = document.activeElement ?? document.body) =>
    act(() => void fireEvent.keyDown(target, { key: name, ...init }));
  const click = (target: Element, init: MouseEventInit = {}) => {
    let followed = true;
    act(() => void (followed = fireEvent.click(target, init)));
    return followed;
  };
  return { ...mounted, nav, entry, host, caret, type, key, click };
}
