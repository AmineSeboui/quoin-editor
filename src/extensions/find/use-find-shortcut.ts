import { useEffect } from 'react';
import { keyName, normalizeKey, type KeyLike } from '../../engine';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { openFind } from './find-commands';

export const isFindShortcut = (event: KeyLike, isMac: boolean): boolean =>
  keyName(event, isMac) === normalizeKey('Mod-Shift-f', isMac);

/**
 * Mod+Shift+F from the canvas opens the find panel. It listens on the canvas itself rather than through the keymap,
 * which a read-only canvas does not run.
 */
export function useFindShortcut(controller: ViewController): void {
  useEffect(() => {
    const root = controller.root;
    if (root === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (isComposingKey(controller, event) || !isFindShortcut(event, controller.isMac)) return;
      event.preventDefault();
      const { editor } = controller;
      openFind(editor.state, (tr) => editor.dispatch(tr));
    };
    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
  }, [controller]);
}
