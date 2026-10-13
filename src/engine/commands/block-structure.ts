import { requireBlockIndex } from '../model/doc';
import { newId } from '../model/new-id';
import type { BlockAttrs, EngineDoc, Pos, Selection } from '../model/types';
import {
  blockRangeSelection,
  nodeSelection,
  primaryRegion,
  selectedBlockIds,
  startOf,
  textSelection,
} from '../state/selection';
import { Transaction } from '../state/transaction';
import { setAttrsStep } from '../transform/attrs-steps';
import { insertBlocksStep, moveBlocksStep, replaceBlockStep } from '../transform/block-steps';
import {
  createBlock,
  descendantsEnd,
  headBlockId,
  isParagraph,
  regionLength,
  selectedBlockRange,
  type BlockRange,
} from './block-helpers';
import { capIndents } from './cap-indents';
import type { Command } from './command';
import { removeBlocks } from './remove-blocks';
import { shiftSubtree } from './shift-subtree';

type Options = { newId?: () => string };

export const toggleTask: Command = (state, dispatch) => {
  const { doc, selection } = state;
  const tasks = selectedBlockIds(doc, selection)
    .map((id) => doc.blocks[requireBlockIndex(doc, id)])
    .filter((block) => block.type === 'MARKDOWN' && block.attrs.kind === 'task');
  if (tasks.length === 0) return false;
  const checked = !tasks.every((block) => block.attrs.checked === true);
  const tr = new Transaction(state);
  for (const block of tasks) tr.step(setAttrsStep(block.id, { checked }));
  dispatch?.(tr);
  return true;
};

type Delta = (root: number, before: number) => number;

// A selected root is a selected block outside the subtree of an earlier one. Roots never deepen down the range, so a
// root can indent exactly when it is no deeper than the block before the range: its first predecessor at its own
// level is then outside the selection, and sibling roots move together.
function reindentCommand(delta: Delta): Command {
  return (state, dispatch) => {
    const { doc } = state;
    const range = selectedBlockRange(doc, state.selection);
    if (range === null) return false;
    const before = range.start > 0 ? doc.blocks[range.start - 1].indent : -1;
    const tr = new Transaction(state);
    for (let root = range.start; root < range.end; root = descendantsEnd(doc, root)) {
      const shift = delta(doc.blocks[root].indent, before);
      if (shift !== 0) shiftSubtree(tr, root, shift);
    }
    if (!tr.docChanged) return false;
    dispatch?.(tr);
    return true;
  };
}

export const indent = reindentCommand((root, before) => (root <= before ? 1 : 0));
export const outdent = reindentCommand((root) => (root > 0 ? -1 : 0));

function moveTarget(doc: EngineDoc, range: BlockRange, direction: 'up' | 'down'): number | null {
  if (direction === 'up') {
    if (range.start === 0) return null;
    let root = range.start - 1;
    while (root > 0 && doc.blocks[root].indent > doc.blocks[range.start].indent) root--;
    return root;
  }
  if (range.end >= doc.blocks.length) return null;
  return descendantsEnd(doc, range.end) - (range.end - range.start);
}

function moveCommand(direction: 'up' | 'down'): Command {
  return (state, dispatch) => {
    const { doc } = state;
    const range = selectedBlockRange(doc, state.selection);
    const to = range === null ? null : moveTarget(doc, range, direction);
    if (range === null || to === null) return false;
    const count = range.end - range.start;
    const tr = new Transaction(state).step(moveBlocksStep(range.start, count, to));
    capIndents(tr, to);
    capIndents(tr, to + count);
    dispatch?.(tr);
    return true;
  };
}

export const moveBlocksUp = moveCommand('up');
export const moveBlocksDown = moveCommand('down');

function copiedSelection(selection: Selection, copies: ReadonlyMap<string, string>): Selection {
  const copy = (id: string) => copies.get(id) ?? id;
  const copyPos = (pos: Pos): Pos => ({ ...pos, block: copy(pos.block) });
  switch (selection.kind) {
    case 'text':
      return textSelection(copyPos(selection.anchor), copyPos(selection.head));
    case 'node':
      return nodeSelection(copy(selection.block));
    case 'blocks':
      return blockRangeSelection(copy(selection.anchor), copy(selection.head));
  }
}

export function duplicateBlocks(options: Options = {}): Command {
  const makeId = options.newId ?? newId;
  return (state, dispatch) => {
    const { doc, selection } = state;
    const range = selectedBlockRange(doc, selection);
    if (range === null || selection === null) return false;
    const blocks = doc.blocks.slice(range.start, range.end).map((block) => ({ ...block, id: makeId() }));
    const copies = new Map(blocks.map((copy, i) => [doc.blocks[range.start + i].id, copy.id]));
    const tr = new Transaction(state).step(insertBlocksStep(range.end, blocks));
    dispatch?.(tr.setSelection(copiedSelection(selection, copies)));
    return true;
  };
}

export const deleteBlocks: Command = (state, dispatch) => {
  const range = selectedBlockRange(state.doc, state.selection);
  if (range === null) return false;
  const tr = new Transaction(state);
  removeBlocks(tr, state.schema, range.start, range.end - range.start);
  dispatch?.(tr);
  return true;
};

export function insertBlockAfter(type: string, attrs?: BlockAttrs, options: Options = {}): Command {
  const makeId = options.newId ?? newId;
  return (state, dispatch) => {
    const { doc, schema } = state;
    const id = headBlockId(state.selection);
    if (id === null) return false;
    const index = requireBlockIndex(doc, id);
    const current = doc.blocks[index];
    const fillsCurrent = isParagraph(current) && regionLength(current, primaryRegion(schema, current) ?? '') === 0;
    const block = createBlock(schema, type, attrs, current.indent, fillsCurrent ? current.id : makeId());
    const step = fillsCurrent ? replaceBlockStep(block) : insertBlocksStep(descendantsEnd(doc, index), [block]);
    const tr = new Transaction(state).step(step);
    dispatch?.(tr.setSelection(startOf(tr.doc, schema, block.id)));
    return true;
  };
}
