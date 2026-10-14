import { describe, expect, it } from 'vitest';
import { createOutsideChanges } from './outside-changes';

describe('outside changes', () => {
  it('notes a change made outside only while the editor has focus, once', () => {
    let focused = false;
    const outside = createOutsideChanges(() => focused);
    outside.committed();
    expect(outside.takeFocused()).toBe(false);
    focused = true;
    outside.committed();
    focused = false;
    outside.committed();
    expect(outside.takeFocused()).toBe(true);
    expect(outside.takeFocused()).toBe(false);
  });

  it('ignores changes made inside, even after one of them threw', () => {
    const outside = createOutsideChanges(() => true);
    outside.inside(() => outside.committed());
    expect(outside.takeFocused()).toBe(false);
    expect(() =>
      outside.inside(() => {
        throw new RangeError('stale');
      }),
    ).toThrow(RangeError);
    outside.committed();
    expect(outside.takeFocused()).toBe(true);
  });
});
