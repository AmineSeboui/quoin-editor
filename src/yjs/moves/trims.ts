import type * as Y from 'yjs';
import { regionsOf } from '../doc-shape';
import { copied, copyOf, type Authority } from './authority';
import { deleteUnits, writeRecord, type Context } from './context';
import { appendId, idsOf, type Id, type Run } from './ids';
import { liveCopies, textOfUnit } from './live';
import type { KnownRecord } from './record';
import { blockOfRecord } from './record-block';
import { textId } from './text-units';

// A split left with none of its copies, and with nothing else in its block, deletes the block.
function dropBlock(context: Context, block: Y.Map<unknown>, redirect: readonly (readonly [Id, Id])[]): void {
  for (const region of regionsOf(block).values()) {
    const from: Run[] = [];
    const to: Run[] = [];
    for (const [copy, instead] of redirect) {
      if (textOfUnit(context.doc, copy) !== region) continue;
      appendId(from, copy);
      appendId(to, instead);
    }
    writeRecord(context, { kind: 'join', writer: context.me, sv: {}, source: textId(region), from, to, all: true });
  }
  const index = context.blocks.toArray().indexOf(block);
  if (index >= 0) context.blocks.delete(index, 1);
}

/**
 * Takes back this client's copies of characters another record now decides about, pointing each at the copy that
 * stands instead. A split whose copies all went deletes the block it made.
 */
export function trimOwn(context: Context, records: readonly KnownRecord[], owner: Authority): void {
  for (const record of records) {
    if (record.writer !== context.me || record.kind === 'map' || record.all === true) continue;
    const block = record.kind === 'split' ? blockOfRecord(context, record) : null;
    const from: Run[] = [];
    const to: Run[] = [];
    const redirect: [Id, Id][] = [];
    const gone: Id[] = [];
    let kept = 0;
    for (const source of idsOf(record.from)) {
      const copy = copyOf(record, source);
      const decider = owner.of(source);
      if (decider === null || decider.key === record.key || context.index.isTrimmed(copy)) {
        kept += context.index.isTrimmed(copy) ? 0 : 1;
        continue;
      }
      const instead = copied(decider, source) ? copyOf(decider, source) : source;
      gone.push(...liveCopies(context.doc, context.index, copy));
      appendId(from, copy);
      appendId(to, instead);
      redirect.push([copy, instead]);
    }
    if (from.length === 0) continue;
    deleteUnits(context, gone);
    writeRecord(context, { kind: 'map', writer: context.me, sv: {}, source: record.source, from, to });
    const emptied = block !== null && [...regionsOf(block).values()].every((text) => text.length === 0);
    if (block !== null && kept === 0 && emptied) dropBlock(context, block, redirect);
  }
}
