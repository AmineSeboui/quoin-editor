import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { EditorState } from '../../engine';
import type { ViewController } from '../controller/view-controller';

type Selected<T> = { readonly state: EditorState; readonly selector: (state: EditorState) => T; readonly value: T };

export function useEditorState<T>(
  controller: ViewController,
  selector: (state: EditorState) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const last = useRef<Selected<T> | null>(null);
  const subscribe = useCallback(
    (notify: () => void) => controller.editor.subscribe(() => notify()),
    [controller],
  );
  const getSnapshot = useCallback((): T => {
    const { state } = controller.editor;
    const previous = last.current;
    if (previous !== null && previous.state === state && previous.selector === selector) return previous.value;
    const next = selector(state);
    const value = previous !== null && isEqual(previous.value, next) ? previous.value : next;
    last.current = { state, selector, value };
    return value;
  }, [controller, selector, isEqual]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
