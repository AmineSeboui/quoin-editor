import { useEffect, useRef } from 'react';
import type { BlockCodec, EngineBlock, QuoinBlock, Schema, Transaction, TransactionOrigin } from '../engine';
import { isTextFlow, regionLength } from '../engine/commands/block-helpers';
import { LINE_JOIN } from '../engine/commands/line-join';
import type { InternalEditor } from '../engine/extension/editor';
import { createDoc } from '../engine/model/doc';
import { primaryRegion } from '../engine/state/selection';
import type { ViewController } from '../view';
import { useIsomorphicLayoutEffect } from '../view/react/use-isomorphic-layout-effect';

type OnDelete = (block: QuoinBlock, index: number) => void;
type Deletion = { block: QuoinBlock; index: number };

const WRITER_ORIGINS: ReadonlySet<TransactionOrigin> = new Set(['command', 'input', 'paste']);

const isBlockDeletion = (tr: Transaction): boolean => WRITER_ORIGINS.has(tr.origin) && tr.getMeta(LINE_JOIN) !== true;

const isEmptyText = (schema: Schema, block: EngineBlock): boolean =>
  isTextFlow(schema, block) && regionLength(block, primaryRegion(schema, block) ?? '') === 0;

// A paste deletes the selected text first, then its blocks take the place of the line that leaves empty, at either end
// of the selection: that line loses nothing.
function filledLine({ origin, before }: Transaction, schema: Schema): (block: EngineBlock) => boolean {
  const { selection } = before;
  if (origin !== 'paste' || selection?.kind !== 'text') return () => false;
  const ends = new Set([selection.anchor.block, selection.head.block]);
  return (block) => ends.has(block.id) && isEmptyText(schema, block);
}

function deletions(codec: BlockCodec, tr: Transaction): Deletion[] {
  const filled = filledLine(tr, tr.before.schema);
  return tr.steps.flatMap((step, i) => {
    if (step.stepType !== 'removeBlocks') return [];
    const { index, count } = step.toJSON();
    if (typeof index !== 'number' || typeof count !== 'number') return [];
    const { blocks } = tr.docs[i];
    const first = codec.blocksFromDoc(createDoc(blocks.slice(0, index))).length;
    return blocks
      .slice(index, index + count)
      .flatMap((block, offset) => (filled(block) ? [] : [{ block: codec.toQuoin(block), index: first + offset }]));
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
      if (tr === null || latest.current === undefined || !isBlockDeletion(tr)) return;
      const deleted = deletions(codec, tr);
      if (deleted.length > 0) queueMicrotask(() => deleted.forEach(({ block, index }) => latest.current?.(block, index)));
    });
  }, [controller]);
}
