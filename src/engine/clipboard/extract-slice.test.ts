import { describe, expect, it } from 'vitest';
import { buildState } from '../test-support/build-state';
import { createBlockCodec } from '../blocks/codec';
import { sliceFromSelection } from './extract-slice';
import { sliceToClipboard } from './serialize-slice';

describe('slices', () => {
  it('copies part of one region as an open block', () => {
    const state = buildState(['## He**llo**'], { anchor: { block: 0, offset: 1 }, head: { block: 0, offset: 4 } });
    const slice = sliceFromSelection(state, createBlockCodec(state.schema))!;
    expect(slice.openStart && slice.openEnd).toBe(true);
    expect(slice.blocks.map((b) => b.data.markdown)).toEqual(['## e**ll**']);
    expect(sliceToClipboard(slice).text).toBe('ell');
  });

  it('copies across blocks with partial ends', () => {
    const state = buildState(['abc', '- mid', 'xyz'], { anchor: { block: 2, offset: 1 }, head: { block: 0, offset: 2 } });
    const slice = sliceFromSelection(state, createBlockCodec(state.schema))!;
    expect(slice.blocks.map((b) => b.data.markdown)).toEqual(['c', '- mid', 'x']);
    const { json, text } = sliceToClipboard(slice);
    expect(JSON.parse(json)).toMatchObject({ quoin: 1, slice: { openStart: true, openEnd: true } });
    expect(text).toBe('c\n\n- mid\n\nx');
  });

  it('returns null for a collapsed selection', () => {
    const state = buildState(['a'], { block: 0, offset: 0 });
    expect(sliceFromSelection(state, createBlockCodec(state.schema))).toBeNull();
  });
});
