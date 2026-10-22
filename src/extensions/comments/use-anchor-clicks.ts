import { useEffect } from 'react';
import type { ViewController } from '../../view';
import type { CommentThreads } from './comment-threads';
import { commentsTransaction, openIds } from './comment-open';

function idsUnder(root: HTMLElement, target: EventTarget | null): string[] {
  const ids: string[] = [];
  let element = target instanceof Element ? target.closest('[data-comment]') : null;
  while (element !== null && root.contains(element)) {
    const id = element.getAttribute('data-comment');
    if (id) ids.push(id);
    element = element.parentElement?.closest('[data-comment]') ?? null;
  }
  return ids;
}

/**
 * A click that leaves the caret in an anchor opens its thread, or the list of the threads there, without taking focus
 * from the text: typing goes on where the click put the caret.
 */
export function useAnchorClicks(controller: ViewController, threads: CommentThreads): void {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const root = controller.root;
      if (root === null || event.defaultPrevented || !root.ownerDocument.getSelection()?.isCollapsed) return;
      const ids = openIds(threads, idsUnder(root, event.target));
      if (ids.length === 0) return;
      const { editor } = controller;
      editor.dispatch(commentsTransaction(editor.state, { type: 'open', open: { ids, focus: false } }));
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [controller, threads]);
}
