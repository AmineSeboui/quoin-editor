import * as Y from 'yjs';
import { attrsOf, idOf, regionsOf, type YBlock } from '../doc-shape';
import type { Authority } from './authority';
import { writeRecord, type Context } from './context';
import { idAt, toRuns } from './ids';
import type { KnownRecord } from './record';
import { blockOfRecord } from './record-block';
import { seenOf } from './seen';
import { insertPieces, type Piece } from './text-edit';
import { textId, units, visibleIds } from './text-units';

/** Moves `block` to right after `after`, writing each region's copy as a join so others' typing in it follows. */
function moveAfter(context: Context, block: YBlock, after: YBlock): void {
  const { blocks, doc } = context;
  const state = Y.decodeStateVector(Y.encodeStateVector(doc));
  const regions = [...regionsOf(block).entries()].map(([name, text]) => ({
    name,
    text,
    pieces: (text.toDelta() as Piece[]).map(({ insert, attributes }) => ({ insert, attributes: attributes ?? {} })),
    from: visibleIds(text, 0, text.length),
    sv: seenOf(units(text), state, context.index.over(textId(text)).map(({ writer }) => writer)),
  }));
  const copy = new Y.Map<unknown>([
    ['id', idOf(block)],
    ['type', block.get('type')],
    ['indent', block.get('indent')],
    ['attrs', new Y.Map(Object.entries(attrsOf(block).toJSON()))],
    ['regions', new Y.Map(regions.map(({ name }) => [name, new Y.Text()]))],
  ]);
  blocks.delete(blocks.toArray().indexOf(block), 1);
  blocks.insert(blocks.toArray().indexOf(after) + 1, [copy]);
  for (const { name, text, pieces, from, sv } of regions) {
    const target = regionsOf(copy).get(name)!;
    const to = insertPieces(target, 0, pieces);
    const anchor = Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(target, 0));
    const source = textId(text);
    writeRecord(context, { kind: 'join', writer: context.me, sv, source, from: toRuns(from), to: toRuns(to), anchor });
  }
}

/**
 * Two splits of one text made at once each made a block. The one that split later in the text holds the later
 * characters, so its writer moves its block after the other's when the array put it first.
 */
export function orderOwnSplits(context: Context, records: readonly KnownRecord[], owner: Authority): void {
  const firstOf = (record: KnownRecord) => (record.from.length === 0 ? -1 : owner.ordinal(idAt(record.from, 0)));
  for (const mine of records) {
    if (mine.writer !== context.me || mine.kind !== 'split' || firstOf(mine) < 0) continue;
    for (const other of records) {
      if (other.kind !== 'split' || other.writer === context.me || firstOf(other) < 0) continue;
      if (firstOf(other) >= firstOf(mine)) continue;
      const block = blockOfRecord(context, mine);
      const before = blockOfRecord(context, other);
      if (block === null || before === null || block === before) continue;
      const list = context.blocks.toArray();
      if (list.indexOf(block) < list.indexOf(before)) moveAfter(context, block, before);
    }
  }
}
