'use client';

import { useEffect, useRef } from 'react';
import type { ViewController } from '../../view';

type Closing = {
  /** Stores what the popover holds, `refocus` when focus is handed back right after. */
  store(refocus: boolean): void;
  onClose(): void;
  /** Hands focus back to what the popover edits. */
  onReturn(): void;
};

/**
 * How a popover that edits part of a block ends, once whatever ends it: `close` stores what it holds if asked, closes
 * it and hands focus back if asked, `finish` ends it without closing it, and a popover taken down any other way
 * stores what it holds.
 */
export function useClosing(controller: ViewController, { store, onClose, onReturn }: Closing) {
  const closed = useRef(false);

  // Handing focus back is focus leaving the popover, which would close it a second time.
  const finish = (save: boolean, refocus = false) => {
    if (closed.current) return false;
    closed.current = true;
    if (save) store(refocus);
    return true;
  };
  const latestFinish = useRef(finish);
  latestFinish.current = finish;
  useEffect(() => {
    closed.current = false;
    return () => void latestFinish.current(true);
  }, []);

  // A tap gives the text focus and the caret before its click closes the popover, and the editor reads the caret only
  // on the next selection change, so it is read first: the store would otherwise draw the old caret back.
  const close = (save: boolean, refocus = true) => {
    if (!refocus) controller.readSelectionFromDom();
    if (!finish(save, refocus)) return;
    onClose();
    if (refocus) onReturn();
  };

  return { finish, close };
}
