import { describe, expect, it } from 'vitest';
import type { EngineBlock } from '../model/types';
import { groupBlocks, type Group } from './block-groups';

let n = 0;
const block = (type: string, kind: string | undefined, indent = 0): EngineBlock => ({
  id: `g${++n}`,
  type,
  indent,
  attrs: kind ? { kind } : {},
  regions: {},
});
const line = (kind: string, indent = 0) => block('MARKDOWN', kind, indent);
const shape = (groups: readonly Group[]): unknown[] =>
  groups.map((group) =>
    group.kind === 'single'
      ? ['single', group.entry.block.type, shape(group.entry.children)]
      : [group.kind, group.items.map((item) => [item.excess, shape(item.children)])],
  );

describe('groupBlocks', () => {
  it('runs consecutive items of one kind together and splits on a change of kind', () => {
    const groups = groupBlocks([line('bullet'), line('bullet'), line('ordered'), line('paragraph'), line('bullet')]);
    expect(groups.map((group) => group.kind)).toEqual(['list', 'list', 'single', 'list']);
    expect(groups.map((group) => (group.kind === 'list' ? group.list : ''))).toEqual(['bullet', 'ordered', '', 'bullet']);
  });

  it('puts blocks with a deeper indent under the item or toggle before them', () => {
    const groups = groupBlocks([line('bullet'), line('paragraph', 1), block('TOGGLE', undefined), block('DIVIDER', undefined, 1), line('bullet')]);
    expect(shape(groups)).toEqual([
      ['list', [[0, [['single', 'MARKDOWN', []]]]]],
      ['single', 'TOGGLE', [['single', 'DIVIDER', []]]],
      ['list', [[0, []]]],
    ]);
  });

  it('continues a list after the children of one of its items', () => {
    const groups = groupBlocks([line('bullet'), line('bullet', 1), line('bullet', 1), line('bullet')]);
    expect(shape(groups)).toEqual([
      ['list', [[0, [['list', [[0, []], [0, []]]]]], [0, []]]],
    ]);
  });

  it('keeps the indent a block has beyond what its place expects', () => {
    const [paragraph] = groupBlocks([line('paragraph', 2)]);
    expect(paragraph.kind === 'single' && paragraph.entry.excess).toBe(2);
    const [alone] = groupBlocks([line('bullet', 2)]);
    expect(alone.kind === 'list' && alone.items[0].excess).toBe(2);
    const [list] = groupBlocks([line('bullet'), line('bullet', 3)]);
    const nested = list.kind === 'list' ? list.items[0].children[0] : undefined;
    expect(nested?.kind === 'list' && nested.items[0].excess).toBe(2);
  });

  it('shares a quote run only between quotes of one indent', () => {
    const groups = groupBlocks([line('quote'), line('quote'), line('quote', 1), line('quote')]);
    expect(groups.map((group) => (group.kind === 'quote' ? group.items.length : 0))).toEqual([2, 1, 1]);
  });

  it('stops nesting at a fixed depth so rendering stays shallow', () => {
    const groups = groupBlocks(Array.from({ length: 500 }, (_, i) => line('bullet', i)));
    let depth = 0;
    for (let level: readonly Group[] = groups; level.length > 0; depth++) {
      const first = level[0];
      level = first.kind === 'list' ? first.items[0].children : [];
    }
    expect(depth).toBeLessThan(40);
  });
});
