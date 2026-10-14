import { describe, expect, it } from 'vitest';
import { buildState } from '../../engine/test-support/build-state';
import { isCrossSelection, selectionDecorations } from './selection-decorations';

describe('selection decorations', () => {
  it('covers each region of a cross-block selection', () => {
    const state = buildState(['hello', 'mid', 'world'], { anchor: { block: 0, offset: 2 }, head: { block: 2, offset: 3 } });
    expect(isCrossSelection(state.selection)).toBe(true);
    expect(selectionDecorations(state, 'decorations').map((d) => d.kind === 'inline' && [d.block, d.from, d.to])).toEqual([
      ['b0', 2, 5],
      ['b1', 0, 3],
      ['b2', 0, 3],
    ]);
  });

  it('adds nothing for a selection inside one host or in highlight mode', () => {
    const inside = buildState(['hello'], { anchor: { block: 0, offset: 1 }, head: { block: 0, offset: 3 } });
    expect(isCrossSelection(inside.selection)).toBe(false);
    expect(selectionDecorations(inside, 'decorations')).toEqual([]);
    const cross = buildState(['a', 'b'], { anchor: { block: 0, offset: 0 }, head: { block: 1, offset: 1 } });
    expect(selectionDecorations(cross, 'highlight')).toEqual([]);
  });
});
