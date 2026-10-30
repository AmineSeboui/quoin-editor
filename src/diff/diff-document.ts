import { createBlockCodec, type BlockCodec } from '../engine/blocks/codec';
import type { BlockChange } from '../engine/diff/block-change';
import { diffBlocks, type BlockDiff } from '../engine/diff/diff-blocks';
import type { QuoinBlock } from '../engine/model/quoin-block';
import type { Schema } from '../engine/schema/types';
import { listKind } from '../engine/render/block-groups';
import { changedAttributes } from './changed-attributes';
import { withoutAdoptedBlocks } from './older-owners';

export type DiffStatus = 'added' | 'removed' | 'moved' | 'moved-away' | 'changed';

/** How a block of the diff differs: its words when they changed, and the names of its other changes. */
export type DiffMark = {
  readonly status: DiffStatus;
  readonly change?: BlockChange;
  readonly attributes: readonly string[];
};

/** Both versions as one document to draw, and the mark of each block that is not the same in both, by its id. */
export type DiffDocument = { readonly blocks: QuoinBlock[]; readonly marks: ReadonlyMap<string, DiffMark> };

type Shown = { readonly block: QuoinBlock; readonly mark?: DiffMark };

function changeMark(status: DiffStatus, change: BlockChange, codec: BlockCodec): DiffMark {
  return { status, change, attributes: changedAttributes(change, codec) };
}

const wordsChanged = ({ regions }: BlockChange) =>
  Object.values(regions).some((changes) => changes.some(({ op }) => op !== 'equal'));

function shownOf(diffs: readonly BlockDiff[], codec: BlockCodec): Shown[] {
  return diffs.map((diff): Shown => {
    switch (diff.op) {
      case 'equal':
        return { block: diff.block };
      case 'change': {
        const mark = changeMark('changed', diff, codec);
        return wordsChanged(diff) || mark.attributes.length > 0 ? { block: diff.after, mark } : { block: diff.after };
      }
      case 'delete':
        return { block: diff.block, mark: { status: diff.moved ? 'moved-away' : 'removed', attributes: [] } };
      case 'insert': {
        const { block, moved, change } = diff;
        if (!moved) return { block, mark: { status: 'added', attributes: [] } };
        return { block, mark: change ? changeMark('moved', change, codec) : { status: 'moved', attributes: [] } };
      }
    }
  });
}

// A block that holds several nodes is drawn as the pieces the editor splits it into, so each piece carries the mark.
function pieces({ block, mark }: Shown, codec: BlockCodec): Shown[] {
  if (!mark || mark.change) return [{ block, mark }];
  const split = codec.toEngineBlocks(block);
  return split.length === 1 ? [{ block, mark }] : split.map((piece) => ({ block: codec.toQuoin(piece), mark }));
}

const isOlder = (mark: DiffMark | undefined) => mark?.status === 'removed' || mark?.status === 'moved-away';

/**
 * The blocks of the diff of two versions, in the order they are drawn. A block only the older version has takes a new
 * id when the newer one uses its id, as a moved block does, so every id, and every heading anchor, stays unique.
 */
export function diffDocument(before: readonly QuoinBlock[], after: readonly QuoinBlock[], schema: Schema): DiffDocument {
  let next = 0;
  const codec = createBlockCodec(schema, { newId: () => `diff-${next++}` });
  const laid = shownOf(diffBlocks(before, after, { schema }), codec).flatMap((item) => pieces(item, codec));
  const shown = withoutAdoptedBlocks(
    laid.map((item) => {
      const [engine] = codec.toEngineBlocks(item.block);
      const owner = listKind(engine) !== undefined || engine.type === 'TOGGLE';
      return { item, older: isOlder(item.mark), owner, indent: engine.indent };
    }),
  );
  const taken = new Set(shown.filter(({ mark }) => !isOlder(mark)).map(({ block }) => block.id));
  const used = new Set<string>();
  const marks = new Map<string, DiffMark>();
  const blocks = shown.map(({ block, mark }) => {
    let id = block.id;
    if (used.has(id) || (isOlder(mark) && taken.has(id))) {
      let n = 1;
      while (taken.has(`${block.id}-${n}`) || used.has(`${block.id}-${n}`)) n++;
      id = `${block.id}-${n}`;
    }
    used.add(id);
    if (mark) marks.set(id, mark);
    return id === block.id ? block : { ...block, id };
  });
  return { blocks, marks };
}
