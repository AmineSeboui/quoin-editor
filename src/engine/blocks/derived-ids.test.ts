import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../model/quoin-block';
import { engineBlocksOf } from '../render/engine-blocks';
import { toHTML } from '../render/to-html';
import { toPlainText } from '../render/to-plain-text';
import { createSchema } from '../schema/create-schema';
import { createBlockCodec } from './codec';

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });
const LEGACY = md('a', '# one\n\ntwo\n\n- three');
const REAL_2 = md('a-2', 'real two');
const REAL_3 = md('a-3', 'real three');

const codec = (prefix = 'n') => {
  let n = 0;
  return createBlockCodec(createSchema(), { newId: () => `${prefix}${++n}` });
};
const ids = (blocks: readonly { id: string }[]) => blocks.map((block) => block.id);

describe('ids of split pieces beside real blocks', () => {
  it.each([
    ['before', [LEGACY, REAL_2, REAL_3], ['a', 'a-4', 'a-5', 'a-2', 'a-3']],
    ['between', [REAL_2, LEGACY, REAL_3], ['a-2', 'a', 'a-4', 'a-5', 'a-3']],
    ['after', [REAL_2, REAL_3, LEGACY], ['a-2', 'a-3', 'a', 'a-4', 'a-5']],
  ])('skip the ids of real blocks when the legacy block comes %s them, in every codec', (_, blocks, expected) => {
    expect(ids(codec('n').docFromBlocks(blocks).blocks)).toEqual(expected);
    expect(ids(codec('m').docFromBlocks(blocks).blocks)).toEqual(expected);
    expect(ids(engineBlocksOf(blocks, createSchema()))).toEqual(expected);
  });

  it('leave every real block and the untouched legacy block as the same objects', () => {
    const blocks = [LEGACY, REAL_2, REAL_3];
    const loaded = codec();
    const back = loaded.blocksFromDoc(loaded.docFromBlocks(blocks));
    expect(back).toHaveLength(3);
    back.forEach((block, i) => expect(block).toBe(blocks[i]));
  });

  it('move on to free ids once a real block takes an id the cached pieces had', () => {
    const loaded = codec();
    expect(ids(loaded.docFromBlocks([LEGACY]).blocks)).toEqual(['a', 'a-2', 'a-3']);
    const blocks = [LEGACY, REAL_2];
    const doc = loaded.docFromBlocks(blocks);
    expect(ids(doc.blocks)).toEqual(['a', 'a-3', 'a-4', 'a-2']);
    loaded.blocksFromDoc(doc).forEach((block, i) => expect(block).toBe(blocks[i]));
  });
});

describe('ids of split pieces after a real block goes away', () => {
  it('match those of a codec that never saw the real block', () => {
    const loaded = codec();
    loaded.docFromBlocks([LEGACY, REAL_2]);
    const later = [LEGACY, md('x', 'x')];
    expect(ids(loaded.docFromBlocks(later).blocks)).toEqual(ids(codec().docFromBlocks(later).blocks));
    expect(ids(loaded.docFromBlocks(later).blocks)).toEqual(['a', 'a-2', 'a-3', 'x']);
  });
});

describe('documents with repeated ids', () => {
  const REPEATED = [md('split', '# one\n\ntwo\n\nthree'), md('y', 'y'), md('y', 'y'), md('y', 'y'), md('y', 'y')];

  it('render and read as text without throwing', () => {
    expect(() => toHTML(REPEATED)).not.toThrow();
    expect(toPlainText(REPEATED)).toBe('one\ntwo\nthree\ny\ny\ny\ny');
    const all = ids(engineBlocksOf(REPEATED, createSchema()));
    expect(new Set(all).size).toBe(all.length);
  });

  it('get unique ids even from an id source that repeats itself', () => {
    const repeating = createBlockCodec(createSchema(), { newId: () => 'a-2' });
    const all = ids(repeating.docFromBlocks([LEGACY, REAL_2, md('a', 'again'), md('a', 'more')]).blocks);
    expect(all).toEqual(['a', 'a-3', 'a-4', 'a-2', 'a-2-2', 'a-2-3']);
  });
});
