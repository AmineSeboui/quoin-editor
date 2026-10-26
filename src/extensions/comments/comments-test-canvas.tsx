import { act, fireEvent, screen } from '@testing-library/react';
import type { mountCanvas } from '../../blocks/void/test-canvas';
import { textSelection, type QuoinBlock, type TransactionOrigin } from '../../engine';
import { mountTypingCanvas } from '../typing-test-canvas';
import type { ExtensionUI } from '../ui-types';
import { createCommentThreads, type CommentThread } from './comment-threads';
import { commentsExtension, type CommentsOptions } from './comments-extension';

export const span = (id: string, inner: string) => `<span data-comment="${id}">${inner}</span>`;

export const thread = (id: string, ...bodies: string[]): CommentThread => ({
  id,
  resolved: false,
  comments: bodies.map((body, i) => ({
    id: `${id}-${i}`,
    author: { name: i % 2 === 0 ? 'Ada Lovelace' : 'Alan Turing' },
    body,
    createdAt: '2026-10-22T09:05:00Z',
  })),
});

/** A canvas with comments on, its host's threads in a store, and every host call a mock that resolves. */
export function mountComments(
  blocks: QuoinBlock[],
  threads: CommentThread[],
  options: Partial<CommentsOptions> = {},
  canvas: Parameters<typeof mountCanvas>[1] = {},
) {
  const store = createCommentThreads(threads);
  const calls = {
    onCreate: vi.fn(() => Promise.resolve('new')),
    onReply: vi.fn(() => Promise.resolve()),
    onResolve: vi.fn(() => Promise.resolve()),
    onDelete: vi.fn(() => Promise.resolve()),
  };
  const onError = vi.fn();
  const currentUser = { id: 'me', name: 'Grace Hopper' };
  const extension = commentsExtension({ threads: store, currentUser, ...calls, ...options });
  const extensions = [extension, ...(canvas.extensions ?? [])];
  const mounted = mountTypingCanvas(blocks, { onError, ...canvas, extensions });
  const anchor = (id: string) => mounted.container.querySelector<HTMLElement>(`[data-comment="${id}"]`)!;
  const click = (element: Element) => act(() => void fireEvent.click(element));
  const mod = () => (mounted.handle().controller.isMac ? { metaKey: true } : { ctrlKey: true });
  const commentKey = () => mounted.key('m', { code: 'KeyM', altKey: true, ...mod() });
  const popover = (name: string | RegExp) => screen.queryByRole('dialog', { name });
  const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));
  const ui = () => extension.ui as ExtensionUI;
  /** Puts the caret at `offset` of `block` with a change of the given origin, by default the writer's own. */
  const moveCaret = (block: string, offset: number, origin: TransactionOrigin = 'input') => {
    const { controller, editor } = mounted.handle();
    const at = { block, region: 'text', offset };
    act(() => controller.dispatch(editor.createTransaction().setSelection(textSelection(at, at)).setOrigin(origin)));
  };
  return { ...mounted, store, calls, onError, anchor, click, mod, commentKey, popover, settle, ui, moveCaret };
}
