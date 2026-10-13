import { describe, expect, it } from 'vitest';
import { createDoc } from '../model/doc';
import type { QuoinBlock } from '../model/quoin-block';
import type { EngineBlock } from '../model/types';
import { createSchema } from '../schema/create-schema';
import { createBlockCodec } from './codec';

const make = () => {
  let n = 0;
  return createBlockCodec(createSchema(), { newId: () => `n${++n}` });
};
const legacy = (markdown: string, extra: Record<string, unknown> = {}, indent?: number): QuoinBlock => ({
  id: 'a',
  type: 'MARKDOWN',
  data: { markdown, ...extra },
  ...(indent ? { indent } : {}),
});

describe('legacy MARKDOWN splitting', () => {
  it('replaces a block that parses to one non-text block', () => {
    const doc = make().docFromBlocks([legacy('---'), legacy('$$\nx\n$$')]);
    expect(doc.blocks.map((b) => [b.id, b.type])).toEqual([
      ['a', 'DIVIDER'],
      ['n1', 'MATH'],
    ]);
  });

  it.each(['| a | b |', '```a```', '<details', 'line one\nline two', '- [ ] one\ncontinued', '\n\n', '   \n'])(
    'keeps %j as the one block it was',
    (markdown) => {
      const codec = make();
      const block = legacy(markdown);
      const doc = codec.docFromBlocks([block]);
      expect(doc.blocks).toHaveLength(1);
      expect(doc.blocks[0].type).toBe('MARKDOWN');
      expect(codec.blocksFromDoc(doc)[0]).toBe(block);
    },
  );

  it('leaves other block types and non string data alone', () => {
    const codec = make();
    const plugin: QuoinBlock = { id: 'p', type: 'PLUGIN', data: { markdown: 'a\n\nb' } };
    const odd: QuoinBlock = { id: 'o', type: 'MARKDOWN', data: { markdown: 5 } };
    const doc = codec.docFromBlocks([plugin, odd]);
    expect(doc.blocks.map((b) => b.type)).toEqual(['PLUGIN', 'MARKDOWN']);
    expect(codec.blocksFromDoc(doc)).toEqual([plugin, odd]);
  });

  it('adds the base indent to nested pieces', () => {
    const doc = make().docFromBlocks([legacy('- a\n  - b\n\ntext', {}, 2)]);
    expect(doc.blocks.map((b) => b.indent)).toEqual([2, 3, 2]);
  });

  it('puts the extra data of the original on the first piece only', () => {
    const codec = make();
    const block = legacy('# Title\n\ntext', { align: 'center', color: 'red', background: 'blue', custom: 1 });
    const doc = codec.docFromBlocks([block]);
    expect(doc.blocks[0].attrs).toMatchObject({ kind: 'heading', align: 'center', color: 'red', background: 'blue' });
    expect(doc.blocks[0].attrs.extra).toEqual({ custom: 1 });
    expect(doc.blocks[1].attrs).toEqual({ kind: 'paragraph' });
    const edited = { ...doc.blocks[1], regions: { text: [] } };
    expect(codec.blocksFromDoc(createDoc([doc.blocks[0], edited]))).toEqual([
      { id: 'a', type: 'MARKDOWN', data: { markdown: '# Title', align: 'center', color: 'red', background: 'blue', custom: 1 } },
      { id: 'a-2', type: 'MARKDOWN', data: { markdown: '' } },
    ]);
  });

  it('keeps the extra data when the first piece is not a text block', () => {
    const codec = make();
    const doc = codec.docFromBlocks([legacy('```\nx\n```\n\ntext', { custom: 1 })]);
    const edited: EngineBlock = { ...doc.blocks[1], regions: { text: [] } };
    expect(codec.blocksFromDoc(createDoc([doc.blocks[0], edited]))[0]).toEqual({
      id: 'a',
      type: 'CODE',
      data: { language: '', code: 'x', custom: 1 },
    });
  });

  it('returns the same engine blocks for the same original and still emits the original', () => {
    const codec = make();
    const block = legacy('# T\n\ntext');
    const first = codec.toEngineBlocks(block);
    const second = codec.toEngineBlocks(block);
    expect(second).toEqual(first);
    expect(second[0]).toBe(first[0]);
    expect(codec.blocksFromDoc(createDoc(second))).toEqual([block]);
    expect(codec.blocksFromDoc(createDoc(second))[0]).toBe(block);
  });

  it('emits pieces individually when another block sits between them or the pieces are cut', () => {
    const codec = make();
    const [head, tail] = codec.toEngineBlocks(legacy('# T\n\ntext'));
    const between = codec.toEngineBlocks({ id: 'x', type: 'MARKDOWN', data: { markdown: 'between' } })[0];
    expect(codec.blocksFromDoc(createDoc([head, between, tail])).map((b) => b.id)).toEqual(['a', 'x', 'a-2']);
    expect(codec.blocksFromDoc(createDoc([head])).map((b) => b.id)).toEqual(['a']);
    expect(codec.blocksFromDoc(createDoc([tail])).map((b) => b.id)).toEqual(['a-2']);
  });

  it('emits two legacy blocks side by side as their originals', () => {
    const codec = make();
    const one = legacy('# T\n\ntext');
    const two: QuoinBlock = { ...legacy('- a\n- b'), id: 'two' };
    const doc = codec.docFromBlocks([one, two]);
    expect(doc.blocks).toHaveLength(4);
    const out = codec.blocksFromDoc(doc);
    expect(out[0]).toBe(one);
    expect(out[1]).toBe(two);
  });

  it('gives a repeated original id to the first piece only once', () => {
    const codec = make();
    const doc = codec.docFromBlocks([legacy('# T\n\ntext'), legacy('# U\n\nmore')]);
    expect(new Set(doc.blocks.map((b) => b.id)).size).toBe(4);
  });
});

describe('MARKDOWN blocks the engine writes', () => {
  const roundTrip = (attrs: EngineBlock['attrs'], text: string) => {
    const codec = make();
    const block: EngineBlock = {
      id: 'b',
      type: 'MARKDOWN',
      indent: 0,
      attrs,
      regions: { text: [{ kind: 'text', text, marks: [] }] },
    };
    const data = codec.toQuoin(block).data;
    return { data, back: codec.toEngineBlocks({ id: 'b', type: 'MARKDOWN', data }) };
  };

  it('writes a heading hard break as br on one line, and reads it back as one block', () => {
    const { data, back } = roundTrip({ kind: 'heading', level: 2 }, 'a\nb');
    expect(data.markdown).toBe('## a<br>b');
    expect(back).toHaveLength(1);
    expect(back[0].regions.text).toEqual([{ kind: 'text', text: 'a\nb', marks: [] }]);
  });

  it.each([
    [{ kind: 'paragraph' }, 'a|b\n|-|-|'],
    [{ kind: 'paragraph' }, 'a\n- b'],
    [{ kind: 'paragraph' }, 'a\n    code'],
    [{ kind: 'bullet' }, 'a\n```'],
    [{ kind: 'quote' }, 'a\n# b'],
    [{ kind: 'task', checked: true }, 'a\n$$'],
    [{ kind: 'ordered', start: 3 }, 'a\n<details>'],
    [{ kind: 'heading', level: 1 }, 'a\n==='],
  ])('keeps %j with the text %j as one block', (attrs, text) => {
    expect(roundTrip(attrs, text).back).toHaveLength(1);
  });
});
