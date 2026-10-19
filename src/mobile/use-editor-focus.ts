import { useCallback, useSyncExternalStore } from 'react';
import { focusInEditor } from '../menus/bubble/bubble-part';
import type { ViewController } from '../view';

const FOCUS_EVENTS = ['focusin', 'focusout'] as const;

function subscribe(notify: () => void): () => void {
  for (const type of FOCUS_EVENTS) document.addEventListener(type, notify);
  return () => {
    for (const type of FOCUS_EVENTS) document.removeEventListener(type, notify);
  };
}

const NOT_FOCUSED = () => false;

export function useEditorFocus(controller: ViewController): boolean {
  const read = useCallback(() => focusInEditor(controller), [controller]);
  return useSyncExternalStore(subscribe, read, NOT_FOCUSED);
}
