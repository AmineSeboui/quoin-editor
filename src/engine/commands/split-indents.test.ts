import { describe, expect, it } from 'vitest';
import { buildState, caretOf, markdownOf, newIds, run } from '../test-support/build-state';
import { splitBlock } from './split-block';

const item = (indent: number, text = '') => ({ id: 'x', type: 'MARKDOWN', data: { markdown: `- ${text}` }, indent });

describe('Enter on an empty nested item', () => {
  it('outdents the item together with its children', () => {
    const state = buildState([item(0, 'a'), item(1), item(2, 'c')], { block: 1, offset: 0 });
    const next = run(state, splitBlock({ newId: newIds() })).state;
    expect(markdownOf(next)).toEqual(['- a', '- ', '  - c']);
    expect(caretOf(next)).toEqual({ block: 1, offset: 0 });
  });
});
