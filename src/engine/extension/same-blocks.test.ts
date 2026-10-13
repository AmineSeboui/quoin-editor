import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../model/quoin-block';
import { sameBlocks } from './same-blocks';

const doc = (): QuoinBlock[] => [
  { id: 'a', type: 'MARKDOWN', data: { markdown: 'one' } },
  { id: 'b', type: 'CODE', data: { code: 'x', language: 'ts' }, indent: 1 },
];

describe('sameBlocks', () => {
  it('treats a structurally equal copy as the same', () => {
    expect(sameBlocks(doc(), doc())).toBe(true);
    const same = doc();
    expect(sameBlocks(same, same)).toBe(true);
  });

  it('tells apart a changed id, type, indent, data value, data key or order', () => {
    const changedId = doc();
    changedId[0].id = 'z';
    const changedType = doc();
    changedType[0].type = 'CODE';
    const changedIndent = doc();
    changedIndent[1].indent = 2;
    const changedValue = doc();
    changedValue[0].data = { markdown: 'two' };
    const extraKey = doc();
    extraKey[0].data = { markdown: 'one', extra: 1 };
    const swappedKey = doc();
    swappedKey[0].data = { other: 'one' };
    const reordered = doc().reverse();
    for (const next of [changedId, changedType, changedIndent, changedValue, extraKey, swappedKey, reordered]) {
      expect(sameBlocks(doc(), next)).toBe(false);
    }
  });

  it('reads a missing indent as zero', () => {
    const [first] = doc();
    expect(sameBlocks([first], [{ ...first, indent: 0 }])).toBe(true);
  });

  it('tells apart documents of different length', () => {
    expect(sameBlocks(doc(), doc().slice(1))).toBe(false);
  });

  it('compares nested data by identity', () => {
    const rows = [['a']];
    const table = (value: unknown): QuoinBlock[] => [{ id: 't', type: 'TABLE', data: { rows: value } }];
    expect(sameBlocks(table(rows), table(rows))).toBe(true);
    expect(sameBlocks(table(rows), table([['a']]))).toBe(false);
  });
});
