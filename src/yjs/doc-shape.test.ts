import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { atom, text } from '../engine/model/inline';
import type { EngineBlock } from '../engine/model/types';
import { sameDoc } from '../engine/model/same-doc';
import { writeBlocks } from './doc-shape';
import { readShared } from './read-shared';
import { arbitraryEngineDoc } from './test-support/engine-doc-arbitrary';
import { heldPlainly } from './test-support/layout-shape';

function stored(blocks: readonly EngineBlock[]) {
  const shared = new Y.Doc().getText('quoin');
  writeBlocks(shared, 0, blocks);
  return shared;
}

const paragraph: EngineBlock = {
  id: 'a',
  type: 'MARKDOWN',
  indent: 1,
  attrs: { kind: 'heading', level: 2 },
  regions: {
    text: [
      text('bold', [{ type: 'bold' }]),
      text('link', [{ type: 'link', attrs: { href: 'https://a.b', title: 'A' } }]),
      text('red', [{ type: 'color', attrs: { color: 'red' } }]),
      text('noted', [
        { type: 'comment', attrs: { id: 'c1' } },
        { type: 'comment', attrs: { id: 'c2' } },
      ]),
      atom('mention', { id: 'u1', label: 'Ada' }, [{ type: 'italic' }]),
    ],
  },
};

const divider: EngineBlock = { id: 'd', type: 'DIVIDER', indent: 0, attrs: {}, regions: {} };
const callout: EngineBlock = {
  id: 'c',
  type: 'CALLOUT',
  indent: 0,
  attrs: { tone: 'info' },
  regions: { body: [text('hi')], note: [] },
};

type Op = { insert: unknown; attributes?: Record<string, unknown> };
const plain = (op: Op) => (op.insert instanceof Y.Map ? { ...op, insert: op.insert.toJSON() } : op);

describe('the shape of a shared document', () => {
  it('starts each block with a marker map of id, type, indent and attrs, and each region with its name', () => {
    const delta = (stored([divider, callout]).toDelta() as Op[]).map(plain);
    expect(delta).toEqual([
      { insert: { id: 'd', type: 'DIVIDER', indent: 0, attrs: {} } },
      { insert: { id: 'c', type: 'CALLOUT', indent: 0, attrs: { tone: 'info' } } },
      { insert: { r: 'body' } },
      { insert: 'hi' },
      { insert: { r: 'note' } },
    ]);
    const marker = (stored([callout]).toDelta() as Op[])[0].insert as Y.Map<unknown>;
    expect(marker.get('attrs')).toBeInstanceOf(Y.Map);
  });

  it('keeps marks as formatting attributes and atoms as embeds', () => {
    const delta = stored([paragraph]).toDelta() as Op[];
    expect(delta.slice(1).map(plain)).toEqual([
      { insert: { r: 'text' } },
      { insert: 'bold', attributes: { bold: true } },
      { insert: 'link', attributes: { link: { href: 'https://a.b', title: 'A' } } },
      { insert: 'red', attributes: { color: 'red' } },
      { insert: 'noted', attributes: { 'comment:c1': true, 'comment:c2': true } },
      { insert: { atom: 'mention', attrs: { id: 'u1', label: 'Ada' } }, attributes: { italic: true } },
    ]);
  });

  it('reads back every document it stores, unknown types and marks included', () => {
    fc.assert(
      fc.property(arbitraryEngineDoc, (doc) => {
        const back = readShared(stored(doc.blocks));
        expect(sameDoc(back.doc, doc)).toBe(true);
        expect(heldPlainly(back.layout)).toBe(true);
      }),
      { seed: 20261021, numRuns: 500 },
    );
  });
});
