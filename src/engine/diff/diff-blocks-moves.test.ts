import { describe, expect, it } from 'vitest';
import { text } from '../model/inline';
import type { QuoinBlock } from '../model/quoin-block';
import { diffBlocks } from './diff-blocks';

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
});
