'use client';

import { useEffect, type RefObject } from 'react';
import type { KeyInterceptor, ViewController } from '../../view';
import { useVoidEditing } from './use-void-editing';

const CONTROL = 'input:not([disabled]), button:not([disabled])';

const typed = (event: KeyboardEvent): boolean => !event.ctrlKey && !event.metaKey && [...event.key].length === 1;

/** Where the keys pressed on a block selected as a whole go, in place of its first control and of nowhere. */
export type NodeKeys = { enter?(): void; type?(key: string): void };

/**
 * Enter on the block selected as a whole, or a menu that inserts one, focuses its first control while `opens`, or calls
 * `enter`. A key typed on the selected block never replaces it: it goes to `type`, or nowhere.
 */
export function useNodeKeys(
  controller: ViewController,
  blockId: string,
  editable: boolean,
  opens: boolean,
  root: RefObject<HTMLElement | null>,
  { enter, type }: NodeKeys = {},
): void {
  const { editing, stop } = useVoidEditing(controller, blockId, editable && opens);

  useEffect(() => {
    if (!editing) return;
    stop();
    if (enter) enter();
    else root.current?.querySelector<HTMLElement>(CONTROL)?.focus();
  }, [editing, stop, enter, root]);

  useEffect(() => {
    if (!editable) return;
    const intercept: KeyInterceptor = (event) => {
      const { selection } = controller.editor.state;
      if (selection?.kind !== 'node' || selection.block !== blockId || !typed(event)) return false;
      type?.(event.key);
      event.preventDefault();
      return true;
    };
    controller.keyInterceptors.add(intercept);
    return () => void controller.keyInterceptors.delete(intercept);
  }, [controller, blockId, editable, type]);
}
