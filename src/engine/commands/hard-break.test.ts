import { describe, expect, it } from 'vitest';
import { buildState, caretOf, markdownOf, run } from '../test-support/build-state';
import { insertHardBreak } from './hard-break';

describe('insertHardBreak', () => {
  it('inserts a line break at the caret and moves past it', () => {
    const state = buildState(['abcd'], { block: 0, offset: 2 });
    const next = run(state, insertHardBreak).state;
    expect(next.doc.blocks[0].regions.text).toEqual([{ kind: 'text', text: 'ab\ncd', marks: [] }]);
    expect(markdownOf(next)).toEqual(['ab\\\ncd']);
    expect(caretOf(next)).toEqual({ block: 0, offset: 3 });
  });

  it('replaces a selection, keeps the marks around it and is not an input transaction', () => {
    const state = buildState(['**abcd**'], { anchor: { block: 0, offset: 1 }, head: { block: 0, offset: 3 } });
    const { state: next, tr } = run(state, insertHardBreak);
    expect(markdownOf(next)).toEqual(['**a\\\nd**']);
    expect(tr?.origin).toBe('command');
  });
});
