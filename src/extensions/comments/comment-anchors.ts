import { removeMarkStep, Transaction, type EditorState } from '../../engine';
import type { MarkRange } from '../../engine/commands/selection-marks';
import { blockById } from '../../engine/model/doc';
import { inlineText, nodeLength, sliceInline } from '../../engine/model/inline';
import type { EngineDoc, Inline, Pos } from '../../engine/model/types';

export type AnchorRange = MarkRange;

const idsOf = (node: Inline[number] | undefined): string[] =>
  node?.marks.flatMap((mark) => (mark.type === 'comment' && mark.attrs?.id ? [mark.attrs.id] : [])) ?? [];

function addRegion(anchors: Map<string, AnchorRange[]>, block: string, region: string, inline: Inline): void {
  let position = 0;
  for (const node of inline) {
    const from = position;
    position += nodeLength(node);
    for (const id of idsOf(node)) {
      const ranges = anchors.get(id) ?? [];
      const last = ranges[ranges.length - 1];
      const continues = last?.block === block && last.region === region && last.to === from;
      if (continues) ranges[ranges.length - 1] = { ...last, to: position };
      else ranges.push({ block, region, from, to: position });
      anchors.set(id, ranges);
    }
  }
}

const read = new WeakMap<EngineDoc, ReadonlyMap<string, readonly AnchorRange[]>>();

/** The text each comment thread is anchored to, by thread id: the runs its mark covers, in document order. */
export function commentAnchors(doc: EngineDoc): ReadonlyMap<string, readonly AnchorRange[]> {
  let anchors = read.get(doc);
  if (anchors === undefined) {
    const found = new Map<string, AnchorRange[]>();
    for (const block of doc.blocks) {
      for (const [region, inline] of Object.entries(block.regions)) addRegion(found, block.id, region, inline);
    }
    anchors = found;
    read.set(doc, anchors);
  }
  return anchors;
}

const atomLabel = (node: Inline[number]) => (node.kind === 'atom' ? (node.attrs.label ?? '') : '');

/** The text an anchor covers, its parts joined by a space. */
export function anchorText(doc: EngineDoc, ranges: readonly AnchorRange[]): string {
  return ranges
    .map(({ block, region, from, to }) => {
      const inline = blockById(doc, block)?.regions[region] ?? [];
      return inlineText(sliceInline(inline, from, to), atomLabel);
    })
    .join(' ');
}

/** The threads whose anchors take in the character before or after a caret. */
export function commentIdsAt(doc: EngineDoc, { block, region, offset }: Pos): string[] {
  const inline = blockById(doc, block)?.regions[region] ?? [];
  const ids = new Set<string>();
  let position = 0;
  for (const node of inline) {
    const end = position + nodeLength(node);
    if (position <= offset && offset <= end && end > position) idsOf(node).forEach((id) => ids.add(id));
    position = end;
  }
  return [...ids].sort();
}

/** A transaction taking a thread's mark off every part of its anchor, leaving the other threads' marks in place. */
export function threadRemoval(state: EditorState, id: string): Transaction {
  const tr = new Transaction(state).setOrigin('command');
  for (const { block, region, from, to } of commentAnchors(state.doc).get(id) ?? []) {
    tr.step(removeMarkStep(block, region, from, to, { type: 'comment', attrs: { id } }));
  }
  return tr;
}
