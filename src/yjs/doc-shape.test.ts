import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { atom, text } from '../engine/model/inline';
import type { EngineBlock } from '../engine/model/types';
import { sameDoc } from '../engine/model/same-doc';
import { createDoc } from '../engine/model/doc';
import { fromYBlock, toYBlock, type YBlock } from './doc-shape';
import { arbitraryEngineDoc } from './test-support/engine-doc-arbitrary';

function stored(blocks: readonly EngineBlock[]) {
  const shared = new Y.Doc().getArray<YBlock>('quoin');
  shared.insert(0, blocks.map(toYBlock));
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

describe('the shape of a block in a shared document', () => {
  it('is a map of id, type, indent, attrs and regions of text', () => {
    const block = stored([paragraph]).get(0);
    expect(block.get('id')).toBe('a');
    expect(block.get('type')).toBe('MARKDOWN');
    expect(block.get('indent')).toBe(1);
    expect((block.get('attrs') as Y.Map<unknown>).toJSON()).toEqual({ kind: 'heading', level: 2 });
    expect([...(block.get('regions') as Y.Map<Y.Text>).keys()]).toEqual(['text']);
  });

  it('keeps marks as formatting attributes and atoms as embeds', () => {
    const region = (stored([paragraph]).get(0).get('regions') as Y.Map<Y.Text>).get('text')!;
    expect(region.toDelta()).toEqual([
      { insert: 'bold', attributes: { bold: true } },
      { insert: 'link', attributes: { link: { href: 'https://a.b', title: 'A' } } },
      { insert: 'red', attributes: { color: 'red' } },
      { insert: 'noted', attributes: { 'comment:c1': true, 'comment:c2': true } },
      { insert: { atom: 'mention', attrs: { id: 'u1', label: 'Ada' } }, attributes: { italic: true } },
    ]);
  });

  it('reads back every block it stores, unknown types and marks included', () => {
    fc.assert(
      fc.property(arbitraryEngineDoc, (doc) => {
        const back = createDoc(stored(doc.blocks).toArray().map(fromYBlock));
        expect(sameDoc(back, doc)).toBe(true);
      }),
      { seed: 20261021, numRuns: 500 },
    );
  });
});
