import { describe, expect, it } from 'vitest';
import { blocksOf, buildState, run } from '../test-support/build-state';
import { setAttrs, setBlockColor, setTextAlign } from './block-style';

const both = () => buildState(['a', 'b'], { anchor: { block: 0, offset: 0 }, head: { block: 1, offset: 1 } });

describe('block style commands', () => {
  it('aligns every selected text block and clears the alignment with null', () => {
    const aligned = run(both(), setTextAlign('center')).state;
    expect(blocksOf(aligned).map((block) => block.data.align)).toEqual(['center', 'center']);
    const cleared = run(aligned, setTextAlign(null)).state;
    expect(blocksOf(cleared).map((block) => block.data)).toEqual([{ markdown: 'a' }, { markdown: 'b' }]);
  });

  it('colours text and background, leaves keys that are not given, and clears with null', () => {
    const coloured = run(both(), setBlockColor({ color: 'red', background: 'yellow' })).state;
    expect(blocksOf(coloured)[0].data).toEqual({ markdown: 'a', color: 'red', background: 'yellow' });
    const partial = run(coloured, setBlockColor({ color: null })).state;
    expect(blocksOf(partial)[0].data).toEqual({ markdown: 'a', background: 'yellow' });
  });

  it('refuses colours outside the palette and empty requests', () => {
    expect(run(both(), setBlockColor({ color: 'chartreuse' })).ok).toBe(false);
    expect(run(both(), setBlockColor({ background: 'nope' })).ok).toBe(false);
    expect(run(both(), setBlockColor({})).ok).toBe(false);
  });

  it('only styles MARKDOWN blocks', () => {
    const state = buildState([{ id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'x' } }], { block: 0, offset: 0 });
    expect(run(state, setTextAlign('right')).ok).toBe(false);
    expect(run(state, setBlockColor({ color: 'red' })).ok).toBe(false);
  });

  it('patches the attributes of every selected block', () => {
    const state = buildState(['a', { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'x' } }], { blocks: [1, 1] });
    expect(blocksOf(run(state, setAttrs({ tone: 'warn' })).state)[1].data).toEqual({ tone: 'warn', body: 'x' });
    expect(blocksOf(run(both(), setAttrs({ level: 2, kind: 'heading' })).state).map((block) => block.data.markdown)).toEqual(['## a', '## b']);
    expect(run(both(), setAttrs({})).ok).toBe(false);
    expect(run(buildState([], null), setAttrs({ a: 1 })).ok).toBe(false);
  });
});
