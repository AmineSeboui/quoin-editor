import { useEffect, useRef } from 'react';
import type { BlockCodec, QuoinBlock, Transaction } from '../engine';
import type { InternalEditor } from '../engine/extension/editor';
import { createDoc } from '../engine/model/doc';
import type { ViewController } from '../view';
import { useIsomorphicLayoutEffect } from '../view/react/use-isomorphic-layout-effect';

type OnDelete = (block: QuoinBlock, index: number) => void;
type Deletion = { block: QuoinBlock; index: number };

const REMOVING_STEPS = new Set(['removeBlocks', 'setIndent']);

// A join from Backspace moves text into another block before it removes one, so only a transaction that does nothing
// but remove blocks, and re-cap the indents after them, deletes.
const isDeletion = (tr: Transaction): boolean =>
  tr.origin === 'command' &&
  tr.steps.some((step) => step.stepType === 'removeBlocks') &&
  tr.steps.every((step) => REMOVING_STEPS.has(step.stepType));

function deletions(codec: BlockCodec, tr: Transaction): Deletion[] {
  return tr.steps.flatMap((step, i) => {
    const { stepType, index, count } = step.toJSON();
    if (stepType !== 'removeBlocks' || typeof index !== 'number' || typeof count !== 'number') return [];
    const { blocks } = tr.docs[i];
    const first = codec.blocksFromDoc(createDoc(blocks.slice(0, index))).length;
    return blocks.slice(index, index + count).map((block, offset) => ({ block: codec.toQuoin(block), index: first + offset }));
  });
}

// The editor notifies listeners before it reports the change to the host, so the deletions wait for a microtask.
export function useDeleteReporter(controller: ViewController, onDelete: OnDelete | undefined): void {
  const latest = useRef(onDelete);

  useIsomorphicLayoutEffect(() => {
    latest.current = onDelete;
  });

  useEffect(() => {
    const { codec } = controller.editor as InternalEditor;
    return controller.editor.subscribe((_state, tr) => {
      if (tr === null || latest.current === undefined || !isDeletion(tr)) return;
      const deleted = deletions(codec, tr);
      queueMicrotask(() => deleted.forEach(({ block, index }) => latest.current?.(block, index)));
    });
  }, [controller]);
}
