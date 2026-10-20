import { requireBlockIndex } from '../model/doc';
import type { EngineDoc } from '../model/types';
import { blockRangeSelection } from '../state/selection';
import { Transaction } from '../state/transaction';
import { setIndentStep } from '../transform/attrs-steps';
import { moveBlocksStep } from '../transform/block-steps';
import { descendantsEnd } from './block-helpers';
import { capIndents } from './cap-indents';
import type { Command } from './command';

function movedRuns(doc: EngineDoc, ids: readonly string[]): string[][] | null {
  const moved = new Array<boolean>(doc.blocks.length).fill(false);
  for (const id of ids) {
    const index = doc.index.get(id);
    if (index === undefined) return null;
    moved.fill(true, index, descendantsEnd(doc, index));
  }
  const runs: string[][] = [];
  doc.blocks.forEach((block, index) => {
    if (!moved[index]) return;
    if (index > 0 && moved[index - 1]) runs[runs.length - 1].push(block.id);
    else runs.push([block.id]);
  });
  return runs;
}

/** The blocks a move of `ids` takes, each with its nested blocks, in document order. Null when an id is missing. */
export function movedBlockIds(doc: EngineDoc, ids: readonly string[]): string[] | null {
  return movedRuns(doc, ids)?.flat() ?? null;
}

// Each run is moved to follow the one before it, and the first to follow the block that ends up above the drop.
function gather(tr: Transaction, runs: readonly string[][], above: string | null): void {
  let anchor = above;
  for (const run of runs) {
    const from = requireBlockIndex(tr.doc, run[0]);
    const at = anchor === null ? -1 : requireBlockIndex(tr.doc, anchor);
    const to = at < from ? at + 1 : at + 1 - run.length;
    if (to !== from) tr.step(moveBlocksStep(from, run.length, to));
    anchor = run[run.length - 1];
  }
}

function reindent(tr: Transaction, start: number, count: number, indent: number): void {
  const delta = indent - tr.doc.blocks[start].indent;
  for (const block of tr.doc.blocks.slice(start, start + count)) {
    const next = Math.max(0, block.indent + delta);
    if (next !== block.indent) tr.step(setIndentStep(block.id, next));
  }
  capIndents(tr, start, start + count);
}

/** Moves the blocks and their nested blocks to `toIndex`, counted among the blocks that stay, as one range. */
export function moveBlocksTo(ids: readonly string[], toIndex: number, indent: number): Command {
  return (state, dispatch) => {
    const { doc } = state;
    const runs = movedRuns(doc, ids);
    if (runs === null || runs.length === 0) return false;
    const moved = new Set(runs.flat());
    const rest = doc.blocks.filter((block) => !moved.has(block.id));
    if (toIndex < 0 || toIndex > rest.length) return false;
    const above = toIndex > 0 ? rest[toIndex - 1] : null;
    const tr = new Transaction(state);
    gather(tr, runs, above?.id ?? null);
    const first = runs[0][0];
    const last = runs[runs.length - 1];
    const clamped = Math.min(Math.max(indent, 0), above ? above.indent + 1 : 0);
    reindent(tr, requireBlockIndex(tr.doc, first), moved.size, clamped);
    if (!tr.docChanged) return false;
    dispatch?.(tr.setSelection(blockRangeSelection(first, last[last.length - 1])));
    return true;
  };
}
