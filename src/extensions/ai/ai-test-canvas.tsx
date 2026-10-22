import { act, fireEvent, screen } from '@testing-library/react';
import type { mountCanvas } from '../../blocks/void/test-canvas';
import { textSelection, type QuoinBlock } from '../../engine';
import { mountTypingCanvas } from '../typing-test-canvas';
import type { ExtensionUI } from '../ui-types';
import { aiExtension, type AiOptions } from './ai-extension';
import { fakeAiHost, nextFrame } from './ai-test-host';

/** A canvas with AI actions on, answered by a fake host the test streams by hand. */
export function mountAi(
  blocks: QuoinBlock[],
  options: Partial<AiOptions> = {},
  canvas: Parameters<typeof mountCanvas>[1] = {},
) {
  const host = fakeAiHost();
  const onError = vi.fn();
  const extension = aiExtension({ stream: host.stream, ...options });
  const extensions = [extension, ...(canvas.extensions ?? [])];
  const mounted = mountTypingCanvas(blocks, { onError, ...canvas, extensions });
  const ui = () => extension.ui as ExtensionUI;
  const select = (block: string, from: number, to: number) =>
    act(() => {
      const { controller } = mounted.handle();
      const at = (offset: number) => ({ block, region: 'text', offset });
      mounted.handle().focus();
      controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(at(from), at(to))));
    });
  const askAi = () => act(() => ui().bubbleItems![0].run(mounted.handle().controller));
  const field = () => screen.getByRole<HTMLInputElement>('combobox');
  const typeInField = (value: string) => act(() => void fireEvent.change(field(), { target: { value } }));
  const press = (key: string, target: Element = document.activeElement ?? document.body) =>
    act(() => void fireEvent.keyDown(target, { key }));
  const bar = () => screen.queryByRole('group', { name: 'AI response' });
  const button = (name: string) => screen.getByRole('button', { name });
  const click = (name: string) => act(() => void fireEvent.click(button(name)));
  const ghost = () => mounted.container.querySelector<HTMLElement>('.quoin-ai-ghost');
  const frame = () => act(nextFrame);
  return { ...mounted, ...host, onError, ui, select, askAi, field, typeInField, press, bar, button, click, ghost, frame };
}
