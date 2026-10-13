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
import type { EditorState } from '../state/editor-state';
import { Transaction } from '../state/transaction';
import { setAttrsStep, setIndentStep } from '../transform/attrs-steps';
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
import type { Command } from './command';
import { removeBlocks } from './remove-blocks';

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

function reindent(state: EditorState, next: (current: number, previous: number) => number): Transaction | null {
  const range = selectedBlockRange(state.doc, state.selection);
  if (range === null) return null;
  const { blocks } = state.doc;
  const tr = new Transaction(state);
  let previous = range.start > 0 ? blocks[range.start - 1].indent : -1;
  for (const block of blocks.slice(range.start, range.end)) {
    const value = next(block.indent, previous);
    if (value !== block.indent) tr.step(setIndentStep(block.id, value));
    previous = value;
  }
  return tr.docChanged ? tr : null;
}

function reindentCommand(next: (current: number, previous: number) => number): Command {
  return (state, dispatch) => {
    const tr = reindent(state, next);
    if (tr === null) return false;
    dispatch?.(tr);
    return true;
  };
}

export const indent = reindentCommand((current, previous) => (current <= previous ? current + 1 : current));
export const outdent = reindentCommand((current) => Math.max(0, current - 1));

type MoveTarget = { to: number; preceding: number };

function moveTarget(doc: EngineDoc, range: BlockRange, direction: 'up' | 'down'): MoveTarget | null {
  if (direction === 'up') {
    if (range.start === 0) return null;
    let root = range.start - 1;
    while (root > 0 && doc.blocks[root].indent > doc.blocks[range.start].indent) root--;
    return { to: root, preceding: root - 1 };
  }
  if (range.end >= doc.blocks.length) return null;
  const end = descendantsEnd(doc, range.end);
  return { to: end - (range.end - range.start), preceding: end - 1 };
}

function moveCommand(direction: 'up' | 'down'): Command {
  return (state, dispatch) => {
    const { doc } = state;
    const range = selectedBlockRange(doc, state.selection);
    const target = range === null ? null : moveTarget(doc, range, direction);
    if (range === null || target === null) return false;
    const tr = new Transaction(state).step(moveBlocksStep(range.start, range.end - range.start, target.to));
    const cap = target.preceding < 0 ? 0 : doc.blocks[target.preceding].indent + 1;
    const delta = Math.min(0, cap - doc.blocks[range.start].indent);
    if (delta !== 0) {
      for (const { id, indent: current } of doc.blocks.slice(range.start, range.end)) {
        tr.step(setIndentStep(id, current + delta));
      }
    }
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
