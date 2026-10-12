import { describe, expect, it } from 'vitest';
import { createSchema } from '../schema/create-schema';
import { createBlockCodec } from './codec';
import type { QuoinBlock } from '../model/quoin-block';

const codec = () => {
  let n = 0;
  return createBlockCodec(createSchema(), { newId: () => `n${++n}` });
};

describe('block codec', () => {
  it('returns the identical QuoinBlock for an engine block it has not changed', () => {
    const c = codec();
    const blocks: QuoinBlock[] = [
      { id: 'a', type: 'MARKDOWN', data: { markdown: 'x' } },
      { id: 'b', type: 'CODE', data: { language: '', code: '' }, indent: 2 },
    ];
    const doc = c.docFromBlocks(blocks);
    const out = c.blocksFromDoc(doc);
    expect(out[0]).toBe(blocks[0]);
    expect(out[1]).toBe(blocks[1]);
  });

  it('reads indent and omits it when zero', () => {
    const c = codec();
    const doc = c.docFromBlocks([{ id: 'a', type: 'MARKDOWN', data: { markdown: 'x' }, indent: 1 }]);
    expect(doc.blocks[0].indent).toBe(1);
    const changed = { ...doc.blocks[0], indent: 0 };
    expect(c.toQuoin(changed)).toEqual({ id: 'a', type: 'MARKDOWN', data: { markdown: 'x' } });
  });

  it('gives a repeated id a fresh one instead of failing', () => {
    const c = codec();
    const doc = c.docFromBlocks([
      { id: 'a', type: 'DIVIDER', data: {} },
      { id: 'a', type: 'DIVIDER', data: {} },
    ]);
    expect(doc.blocks.map((b) => b.id)).toEqual(['a', 'n1']);
  });

  it('serializes a changed engine block to a new QuoinBlock', () => {
    const c = codec();
    const doc = c.docFromBlocks([{ id: 'a', type: 'MARKDOWN', data: { markdown: 'x' } }]);
    const edited = { ...doc.blocks[0], attrs: { ...doc.blocks[0].attrs, kind: 'heading', level: 1 } };
    expect(c.toQuoin(edited)).toEqual({ id: 'a', type: 'MARKDOWN', data: { markdown: '# x' } });
  });
});

describe('block codec caching and boundaries', () => {
  it('returns the same engine blocks for the same QuoinBlock object', () => {
    const c = codec();
    const block: QuoinBlock = { id: 'a', type: 'MARKDOWN', data: { markdown: 'x' } };
    const first = c.toEngineBlocks(block);
    expect(c.toEngineBlocks(block)[0]).toBe(first[0]);
    first.pop();
    expect(c.toEngineBlocks(block)).toHaveLength(1);
  });

  it('parses a second QuoinBlock with equal content separately', () => {
    const c = codec();
    const one: QuoinBlock = { id: 'a', type: 'MARKDOWN', data: { markdown: 'x' } };
    const two: QuoinBlock = { id: 'a', type: 'MARKDOWN', data: { markdown: 'x' } };
    expect(c.toEngineBlocks(one)[0]).not.toBe(c.toEngineBlocks(two)[0]);
  });

  it('serializes an edited block once and returns the same QuoinBlock afterwards', () => {
    const c = codec();
    const [block] = c.toEngineBlocks({ id: 'a', type: 'MARKDOWN', data: { markdown: 'x' } });
    const edited = { ...block, indent: 3 };
    const quoin = c.toQuoin(edited);
    expect(quoin).toEqual({ id: 'a', type: 'MARKDOWN', data: { markdown: 'x' }, indent: 3 });
    expect(c.toQuoin(edited)).toBe(quoin);
  });

  it('keeps unedited blocks identical while only the edited one is rebuilt', () => {
    const c = codec();
    const blocks: QuoinBlock[] = [
      { id: 'a', type: 'MARKDOWN', data: { markdown: 'one' } },
      { id: 'b', type: 'MARKDOWN', data: { markdown: 'two' } },
    ];
    const doc = c.docFromBlocks(blocks);
    const next = { ...doc, blocks: [doc.blocks[0], { ...doc.blocks[1], attrs: { kind: 'quote' } }] };
    const out = c.blocksFromDoc(next);
    expect(out[0]).toBe(blocks[0]);
    expect(out[1]).toEqual({ id: 'b', type: 'MARKDOWN', data: { markdown: '> two' } });
  });

  it('reads a bad indent as zero', () => {
    const c = codec();
    const indents = [-1, 1.5, Number.NaN, '2' as unknown as number, undefined];
    for (const indent of indents) {
      const [block] = c.toEngineBlocks({ id: 'a', type: 'DIVIDER', data: {}, indent });
      expect(block.indent).toBe(0);
    }
  });

  it('converts a type the schema does not hold and hands its data back', () => {
    const c = codec();
    const data = { anything: [1, 2] };
    const doc = c.docFromBlocks([{ id: 'p', type: 'PLUGIN', data }]);
    expect(doc.blocks[0]).toMatchObject({ id: 'p', type: 'PLUGIN', indent: 0, attrs: { data } });
    expect(c.toQuoin({ ...doc.blocks[0] }).data).toBe(data);
  });

  it('indexes the document by id', () => {
    const c = codec();
    const doc = c.docFromBlocks([
      { id: 'a', type: 'DIVIDER', data: {} },
      { id: 'b', type: 'TOC', data: {} },
    ]);
    expect(doc.index.get('b')).toBe(1);
    expect(c.docFromBlocks([]).blocks).toEqual([]);
  });

  it('gives a repeated QuoinBlock object a fresh id for its second copy', () => {
    const c = codec();
    const block: QuoinBlock = { id: 'a', type: 'DIVIDER', data: {} };
    const doc = c.docFromBlocks([block, block]);
    expect(doc.blocks.map((b) => b.id)).toEqual(['a', 'n1']);
    const out = c.blocksFromDoc(doc);
    expect(out[0]).toBe(block);
    expect(out[1]).toEqual({ id: 'n1', type: 'DIVIDER', data: {} });
  });

  it('uses the context for inline parsing and for new ids', () => {
    const c = codec();
    expect(c.context.inline.parse('**x**')).toHaveLength(1);
    expect(c.context.newId()).toBe('n1');
  });

  it('mints ids of its own when it is given none', () => {
    const c = createBlockCodec(createSchema());
    expect(c.context.newId()).not.toBe(c.context.newId());
  });
});
