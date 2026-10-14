import { describe, expect, it } from 'vitest';
import { buildState } from '../../engine/test-support/build-state';
import { regionInline } from './region-inline';

describe('regionInline', () => {
  const state = buildState(['hello', { id: 'x', type: 'CALLOUT', data: { tone: 'info', body: 'note' } }]);

  it('returns the inline content of a region', () => {
    expect(regionInline(state, 'b0', 'text')).toBe(state.doc.blocks[0].regions.text);
    expect(regionInline(state, 'b1', 'body')).toBe(state.doc.blocks[1].regions.body);
  });

  it('returns undefined for a block or region that is not there, including names an object inherits', () => {
    expect(regionInline(state, 'gone', 'text')).toBeUndefined();
    expect(regionInline(state, 'b0', 'body')).toBeUndefined();
    expect(regionInline(state, 'b0', 'constructor')).toBeUndefined();
    expect(regionInline(state, 'b0', '__proto__')).toBeUndefined();
  });
});
