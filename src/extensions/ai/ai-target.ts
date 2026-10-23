import type { EditorState, EngineBlock, EngineDoc, Pos, Transaction } from '../../engine';
import { regionLength } from '../../engine/commands/block-helpers';
import { comparePos, orderedRange } from '../../engine/model/position';
import { primaryRegion, selectedBlockIds } from '../../engine/state/selection';

/**
 * The text an AI request is about, from `from` to `to`. `selected` is false when it is the whole block the caret was
 * in, whose edges then take what is typed at them.
 */
export type AiTarget = {
  readonly from: Pos;
  readonly to: Pos;
  readonly selected: boolean;
  /**
   * Set once a block of the target is deleted: the target is then the edge of the block before it (`after`) or after
   * it, where the answer goes as blocks of its own.
   */
  readonly lost?: { readonly after: boolean };
};

/** One block's part of a target. */
export type TargetRange = { readonly block: string; readonly region: string; readonly from: number; readonly to: number };

export function targetOfBlocks(state: EditorState, ids: readonly string[]): AiTarget | null {
  const { doc, schema } = state;
  const first = doc.blocks[doc.index.get(ids[0]) ?? -1];
  const last = doc.blocks[doc.index.get(ids[ids.length - 1]) ?? -1];
  if (first === undefined || last === undefined) return null;
  const start = primaryRegion(schema, first);
  const end = primaryRegion(schema, last);
  if (start === null || end === null) return null;
  const from = { block: first.id, region: start, offset: 0 };
  return { from, to: { block: last.id, region: end, offset: regionLength(last, end) }, selected: ids.length > 1 };
}

/** The selected text, or the whole block the caret is in, or the selected blocks. */
export function targetOfSelection(state: EditorState): AiTarget | null {
  const { doc, selection } = state;
  if (selection === null) return null;
  if (selection.kind !== 'text') return targetOfBlocks(state, selectedBlockIds(doc, selection));
  const { from, to } = orderedRange(doc, selection.anchor, selection.head);
  if (comparePos(doc, from, to) !== 0) return { from, to, selected: true };
  const block = doc.blocks[doc.index.get(from.block)!];
  const whole = { block: from.block, region: from.region };
  return { from: { ...whole, offset: 0 }, to: { ...whole, offset: regionLength(block, from.region) }, selected: false };
}

// The nearest block on either side of the target's blocks that the change left, from the document before it.
function nearestKept(tr: Transaction, target: AiTarget): EngineBlock | undefined {
  const { doc } = tr.before;
  const first = doc.index.get(target.from.block) ?? 0;
  const last = doc.index.get(target.to.block) ?? first;
  const kept = (block: EngineBlock | undefined) => block && tr.doc.blocks[tr.doc.index.get(block.id) ?? -1];
  for (let step = 1; first - step >= 0 || last + step < doc.blocks.length; step++) {
    const found = kept(doc.blocks[first - step]) ?? kept(doc.blocks[last + step]);
    if (found) return found;
  }
  return tr.doc.blocks[0];
}

// Where the deletion of a target's block collapsed, the target becomes the edge of the block it collapsed into: the
// answer goes as blocks of their own after it, or before it from the start of a block with text.
function edgeOf(tr: Transaction, target: AiTarget): AiTarget | null {
  const point = tr.mapPos(target.from, -1);
  const block = tr.doc.blocks[tr.doc.index.get(point.block) ?? -1] ?? nearestKept(tr, target);
  if (block === undefined) return null;
  const region = primaryRegion(tr.before.schema, block) ?? '';
  const length = region === '' ? 0 : regionLength(block, region);
  const offset = block.id === point.block ? Math.min(point.offset, length) : length;
  const after = offset > 0 || length === 0;
  const at = { block: block.id, region, offset: after ? length : 0 };
  return { from: at, to: at, selected: true, lost: { after } };
}

/** The target where the transaction moved it, or null when nothing of the document around it is left. */
export function mapTarget(tr: Transaction, target: AiTarget): AiTarget | null {
  if (!tr.doc.index.has(target.from.block) || !tr.doc.index.has(target.to.block)) return edgeOf(tr, target);
  const inside = target.selected ? 1 : -1;
  const from = tr.mapPos(target.from, inside);
  const mapped = tr.mapPos(target.to, -inside as -1 | 1);
  if (!tr.doc.index.has(from.block) || !tr.doc.index.has(mapped.block)) return edgeOf(tr, target);
  const to = comparePos(tr.doc, from, mapped) > 0 ? from : mapped;
  return from === target.from && to === target.to ? target : { ...target, from, to };
}

/** Whether the target's text has all been deleted. */
export const targetGone = (doc: EngineDoc, target: AiTarget): boolean =>
  target.lost !== undefined || (target.selected && comparePos(doc, target.from, target.to) === 0);

/** The parts of a target, block by block, in the region of each it covers. */
export function targetRanges(state: EditorState, { from, to }: AiTarget): TargetRange[] {
  const { doc, schema } = state;
  const start = doc.index.get(from.block)!;
  const end = doc.index.get(to.block)!;
  return doc.blocks.slice(start, end + 1).flatMap((block, i): TargetRange[] => {
    const region = i === 0 ? from.region : block.id === to.block ? to.region : primaryRegion(schema, block);
    if (region === null || !Object.hasOwn(block.regions, region)) return [];
    const left = i === 0 ? from.offset : 0;
    const right = block.id === to.block ? to.offset : regionLength(block, region);
    return right > left ? [{ block: block.id, region, from: left, to: right }] : [];
  });
}
