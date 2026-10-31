import { describe, expect, it } from 'vitest';
import { text } from '../model/inline';
import type { QuoinBlock } from '../model/quoin-block';
import { diffBlocks } from './diff-blocks';
import { MAX_EDITS } from './myers';

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });

describe('diffBlocks moves with edits', () => {
  it('reports each moved block once where it was and once where it went, the edited one with its words', () => {
    const before = [md('a', 'alpha one'), md('b', 'beta'), md('c', 'gamma'), md('d', 'delta')];
    const after = [md('d', 'delta'), md('c', 'gamma'), md('b', 'beta'), md('a', 'alpha two')];
    const diff = diffBlocks(before, after);
    const moved = diff.filter((d) => 'moved' in d && d.moved);
    for (const id of ['a', 'b', 'c']) {
      expect(moved.filter((d) => d.op === 'delete' && d.block.id === id)).toHaveLength(1);
      expect(moved.filter((d) => d.op === 'insert' && d.block.id === id)).toHaveLength(1);
    }
    expect(diff.filter((d) => d.op === 'change')).toEqual([]);
    const inserted = diff.filter((d) => d.op === 'insert');
    expect(inserted.filter((d) => d.change).map((d) => d.block.id)).toEqual(['a']);
    expect(inserted.find((d) => d.block.id === 'a')?.change?.regions.text).toEqual([
      { op: 'equal', inline: [text('alpha ')] },
      { op: 'delete', inline: [text('one')] },
      { op: 'insert', inline: [text('two')] },
    ]);
  });

  it('gives a move with a changed kind only its attribute change', () => {
    const diff = diffBlocks([md('a', 'Title'), md('b', 'x')], [md('b', 'x'), md('a', '## Title')]);
    expect(diff.at(-1)).toMatchObject({ op: 'insert', moved: true, change: { attrsChanged: true } });
  });

  it('reports no move when more blocks were added than the search follows', () => {
    const kept = Array.from({ length: 1_000 }, (_, at) => md(`k${at}`, `kept ${at}`));
    const added = Array.from({ length: MAX_EDITS + 1 }, (_, at) => md(`n${at}`, `new ${at}`));
    const diff = diffBlocks(kept, [...kept, ...added]);
    expect(diff.filter((d) => 'moved' in d)).toEqual([]);
    const inserted = new Set(diff.filter((d) => d.op === 'insert').map((d) => d.block.id));
    for (const block of added) expect(inserted.has(block.id)).toBe(true);
  });
});
