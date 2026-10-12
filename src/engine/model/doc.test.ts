import { describe, expect, it } from 'vitest';
import { blockById, createDoc, indexOfBlock, replaceBlocks, updateBlock } from './doc';
import type { EngineBlock } from './types';

const block = (id: string): EngineBlock => ({ id, type: 'MARKDOWN', indent: 0, attrs: {}, regions: {} });

describe('doc', () => {
  const doc = createDoc([block('a'), block('b')]);

  it('indexes blocks by id', () => {
    expect(indexOfBlock(doc, 'b')).toBe(1);
    expect(indexOfBlock(doc, 'z')).toBe(-1);
    expect(blockById(doc, 'a')).toBe(doc.blocks[0]);
    expect(blockById(doc, 'z')).toBeUndefined();
  });

  it('rejects duplicate ids', () => {
    expect(() => createDoc([block('a'), block('a')])).toThrow(/duplicate block id "a"/);
  });

  it('updates one block and keeps the others by identity', () => {
    const next = updateBlock(doc, 'b', (b) => ({ ...b, indent: 1 }));
    expect(next.blocks[0]).toBe(doc.blocks[0]);
    expect(next.blocks[1].indent).toBe(1);
    expect(doc.blocks[1].indent).toBe(0);
  });

  it('reindexes when an update changes the id', () => {
    const next = updateBlock(doc, 'b', (b) => ({ ...b, id: 'c' }));
    expect(indexOfBlock(next, 'c')).toBe(1);
    expect(indexOfBlock(next, 'b')).toBe(-1);
    expect(() => updateBlock(doc, 'b', (b) => ({ ...b, id: 'a' }))).toThrow(/duplicate block id "a"/);
  });

  it('refuses to update a missing block', () => {
    expect(() => updateBlock(doc, 'z', (b) => b)).toThrow(/no block "z"/);
  });

  it('splices blocks', () => {
    const next = replaceBlocks(doc, 1, 1, [block('c'), block('d')]);
    expect(next.blocks.map((b) => b.id)).toEqual(['a', 'c', 'd']);
    expect(indexOfBlock(next, 'd')).toBe(2);
    expect(doc.blocks.map((b) => b.id)).toEqual(['a', 'b']);
  });

  it('rejects a splice outside the document', () => {
    expect(() => replaceBlocks(doc, 3, 0, [])).toThrow(RangeError);
    expect(() => replaceBlocks(doc, -1, 0, [])).toThrow(RangeError);
    expect(() => replaceBlocks(doc, 1, 2, [])).toThrow(RangeError);
    expect(() => replaceBlocks(doc, 0, -1, [])).toThrow(RangeError);
  });
});
