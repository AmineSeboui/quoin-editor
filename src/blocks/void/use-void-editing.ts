'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ViewController } from '../../view';
import { selectNode } from './select-node';
import type { VoidEditing } from './void-editing';

export const VoidEditingContext = createContext<VoidEditing | null>(null);

export type VoidEditingState = { editing: boolean; start(): void; stop(): void };

/** Whether a void block's editor is open. Starting node-selects the block, and Enter starts it while `canEdit`. */
export function useVoidEditing(controller: ViewController, blockId: string, canEdit = true): VoidEditingState {
  const voidEditing = useContext(VoidEditingContext);
  const [editing, setEditing] = useState(false);
  if (editing && !canEdit) setEditing(false);

  const start = useCallback(() => {
    selectNode(controller, blockId);
    setEditing(true);
  }, [controller, blockId]);
  const stop = useCallback(() => setEditing(false), []);

  useEffect(
    () => (canEdit && voidEditing !== null ? voidEditing.register(blockId, start) : undefined),
    [voidEditing, blockId, start, canEdit],
  );

  return { editing: editing && canEdit, start, stop };
}
