import { describe, expect, it } from 'vitest';
import { createDoc } from '../model/doc';
import { createSchema } from '../schema/create-schema';
import { createBlockCodec } from './codec';

describe('0.4 MARKDOWN blocks', () => {
  const make = () => {
    let n = 0;
    return createBlockCodec(createSchema(), { newId: () => `n${++n}` });
  };
  const legacy = { id: 'a', type: 'MARKDOWN', data: { markdown: '# Notes\n\n- one\n- two\n\n```\ncode\n```' }, indent: 1 };

  it('splits a multi-node block into engine blocks, keeping the first id and the base indent', () => {
    const doc = make().docFromBlocks([legacy]);
    expect(doc.blocks.map((b) => [b.id, b.type, b.indent])).toEqual([
      ['a', 'MARKDOWN', 1],
      ['n1', 'MARKDOWN', 1],
      ['n2', 'MARKDOWN', 1],
      ['n3', 'CODE', 1],
    ]);
  });

  it('emits the original block, untouched, while its pieces are unchanged and together', () => {
    const codec = make();
    const after = { id: 'z', type: 'MARKDOWN', data: { markdown: 'after' } };
    const doc = codec.docFromBlocks([legacy, after]);
    const out = codec.blocksFromDoc(doc);
    expect(out).toHaveLength(2);
    expect(out[0]).toBe(legacy);
    expect(out[1]).toBe(after);
  });

  it('emits the split form once any piece changes, moves or is removed', () => {
    const codec = make();
    const doc = codec.docFromBlocks([legacy]);
    const edited = { ...doc.blocks[1], attrs: { ...doc.blocks[1].attrs, kind: 'task', checked: false } };
    expect(codec.blocksFromDoc(createDoc([doc.blocks[0], edited, doc.blocks[2], doc.blocks[3]]))).toEqual([
      { id: 'a', type: 'MARKDOWN', data: { markdown: '# Notes' }, indent: 1 },
      { id: 'n1', type: 'MARKDOWN', data: { markdown: '- [ ] one' }, indent: 1 },
      { id: 'n2', type: 'MARKDOWN', data: { markdown: '- two' }, indent: 1 },
      { id: 'n3', type: 'CODE', data: { language: '', code: 'code' }, indent: 1 },
    ]);
    expect(codec.blocksFromDoc(createDoc([doc.blocks[1], doc.blocks[0], doc.blocks[2], doc.blocks[3]]))).toHaveLength(4);
    expect(codec.blocksFromDoc(createDoc([doc.blocks[0], doc.blocks[2], doc.blocks[3]]))).toHaveLength(3);
  });

  it('keeps a single paragraph with line breaks as one block and its identity', () => {
    const codec = make();
    const block = { id: 'a', type: 'MARKDOWN', data: { markdown: 'line one\nline two' } };
    const doc = codec.docFromBlocks([block]);
    expect(doc.blocks).toHaveLength(1);
    expect(codec.blocksFromDoc(doc)[0]).toBe(block);
  });
});
